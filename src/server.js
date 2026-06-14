require('dotenv').config();
const express = require('express');
const { sendMessage, notifyOwner } = require('./whatsapp');
const { chat } = require('./agent');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── Webhook principal reçu depuis Twilio ─────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // Twilio envoie les données en form-urlencoded
  const userPhone = req.body.From;   // ex: "whatsapp:+41791234567"
  const userMessage = req.body.Body; // Le texte du message

  if (!userPhone || !userMessage) {
    return res.status(400).send('Missing From or Body');
  }

  // Identifiant unique par utilisateur (numéro de téléphone)
  const userId = userPhone.replace('whatsapp:', '');

  console.log(`[${new Date().toLocaleTimeString()}] Message de ${userId}: "${userMessage}"`);

  try {
    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage);

    // Répond au client
    await sendMessage(userPhone, reply);
    console.log(`[${new Date().toLocaleTimeString()}] Réponse envoyée à ${userId}`);

    // Si lead complet → alerte le patron
    if (isLeadReady && leadInfo) {
      await notifyOwner(leadInfo, userId);
      console.log(`[LEAD] Patron notifié pour ${leadInfo.name} (${leadInfo.city})`);
    }

  } catch (error) {
    console.error('Erreur agent IA :', error);

    // En cas d'erreur, envoie un message de secours au client
    await sendMessage(
      userPhone,
      'Désolé, une erreur est survenue. Veuillez rappeler directement au numéro habituel.'
    );
  }

  // Twilio attend une réponse 200
  res.status(200).send('OK');
});

// ─── Route de santé (pour vérifier que le serveur tourne) ──────────────────
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
