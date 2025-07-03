// ─────────────────────────────────────────────
//  index.js  (Home-Cleaning Backend)
// ─────────────────────────────────────────────
const express = require("express");
const dotenv  = require("dotenv");
const cors    = require("cors");
const { Resend } = require("resend");
const admin   = require("firebase-admin");
const axios   = require("axios");
const moment  = require("moment");

// ▸ Load env vars ASAP
dotenv.config();

/* ── Startup probes ───────────────────── */
console.log("🌍  NODE_ENV =", process.env.NODE_ENV || "not-set");
console.log("🔊  PORT to bind =", process.env.PORT || "(default 5000)");

/* ── Express + globals ─────────────────── */
const app  = express();
/*  Use the injected PORT on Render; fall back to 5000 locally. */
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

/* ── 3rd-party helpers ─────────────────── */
const resend = new Resend(process.env.RESEND_API_KEY);

/* ── CORS (add your production domains) ─ */
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

/* ── Firebase Admin ────────────────────── */
const serviceAccountJson = process.env.GOOGLE_CREDENTIALS;
if (!serviceAccountJson) {
  console.error("❌  Missing GOOGLE_CREDENTIALS env var - aborting.");
  process.exit(1);
}
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ─────────────────────────────────────────
   ROUTES
   ───────────────────────────────────────── */
app.get("/health", (_, res) => res.status(200).send("✅ Server is up"));

/* (…keep the rest of your routes unchanged…) */

/* ── Start server ──────────────────────── */
app.listen(PORT, () => {
  console.log(`🚀  Server now listening on port ${PORT}`);
});