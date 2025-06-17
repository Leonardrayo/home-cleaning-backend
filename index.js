const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { Resend } = require("resend");
const admin = require("firebase-admin");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

// Enable CORS
app.use(cors());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.use(express.json());

// 📩 Email sending endpoint
app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    const data = await resend.emails.send({
      from: process.env.VERIFIED_SENDER,
      to,
      subject,
      text,
    });

    console.log("Email sent:", data);
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email");
  }
});

// 👇 Get all cleaners (normalized response)
app.get("/cleaners", async (req, res) => {
  try {
    const snapshot = await db.collection("cleaners").get();
    const cleaners = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.Name || '',
        email: data.email || data.Email || '',
        status: (data.status || data.Status || '').toLowerCase(),
      };
    });

    res.status(200).json(cleaners);
  } catch (error) {
    console.error("Error fetching cleaners:", error);
    res.status(500).send("Failed to fetch cleaners");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});