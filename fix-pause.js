const fs = require('fs');
let code = fs.readFileSync('src/database.js', 'utf8');

const pauseSchema = "\nconst pauseSchema = new mongoose.Schema({\n" +
"  clientId: String,\n" +
"  userId: String,\n" +
"  pausedUntil: Date\n" +
"});\n" +
"const Pause = mongoose.model('Pause', pauseSchema);\n";

code = code.replace(
  "const Stats = mongoose.model('Stats', statsSchema);",
  "const Stats = mongoose.model('Stats', statsSchema);" + pauseSchema
);

const pauseFunctions = "\nasync function pauseConversation(clientId, userId, hours) {\n" +
"  const pausedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);\n" +
"  await Pause.findOneAndUpdate({ clientId, userId }, { clientId, userId, pausedUntil }, { upsert: true });\n" +
"}\n\n" +
"async function isConversationPaused(clientId, userId) {\n" +
"  const pause = await Pause.findOne({ clientId, userId });\n" +
"  if (!pause) return false;\n" +
"  if (new Date() > pause.pausedUntil) {\n" +
"    await Pause.deleteOne({ clientId, userId });\n" +
"    return false;\n" +
"  }\n" +
"  return true;\n" +
"}\n";

code = code.replace(
  "module.exports = {",
  pauseFunctions + "module.exports = {"
);

code = code.replace(
  "module.exports = { connectDB,",
  "module.exports = { connectDB, pauseConversation, isConversationPaused,"
);

fs.writeFileSync('src/database.js', code);
console.log('OK');