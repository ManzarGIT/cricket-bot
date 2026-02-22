'use strict';

require('dotenv').config();
const express = require('express');
const webhookRouter = require('./webhook');

// ── Validate required environment variables at startup ──────────────────────
const REQUIRED_ENV = [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WEBHOOK_VERIFY_TOKEN',
  'CRICKET_API_KEY',
];

const missingVars = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((v) => console.error(`   • ${v}`));
  console.error('👉 Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

// ── Express App ──────────────────────────────────────────────────────────────
const app = express();

// Parse incoming JSON bodies (WhatsApp sends JSON)
app.use(express.json());

// Health check — useful for deployment platforms to verify app is running
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '🏏 WhatsApp Cricket Bot is running!' });
});

// All webhook routes live here
app.use('/webhook', webhookRouter);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp Cricket Bot started!`);
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🌐 Webhook URL: https://YOUR_DOMAIN/webhook\n`);
});
