// ─── Imports ────────────────────────────────────────────────────────────────
const express  = require('express');
const dotenv   = require('dotenv');
const cors     = require('cors');
const { Resend } = require('resend');
const admin    = require('firebase-admin');
const axios    = require('axios');
const moment   = require('moment');

dotenv.config();

// ─── App Setup ──────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

const resend = new Resend(process.env.RESEND_API_KEY);

// ----------  CORS  ----------------------------------------------------------
// Build a whitelist from env (comma-separated) + localhost for dev
const extraOrigins = (process.env.FRONTEND_PROD_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const whitelist = ['http://localhost:3000', ...extraOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (mobile apps, curl, Postman) OR whitelisted origins
      if (!origin || whitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Handle the occasional pre-flight request quickly
app.options('*', cors());

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json());

// ─── Firebase Admin ─────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Routes (keep the rest of your file as-is) ──────────────────────────────