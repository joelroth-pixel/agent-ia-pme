require('dotenv').config();
const { envoyerRapport } = require('./rapport');
const { ajouterProspect, demarrerRelances } = require('./relance');
const { connectDB, incrementStats, getStats } = require('./database');
const { getClientConfig } = require('../clients/index');
const express = require('express');
const path = require('path');
const { sendMessage, notifyOwner } = require('./whatsapp');
const { chat } = require('./agent');
const { isFirstMessage, markFirstMessageSent } = require('./memory');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

global.statsHebdo = { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };
global.blacklist = new Set();
global.vacancesMode = false;
global.tokens = new Set();

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

// Routes dashboard
app.post('/dashboard/login', (req, res) => {
  const { password } = req.body;
  const config = Object.values(require('../clients/index').getAllConfigs())[0];
  if (password === (config && config.business.dashboard_password)) {
    const token = Math.random().toString(36).slice(2) + Date.now();
    global.tokens.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (global.tokens.has(token)) return next();
  res.status(401).json({ error: 'Non autorise' });
}

app.get('/dashboard/data', authMiddleware, async (req, res) => {
  try {
    const stats = await getStats();
    const config = Object.values(require('../clients/index').getAllConfigs())[0];
    res.json({
      businessName: config ? config.business.name : 'Dashboard',
      stats: {
        messages: stats ? stats.messages : 0,
        prospects: stats ? stats.prospects : 0,
        urgences: stats ? stats.urgences : 0
      },
      prospects: stats ? stats.prospectsList : [],
      vacancesMode: global.vacancesMode
    });
  } catch (err) {
    res.json({ businessName: 'Dashboard', stats: { messages: 0, prospects: 0, urgences: 0 }, prospects: [], vacancesMode: false });
  }
});

app.post('/dashboard/vacances', authMiddleware, (req, res) => {
  global.vacancesMode = req.body.active || false;
  console.log('[VACANCES] Mode vacances : ' + global.vacancesMode);
  res.json({ success: true, vacancesMode: global.vacancesMode });
});

app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From;
  const userMessage = req.body.Body;
  const twilioNumber = req.body.To;

  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');

  const config = getClientConfig(twilioNumber);
  if (!config) return res.status(404).send('Client not found');

  const userId = userPhone.replace('whatsapp:', '');

  const numerosInternes = config.business.numeros_internes || [];
  if (numerosInternes.includes(userId)) {
    console.log('[INTERNE] Message de ' + userId + ' ignore par l agent');
    return res.status(200).send('OK');
  }

  if (global.blacklist.has(userId)) {
    console.log('[BLACKLIST] Message de ' + userId + ' ignore - STOP demande');
    return res.status(200).send('OK');
  }

  if (userMessage.trim().toUpperCase() === 'STOP') {
    global.blacklist.add(userId);
    await sendMessage(userPhone, 'Vous avez ete desabonne. Vous ne recevrez plus de messages automatiques. Pour nous contacter, appelez directement le ' + config.business.phone + '.');
    return res.status(200).send('OK');
  }

  if (global.vacancesMode) {
    await sendMessage(userPhone, config.business.message_vacances || 'Nous sommes actuellement en vacances. Nous reviendrons bientot. Pour les urgences, appelez le ' + config.business.phone + '.');
    return res.status(200).send('OK');
  }

  global.statsHebdo.messages++;
  await incrementStats('messages');
  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ' pour ' + twilioNumber);

  try {
    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage, config);

    let finalReply = reply;
    if (isFirstMessage(userId)) {
      const messageLPD = (config.business.message_lpd || '').replace('{entreprise}', config.business.name) + '\n\n';
      finalReply = messageLPD + reply;
      markFirstMessageSent(userId);
    }

    await sendMessage(userPhone, finalReply);
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
