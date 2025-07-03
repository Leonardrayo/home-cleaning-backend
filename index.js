const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const axios = require("axios");
const moment = require("moment");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const resend = new Resend(process.env.RESEND_API_KEY);

// Allow local + production frontend
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://datsaficleaningsystem.web.app",
      "https://datsaficleaningsystem.firebaseapp.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Initialize Firebase Admin
let db;
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  console.log("✅ Firestore initialised");
} catch (err) {
  console.error("🔥 Failed to initialise Firestore:", err.message);
  process.exit(1);
}

// Health check
app.get("/health", (_, res) => res.send("✅ Server alive"));

// Email sending
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    const data = await resend.emails.send({
      from: process.env.VERIFIED_SENDER,
      to,
      subject,
      text,
    });
    res.json({ message: "Email sent successfully", data });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
});

// Get all cleaners
app.get("/cleaners", async (req, res) => {
  console.log("➡  /cleaners hit");
  try {
    const snap = await db.collection("cleaners").get();
    const cleaners = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || data.Name || "",
        email: data.email || data.Email || "",
        status: (data.status || data.Status || "unknown").toLowerCase(),
      };
    });
    console.log(`✅ ${cleaners.length} cleaners returned`);
    res.json(cleaners);
  } catch (err) {
    console.error("🔥 Firestore error:", err.message);
    res.status(500).json({ error: "Firestore failed", details: err.message });
  }
});

// M-PESA STK PUSH
app.post("/mpesa/stk-push", async (req, res) => {
  const { phoneNumber, amount } = req.body;
  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Phone number and amount are required" });
  }

  const formattedPhone = phoneNumber.replace(/^0/, "254");

  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const { data: tokenData } = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const { data: stkData } = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "HomeCleaning",
        TransactionDesc: "Home Cleaning Payment",
      },
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    res.json({
      message: "STK Push initiated",
      data: stkData,
    });
  } catch (err) {
    console.error("❌ STK Push Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to initiate STK Push", details: err.message });
  }
});

// M-PESA Callback
app.post("/mpesa/callback", async (req, res) => {
  console.log("📥 M-PESA Callback received");
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) return res.sendStatus(200);

    const meta = (stk.CallbackMetadata?.Item || []).reduce((acc, i) => {
      acc[i.Name] = i.Value;
      return acc;
    }, {});
    await db.collection("mpesaTransactions").add({
      ...stk,
      metadata: meta,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ M-PESA transaction saved:", meta);
  } catch (err) {
    console.error("❌ Callback handling failed:", err.message);
  }
  res.sendStatus(200);
});

// Start server
console.log("🌍 NODE_ENV =", process.env.NODE_ENV);
console.log("🔊 PORT to bind =", PORT);
app.listen(PORT, () => {
  console.log(`🚀 Server now listening on port ${PORT}`);
});