const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  semaine: String,
  messages: { type: Number, default: 0 },
  prospects: { type: Number, default: 0 },
  urgences: { type: Number, default: 0 },
  prospectsList: { type: Array, default: [] }
});

const pushSchema = new mongoose.Schema({
  clientId: String,
  subscription: Object,
  createdAt: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
  clientId: String,
  vacancesMode: { type: Boolean, default: false }
});

const conversationSchema = new mongoose.Schema({
  clientId: String,
  userId: String,
  messages: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, default: 'normal' },
  name: { type: String, default: 'Inconnu' },
  lastMessage: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Stats = mongoose.model('Stats', statsSchema);
const PushSub = mongoose.model('PushSub', pushSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] MongoDB connecte');
  } catch (err) {
    console.error('[DB] Erreur connexion MongoDB:', err);
  }
}

function getSemaineActuelle() {
  const now = new Date();
  const debut = new Date(now);
  debut.setDate(now.getDate() - now.getDay());
  return debut.toISOString().slice(0, 10);
}

async function getStats(clientId) {
  const semaine = getSemaineActuelle();
  const query = clientId ? { semaine, clientId } : { semaine };
  let stats = await Stats.findOne(query);
  if (!stats) stats = await Stats.create({ semaine, clientId: clientId || 'default' });
  return stats;
}

async function incrementStats(field, prospect, clientId) {
  const semaine = getSemaineActuelle();
  const filter = { semaine, clientId: clientId || 'default' };
  const update = { $inc: { [field]: 1 } };
  if (prospect) update.$push = { prospectsList: prospect };
  await Stats.findOneAndUpdate(filter, update, { upsert: true });
}

async function savePushSubscription(clientId, subscription) {
  await PushSub.findOneAndUpdate(
    { clientId, 'subscription.endpoint': subscription.endpoint },
    { clientId, subscription },
    { upsert: true }
  );
}

async function getPushSubscriptions(clientId) {
  const subs = await PushSub.find({ clientId });
  return subs.map(s => s.subscription);
}

async function removePushSubscription(endpoint) {
  await PushSub.deleteOne({ 'subscription.endpoint': endpoint });
}

async function getSettings(clientId) {
  let settings = await Settings.findOne({ clientId });
  if (!settings) settings = await Settings.create({ clientId });
  return settings;
}

async function saveSettings(clientId, data) {
  await Settings.findOneAndUpdate({ clientId }, data, { upsert: true });
}

async function saveMessage(clientId, userId, role, content) {
  await Conversation.findOneAndUpdate(
    { clientId, userId },
    {
      $push: { messages: { role, content } },
      $set: { lastMessage: new Date() }
    },
    { upsert: true }
  );
}

async function updateConversationStatus(clientId, userId, status, name) {
  const update = { status };
  if (name) update.name = name;
  await Conversation.findOneAndUpdate({ clientId, userId }, { $set: update }, { upsert: true });
}

async function getConversations(clientId, limit) {
  return await Conversation.find({ clientId })
    .sort({ lastMessage: -1 })
    .limit(limit || 20)
    .select('userId name status lastMessage createdAt messages');
}

async function getConversation(clientId, userId) {
  return await Conversation.findOne({ clientId, userId });
}

module.exports = { connectDB, getStats, incrementStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation };
