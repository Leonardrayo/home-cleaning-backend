const express = require("express"); const dotenv = require("dotenv"); const { Resend } = require("resend"); const { initializeApp, applicationDefault } = require("firebase-admin/app"); const { getFirestore } = require("firebase-admin/firestore"); const cors = require("cors");

dotenv.config(); const app = express(); const PORT = process.env.PORT || 3000;

app.use(cors()); app.use(express.json());

// Initialize Firebase Admin initializeApp({ credential: applicationDefault(), });

const db = getFirestore();

// Initialize Resend const resend = new Resend(process.env.RESEND_API_KEY);

// Send Email Endpoint app.post("/send-email", async (req, res) => { const { to, subject, text } = req.body;

try { const data = await resend.emails.send({ from: process.env.VERIFIED_SENDER, to, subject, text, });

console.log("Email sent:", data);
res.status(200).send("Email sent successfully");

} catch (error) { console.error("Error sending email:", error); res.status(500).send("Failed to send email"); } });

// Get all cleaners app.get("/cleaners", async (req, res) => { try { const snapshot = await db.collection("cleaners").get(); const cleaners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); res.status(200).json(cleaners); } catch (error) { console.error("Error fetching cleaners:", error); res.status(500).send("Failed to fetch cleaners"); } });

// Update cleaner status app.post("/cleaners/:id/status", async (req, res) => { const { id } = req.params; const { status } = req.body;

try { await db.collection("cleaners").doc(id).update({ status }); res.status(200).send("Cleaner status updated"); } catch (error) { console.error("Error updating status:", error); res.status(500).send("Failed to update status"); } });

// Select cleaner & send email app.post("/select-cleaner", async (req, res) => { const { cleanerId, clientEmail } = req.body;

try { const cleanerDoc = await db.collection("cleaners").doc(cleanerId).get(); if (!cleanerDoc.exists) return res.status(404).send("Cleaner not found");