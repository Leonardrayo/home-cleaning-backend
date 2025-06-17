const express = require("express"); const dotenv = require("dotenv"); const { Resend } = require("resend"); const admin = require("firebase-admin"); const serviceAccount = require("./serviceAccountKey.json"); // Make sure to replace with the path to your Firebase key

dotenv.config();

const app = express(); const PORT = process.env.PORT || 3000;

// Initialize Firestore admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); const db = admin.firestore();

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

// Email endpoint app.post("/send-email", async (req, res) => { const { to, subject, text } = req.body; try { const data = await resend.emails.send({ from: process.env.VERIFIED_SENDER, to, subject, text, }); console.log("Email sent:", data); res.status(200).send("Email sent successfully"); } catch (error) { console.error("Error sending email:", error); res.status(500).send("Failed to send email"); } });

// Get all cleaners app.get("/cleaners", async (req, res) => { try { const snapshot = await db.collection("cleaners").get(); const cleaners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); res.status(200).json(cleaners); } catch (error) { console.error("Error fetching cleaners:", error); res.status(500).send("Failed to fetch cleaners"); } });

// Add a cleaner app.post("/cleaners", async (req, res) => { const { name, email, status, phone } = req.body; try { const newCleanerRef = await db.collection("cleaners").add({ name, email, status, phone }); res.status(201).send(Cleaner added with ID: ${newCleanerRef.id}); } catch (error) { console.error("Error adding cleaner:", error); res.status(500).send("Failed to add cleaner"); } });

// Update cleaner status app.patch("/cleaners/:id", async (req, res) => { const { id } = req.params; const { status } = req.body; try { const cleanerRef = db.collection("cleaners").doc(id); await cleanerRef.update({ status }); res.status(200).send("Cleaner status updated"); } catch (error) { console.error("Error updating cleaner:", error); res.status(500).send("Failed to update cleaner status"); } });

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); 
});