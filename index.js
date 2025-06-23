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

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend-url.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Firebase Admin Init
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ✅ Health check
app.get("/health", (req, res) => {
  res.status(200).send("✅ Server is up and running");
});

// 📩 Email sending
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const data = await resend.emails.send({
      from: process.env.VERIFIED_SENDER,
      to,
      subject,
      text,
    });

    res.status(200).json({ message: "Email sent successfully", data });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
});

// 🧹 Get all cleaners
app.get("/cleaners", async (req, res) => {
  try {
    const snapshot = await db.collection("cleaners").get();
    const cleaners = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.Name || "",
        email: data.email || data.Email || "",
        status: (data.status || data.Status || "unknown").toLowerCase(),
      };
    });

    res.status(200).json(cleaners);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cleaners" });
  }
});

// 💳 M-PESA STK PUSH
app.post("/mpesa/stk-push", async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Phone number and amount are required" });
  }

  // Format phone to 2547xxxxxxxx
  const formattedPhone = phoneNumber.replace(/^0/, "254");

  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    // Get OAuth token
    const tokenRes = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const accessToken = tokenRes.data.access_token;

    // Generate password & timestamp
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    // Initiate STK push
    const stkRes = await axios.post(
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
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.status(200).json({ message: "STK Push initiated", data: stkRes.data });
  } catch (error) {
    console.error("❌ STK Push Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to initiate STK Push",
      details: error.response?.data || error.message,
    });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});