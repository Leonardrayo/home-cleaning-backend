// ... existing imports
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const axios = require("axios");
const moment = require("moment"); // For timestamp formatting

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const resend = new Resend(process.env.RESEND_API_KEY);

// CORS setup
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend-url.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Firebase Admin init
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Health check
app.get("/health", (req, res) => {
  res.status(200).send("✅ Server is up and running");
});

// === M-PESA STK PUSH ENDPOINT ===
app.post("/mpesa/stk-push", async (req, res) => {
  const { phoneNumber, amount } = req.body;

  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    // Step 1: Get access token
    const tokenResponse = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Initiate STK Push
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const stkResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
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

    console.log("✅ STK Push initiated:", stkResponse.data);
    res.status(200).json({ message: "STK Push initiated", data: stkResponse.data });
  } catch (error) {
    console.error("❌ STK Push error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate STK Push", details: error.response?.data });
  }
});

// ... other routes (email, cleaners, etc.)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});