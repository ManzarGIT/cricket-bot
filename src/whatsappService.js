'use strict';

const axios = require('axios');

const WHATSAPP_API_VERSION = 'v19.0';

/**
 * sendWhatsAppMessage — Sends a text message to a WhatsApp user.
 *
 * @param {string} to   — Recipient's phone number (e.g. "919876543210")
 * @param {string} text — Message text (supports WhatsApp markdown: *bold*, _italic_)
 */
async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    console.log(`✅ Message sent to ${to} | Message ID: ${response.data?.messages?.[0]?.id}`);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Failed to send message to ${to}: ${errMsg}`);

    // Re-throw so the webhook handler can decide what to do
    throw new Error(`WhatsApp send failed: ${errMsg}`);
  }
}

module.exports = { sendWhatsAppMessage };
