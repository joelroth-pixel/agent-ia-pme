const fs = require('fs');

const code = "const mongoose = require('mongoose');\n\n" +
"const statsSchema = new mongoose.Schema({\n" +
"  semaine: String,\n" +
"  messages: { type: Number, default: 0 },\n" +
"  prospects: { type: Number, default: 0 },\n" +
"  urgences: { type: Number, default: 0 },\n" +
"  prospectsList: { type: Array, default: [] }\n" +
"});\n\n" +
"const pushSchema = new mongoose.Schema({\n" +
"  clientId: String,\n" +
"  subscription: Object,\n" +
"  createdAt: { type: Date, default: Date.now }\n" +
"});\n\n" +
"const settingsSchema = new mongoose.Schema({\n" +
"  clientId: String,\n" +
"  vacancesMode: { type: Boolean, default: false }\n" +
"});\n\n" +
"const Stats = mongoose.model('Stats', statsSchema);\n" +
"const PushSub = mongoose.model('PushSub', pushSchema);\n" +
"const Settings = mongoose.model('Settings', settingsSchema);\n\n" +
"async function connectDB() {\n" +
"  try {\n" +
"    await mongoose.connect(process.env.MONGODB_URI);\n" +
"    console.log('[DB] MongoDB connecte');\n" +
"  } catch (err) {\n" +
"    console.error('[DB] Erreur connexion MongoDB:', err);\n" +
"  }\n" +
"}\n\n" +
"function getSemaineActuelle() {\n" +
"  const now = new Date();\n" +
"  const debut = new Date(now);\n" +
"  debut.setDate(now.getDate() - now.getDay());\n" +
"  return debut.toISOString().slice(0, 10);\n" +
"}\n\n" +
"async function getStats() {\n" +
"  const semaine = getSemaineActuelle();\n" +
"  let stats = await Stats.findOne({ semaine });\n" +
"  if (!stats) stats = await Stats.create({ semaine });\n" +
"  return stats;\n" +
"}\n\n" +
"async function incrementStats(field, prospect) {\n" +
"  const semaine = getSemaineActuelle();\n" +
"  const update = { $inc: { [field]: 1 } };\n" +
"  if (prospect) update.$push = { prospectsList: prospect };\n" +
"  await Stats.findOneAndUpdate({ semaine }, update, { upsert: true });\n" +
"}\n\n" +
"async function savePushSubscription(clientId, subscription) {\n" +
"  await PushSub.findOneAndUpdate(\n" +
"    { clientId, 'subscription.endpoint': subscription.endpoint },\n" +
"    { clientId, subscription },\n" +
"    { upsert: true }\n" +
"  );\n" +
"}\n\n" +
"async function getPushSubscriptions(clientId) {\n" +
"  const subs = await PushSub.find({ clientId });\n" +
"  return subs.map(s => s.subscription);\n" +
"}\n\n" +
"async function removePushSubscription(endpoint) {\n" +
"  await PushSub.deleteOne({ 'subscription.endpoint': endpoint });\n" +
"}\n\n" +
"async function getSettings(clientId) {\n" +
"  let settings = await Settings.findOne({ clientId });\n" +
"  if (!settings) settings = await Settings.create({ clientId });\n" +
"  return settings;\n" +
"}\n\n" +
"async function saveSettings(clientId, data) {\n" +
"  await Settings.findOneAndUpdate({ clientId }, data, { upsert: true });\n" +
"}\n\n" +
"module.exports = { connectDB, getStats, incrementStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings };\n";

fs.writeFileSync('src/database.js', code);
console.log('OK');