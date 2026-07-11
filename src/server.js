require('dotenv').config();
const { envoyerRapport } = require('./rapport');
const { ajouterProspect, demarrerRelances } = require('./relance');
const { connectDB, incrementStats } = require('./database');
const { getClientConfig } = require('../clients/index');
const express = require('express');
const { sendMessage, notifyOwner } = require('./whatsapp');
const { chat } = require('./agent');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

global.statsHebdo = { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };

function planifierRapport() {
  const now = new Date();
  const prochainLundi = new Date(now);
  prochainLundi.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  prochainLundi.setHours(8, 0, 0, 0);
  const delai = prochainLundi - now;
  setTimeout(() => {
    envoyerRapport();
    setInterval(envoyerRapport, 7 * 24 * 60 * 60 * 1000);
  }, delai);
  console.log('[RAPPORT] Prochain rapport : ' + prochainLundi.toLocaleString('fr-CH'));
}

connectDB().then(() => {
  planifierRapport();
  demarrerRelances();
});

app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From;
  const userMessage = req.body.Body;
  const twilioNumber = req.body.To;

  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');

  const config = getClientConfig(twilioNumber);
  if (!config) return res.status(404).send('Client not found');

  const userId = userPhone.replace('whatsapp:', '');
  global.statsHebdo.messages++;
  await incrementStats('messages');
  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ' pour ' + twilioNumber);

  try {
    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage, config);
    await sendMessage(userPhone, reply);
    console.log('[' + new Date().toLocaleTimeString() + '] Reponse envoyee a ' + userId);

    if (isLeadReady && leadInfo) {
      global.statsHebdo.prospects++;
      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });
      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId });
      ajouterProspect(userId, leadInfo.name, leadInfo.rawText);
    }
  } catch (error) {
    console.error('Erreur agent IA :', error);
    await sendMessage(userPhone, 'Desole, une erreur est survenue. Veuillez rappeler directement au numero habituel.');
  }
  res.status(200).send('OK');
});

app.get('/relance-test', async (req, res) => {
  const { verifierRelances } = require('./relance');
  for (const userId in global.prospectsEnAttente) {
    global.prospectsEnAttente[userId].timestamp = Date.now() - 25 * 60 * 60 * 1000;
  }
  await verifierRelances();
  res.json({ status: 'relances verifiees', prospects: global.prospectsEnAttente });
});

app.get('/rapport-test', async (req, res) => {
  await envoyerRapport();
  res.json({ status: 'rapport envoye' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Agent IA PME demarre sur le port ' + PORT);
});
