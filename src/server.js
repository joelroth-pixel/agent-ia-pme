require('dotenv').config();
const { envoyerRapport } = require('./rapport');
const { ajouterProspect, demarrerRelances } = require('./relance');
const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation } = require('./database');
const { getClientConfig, getAllConfigs } = require('../clients/index');
const express = require('express');
const path = require('path');
const webpush = require('web-push');
const { sendMessage } = require('./whatsapp');
const { chat } = require('./agent');
const { isFirstMessage, markFirstMessageSent } = require('./memory');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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

async function envoyerPushNotification(clientId, title, body) {
  const subscriptions = await getPushSubscriptions(clientId);
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
    } catch (err) {
      if (err.statusCode === 410) await removePushSubscription(subscription.endpoint);
    }
  }
}

connectDB().then(async () => {
  const configs = getAllConfigs();
  const clientId = Object.keys(configs)[0];
  const settings = await getSettings(clientId);
  global.vacancesMode = settings.vacancesMode || false;
  console.log('[SETTINGS] Mode vacances charge : ' + global.vacancesMode);
  planifierRapport();
  demarrerRelances();
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (global.tokens.has(token)) return next();
  res.status(401).json({ error: 'Non autorise' });
}

app.post('/dashboard/login', (req, res) => {
  const { password } = req.body;
  const configs = getAllConfigs();
  const config = Object.values(configs)[0];
  if (password === (config && config.business.dashboard_password)) {
    const token = Math.random().toString(36).slice(2) + Date.now();
    global.tokens.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

app.get('/dashboard/data', authMiddleware, async (req, res) => {
  try {
    const stats = await getStats();
    const configs = getAllConfigs();
    const config = Object.values(configs)[0];
    const clientId = Object.keys(configs)[0];
    const conversations = await getConversations(clientId, 10);
    res.json({
      businessName: config ? config.business.name : 'Dashboard',
      stats: {
        messages: stats ? stats.messages : 0,
        prospects: stats ? stats.prospects : 0,
        urgences: stats ? stats.urgences : 0
      },
      prospects: stats ? stats.prospectsList : [],
      vacancesMode: global.vacancesMode,
      conversations: conversations.map(c => ({
        userId: c.userId,
        name: c.name,
        status: c.status,
        lastMessage: c.lastMessage,
        messageCount: c.messages ? c.messages.length : 0
      }))
    });
  } catch (err) {
    res.json({ businessName: 'Dashboard', stats: { messages: 0, prospects: 0, urgences: 0 }, prospects: [], vacancesMode: false, conversations: [] });
  }
});

app.get('/dashboard/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const configs = getAllConfigs();
    const clientId = Object.keys(configs)[0];
    const conv = await getConversation(clientId, req.params.userId);
    res.json(conv || { messages: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/dashboard/vacances', authMiddleware, async (req, res) => {
  global.vacancesMode = req.body.active || false;
  const configs = getAllConfigs();
  const clientId = Object.keys(configs)[0];
  await saveSettings(clientId, { vacancesMode: global.vacancesMode });
  console.log('[VACANCES] Mode vacances : ' + global.vacancesMode);
  res.json({ success: true, vacancesMode: global.vacancesMode });
});

app.post('/dashboard/push-subscribe', authMiddleware, async (req, res) => {
  try {
    const subscription = req.body;
    const configs = getAllConfigs();
    const clientId = Object.keys(configs)[0];
    await savePushSubscription(clientId, subscription);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/dashboard/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

app.post('/webhook', async (req, res) => {
  const userPhone = req.body.From;
  const userMessage = req.body.Body;
  const twilioNumber = req.body.To;

  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');

  const config = getClientConfig(twilioNumber);
  if (!config) return res.status(404).send('Client not found');

  const userId = userPhone.replace('whatsapp:', '');
  const configs = getAllConfigs();
  const clientId = Object.keys(configs)[0];

  const numerosInternes = config.business.numeros_internes || [];
  if (numerosInternes.includes(userId)) {
    console.log('[INTERNE] Message de ' + userId + ' ignore');
    return res.status(200).send('OK');
  }

  if (global.blacklist.has(userId)) {
    console.log('[BLACKLIST] Message de ' + userId + ' ignore');
    return res.status(200).send('OK');
  }

  if (userMessage.trim().toUpperCase() === 'STOP') {
    global.blacklist.add(userId);
    await sendMessage(userPhone, 'Vous avez ete desabonne. Pour nous contacter, appelez le ' + config.business.phone + '.');
    return res.status(200).send('OK');
  }

  if (global.vacancesMode) {
    await sendMessage(userPhone, config.business.message_vacances || 'Nous sommes actuellement en vacances. Pour les urgences, appelez le ' + config.business.phone + '.');
    return res.status(200).send('OK');
  }

  global.statsHebdo.messages++;
  await incrementStats('messages');
  await saveMessage(clientId, userId, 'user', userMessage);
  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId);

  try {
    const { reply, isLeadReady, leadInfo, isUrgent } = await chat(userId, userMessage, config);

    let finalReply = reply;
    if (isFirstMessage(userId)) {
      const messageLPD = (config.business.message_lpd || '').replace('{entreprise}', config.business.name) + '\n\n';
      finalReply = messageLPD + reply;
      markFirstMessageSent(userId);
    }

    await sendMessage(userPhone, finalReply);
    await saveMessage(clientId, userId, 'assistant', finalReply);

    if (isUrgent) {
      await updateConversationStatus(clientId, userId, 'urgence');
      await envoyerPushNotification(clientId, 'Urgence client !', 'Numero : ' + userId + ' - ' + userMessage.slice(0, 50));
      if (global.statsHebdo) global.statsHebdo.urgences++;
      await incrementStats('urgences');
    }

    if (isLeadReady && leadInfo) {
      await updateConversationStatus(clientId, userId, 'prospect', leadInfo.name);
      global.statsHebdo.prospects++;
      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });
      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId });
      ajouterProspect(userId, leadInfo.name, leadInfo.rawText);
      await envoyerPushNotification(clientId, 'Nouveau prospect !', (leadInfo.name || 'Client') + ' - ' + userId);
    }
  } catch (error) {
    console.error('Erreur agent IA :', error);
    await sendMessage(userPhone, 'Desole, une erreur est survenue. Veuillez rappeler directement.');
  }
  res.status(200).send('OK');
});


app.post('/dashboard/reply', authMiddleware, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const configs = getAllConfigs();
    const clientId = Object.keys(configs)[0];
    await sendMessage('whatsapp:' + userId, message);
    await saveMessage(clientId, userId, 'assistant', message);
    console.log('[REPLY] Message envoye a ' + userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/dashboard/reply', authMiddleware, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const configs = getAllConfigs();
    const clientId = Object.keys(configs)[0];
    await sendMessage('whatsapp:' + userId, message);
    await saveMessage(clientId, userId, 'assistant', message);
    console.log('[REPLY] Message envoye a ' + userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/relance-test', async (req, res) => {
  const { verifierRelances } = require('./relance');
  for (const userId in global.prospectsEnAttente) {
    global.prospectsEnAttente[userId].timestamp = Date.now() - 25 * 60 * 60 * 1000;
  }
  await verifierRelances();
  res.json({ status: 'relances verifiees' });
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
