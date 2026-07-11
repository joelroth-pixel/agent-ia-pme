const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  semaine: String,
  messages: { type: Number, default: 0 },
  prospects: { type: Number, default: 0 },
  urgences: { type: Number, default: 0 },
  prospectsList: { type: Array, default: [] }
});

const Stats = mongoose.model('Stats', statsSchema);

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
  if (!stats) {
    stats = await Stats.create({ semaine });
  }
  return stats;
}

async function incrementStats(field, prospect) {
  const semaine = getSemaineActuelle();
  const update = { $inc: { [field]: 1 } };
  if (prospect) {
    update.$push = { prospectsList: prospect };
  }
  await Stats.findOneAndUpdate({ semaine }, update, { upsert: true });
}

module.exports = { connectDB, getStats, incrementStats };