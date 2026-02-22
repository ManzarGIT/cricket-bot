'use strict';

const express = require('express');
const router = express.Router();
const { parseUserMessage } = require('./messageParser');
const { sendWhatsAppMessage } = require('./whatsappService');
const { getLiveScore } = require('./cricketService');

// ── GET /webhook — Meta calls this to verify your webhook ───────────────────
// When you register your webhook on the Meta Developer Portal,
// Meta sends a GET request to confirm you own this URL.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    // ✅ Token matches — confirm to Meta that this is our server
    console.log('✅ Webhook verified by Meta!');
    return res.status(200).send(challenge);
  }

  // ❌ Token doesn't match — reject
  console.warn('⚠️  Webhook verification failed — token mismatch');
  return res.status(403).send('Forbidden');
});

// ── POST /webhook — WhatsApp sends every new message here ───────────────────
router.post('/', async (req, res) => {
  // Always respond 200 immediately — if we don't, WhatsApp will retry
  res.status(200).send('OK');

  try {
    const body = req.body;

    // WhatsApp wraps messages in this structure — validate it
    if (
      body?.object !== 'whatsapp_business_account' ||
      !body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    ) {
      return; // Not a user message (could be status update, etc.) — ignore
    }

    const messageData = body.entry[0].changes[0].value.messages[0];
    const from = messageData.from; // Sender's WhatsApp number
    const messageType = messageData.type;

    // We only handle text messages
    if (messageType !== 'text') {
      await sendWhatsAppMessage(
        from,
        '🙏 Sorry, I can only understand text messages.\n\nTry sending:\n• *SCORE* — for all live matches\n• *IND VS AUS* — for a specific match'
      );
      return;
    }

    const userText = messageData.text.body.trim();
    console.log(`📩 Message from ${from}: "${userText}"`);

    // Send a "please wait" message immediately so user knows we're working
    await sendWhatsAppMessage(from, '🏏 Fetching live scores, please wait...');

    // Figure out what the user wants
    const intent = parseUserMessage(userText);
    console.log(`🧠 Detected intent:`, intent);

    // Fetch the score based on intent
    const replyMessage = await getLiveScore(intent);

    // Send the actual score reply
    await sendWhatsAppMessage(from, replyMessage);
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    // We already sent 200, so we just log — we can't reply to Meta anymore
    // But we can try to send an error message to the user if we have their number
    try {
      const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (from) {
        await sendWhatsAppMessage(
          from,
          '😔 Sorry, something went wrong while fetching scores. Please try again in a moment.'
        );
      }
    } catch (_) {
      // Nothing we can do at this point
    }
  }
});

module.exports = router;
