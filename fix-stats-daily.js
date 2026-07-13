const fs = require('fs');
let code = fs.readFileSync('src/database.js', 'utf8');

// Ajoute le schema daily
const dailySchema = "\nconst dailySchema = new mongoose.Schema({\n" +
"  clientId: String,\n" +
"  date: String,\n" +
"  messages: { type: Number, default: 0 },\n" +
"  prospects: { type: Number, default: 0 },\n" +
"  urgences: { type: Number, default: 0 }\n" +
"});\n" +
"const Daily = mongoose.model('Daily', dailySchema);\n";

code = code.replace(
  "const Stats = mongoose.model('Stats', statsSchema);",
  "const Stats = mongoose.model('Stats', statsSchema);" + dailySchema
);

// Ajoute la fonction incrementDaily
const dailyFunction = "\nasync function incrementDaily(field, clientId) {\n" +
"  const date = new Date().toISOString().slice(0, 10);\n" +
"  await Daily.findOneAndUpdate(\n" +
"    { clientId, date },\n" +
"    { $inc: { [field]: 1 } },\n" +
"    { upsert: true }\n" +
"  );\n" +
"}\n\n" +
"async function getWeeklyDaily(clientId) {\n" +
"  const now = new Date();\n" +
"  const days = [];\n" +
"  for (let i = 6; i >= 0; i--) {\n" +
"    const d = new Date(now);\n" +
"    d.setDate(now.getDate() - i);\n" +
"    days.push(d.toISOString().slice(0, 10));\n" +
"  }\n" +
"  const results = await Daily.find({ clientId, date: { $in: days } });\n" +
"  return days.map(date => {\n" +
"    const found = results.find(r => r.date === date);\n" +
"    const label = new Date(date).toLocaleDateString('fr-CH', { weekday: 'short' });\n" +
"    return { date, label, messages: found ? found.messages : 0, prospects: found ? found.prospects : 0, urgences: found ? found.urgences : 0 };\n" +
"  });\n" +
"}\n";

code = code.replace(
  "module.exports = { connectDB,",
  dailyFunction + "module.exports = { connectDB, incrementDaily, getWeeklyDaily,"
);

fs.writeFileSync('src/database.js', code);
console.log('OK');