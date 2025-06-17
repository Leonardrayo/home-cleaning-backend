const express = require("express");
const dotenv = require("dotenv");
const { Resend } = require("resend");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});