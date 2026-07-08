require('dotenv').config();
const { envoyerRapport } = require('./rapport');
const { ajouterProspect, demarrerRelances } = require('./relance');
const express = require('express');
const { sendMessage, notifyOwner } = require('./whatsapp');
const { chat } = require('./agent');
const config = require('../config/client.json');

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
planifierRapport();
demarrerRelances();
app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From;
  const userMessage = req.body.Body;
  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');
  const userId = userPhone.replace('whatsapp:', '');
  global.statsHebdo.messages++;
  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ': ' + userMessage);
  try {
    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage);
    await sendMessage(userPhone, reply);
    console.log('[' + new Date().toLocaleTimeString() + '] Reponse envoyee a ' + userId);
    if (isLeadReady && leadInfo) {
      global.statsHebdo.prospects++;
      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });
      ajouterProspect(userId, leadInfo.name, leadInfo.rawText);
    }
  } catch (error) {
    console.error('Erreur agent IA :', error);
    await sendMessage(userPhone, 'Desole, une erreur est survenue. Veuillez rappeler directement au numero habituel.');
  }
  res.status(200).send('OK');
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
