require('dotenv').config();
const express = require('express');
const { sendMessage, notifyOwner } = require('./whatsapp');
const { chat } = require('./agent');
const { formatSlot } = require('./calendar');
const config = require('../config/client.json');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Webhook principal ────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From;
  const userMessage = req.body.Body;

  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');

  const userId = userPhone.replace('whatsapp:', '');
  console.log(`[${new Date().toLocaleTimeString()}] Message de ${userId}: "${userMessage}"`);

  try {
    const { reply, isLeadReady, slotBooked, leadInfo } = await chat(userId, userMessage);

    await sendMessage(userPhone, reply);
    console.log(`[${new Date().toLocaleTimeString()}] Réponse envoyée à ${userId}`);

    // Notification patron si RDV réservé
    if (slotBooked) {
      const slotText = formatSlot(slotBooked, 0).replace('1️⃣ ', '');
      const name = leadInfo?.name || 'Client';
      const message =
        `📅 Nouveau RDV enregistré !\n\n` +
        `👤 ${name}\n` +
        `📱 ${userId}\n` +
        `🗓 ${slotText}\n\n` +
        `RDV ajouté automatiquement dans votre agenda.`;
      await notifyOwner({ name, city: '', rawText: message }, userId);
      console.log(`[RDV] Confirmé pour ${name} - ${slotText}`);
    }

    // Notification patron si lead collecté (sans RDV)
    if (isLeadReady && leadInfo && !slotBooked) {
      await notifyOwner(leadInfo, userId);
      console.log(`[LEAD] Patron notifié pour ${leadInfo.name}`);
    }

  } catch (error) {
    console.error('Erreur agent IA :', error);
    await sendMessage(
      userPhone,
      'Désolé, une erreur est survenue. Veuillez rappeler directement au numéro habituel.'
    );
  }

  res.status(200).send('OK');
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Agent IA PME démarré sur le port ${PORT}`);
  console.log(`   Webhook URL : http://localhost:${PORT}/webhook`);
  console.log(`   Health check : http://localhost:${PORT}/health\n`);
});
