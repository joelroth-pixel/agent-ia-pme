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

const Stats = mongoose.model('Stats', statsSchema);
const PushSub = mongoose.model('PushSub', pushSchema);
const Settings = mongoose.model('Settings', settingsSchema);

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

async function getStats() {
  const semaine = getSemaineActuelle();
  let stats = await Stats.findOne({ semaine });
  if (!stats) stats = await Stats.create({ semaine });
  return stats;
}

async function incrementStats(field, prospect) {
  const semaine = getSemaineActuelle();
  const update = { $inc: { [field]: 1 } };
  if (prospect) update.$push = { prospectsList: prospect };
  await Stats.findOneAndUpdate({ semaine }, update, { upsert: true });
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

module.exports = { connectDB, getStats, incrementStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings };
