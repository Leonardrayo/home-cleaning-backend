const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const axios = require("axios"); // ⬅ Added for M-Pesa
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const resend = new Resend(process.env.RESEND_API_KEY);

// Enable CORS for frontend
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend-url.com"], // replace with actual production URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔄 Health check route
app.get("/health", (req, res) => {
  res.status(200).send("✅ Server is up and running");
});

// 📩 Email sending route
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const data = await resend.emails.send({
      from: process.env.VERIFIED_SENDER,
      to,
      subject,
      text,
    });

    console.log("✅ Email sent:", data);
    res.status(200).json({ message: "Email sent successfully", data });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: "Failed to send email", details: error });
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
    console.error("❌ Error fetching cleaners:", error);
    res.status(500).json({ error: "Failed to fetch cleaners" });
  }
});

// 💳 M-Pesa Token Route
app.get("/mpesa/token", async (req, res) => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: Basic `${auth}`,
        },
      }
    );

    console.log("🎯 M-Pesa Token Response:", response.data);
    res.status(200).json({ access_token: response.data.access_token });
  } catch (error) {
    console.error("❌ Error getting M-Pesa token:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate M-Pesa access token" });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});