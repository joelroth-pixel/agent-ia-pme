const fs = require('fs');
let code = fs.readFileSync('src/database.js', 'utf8');

const notifiedSchema = "\nconst notifiedSchema = new mongoose.Schema({\n" +
"  clientId: String,\n" +
"  userId: String,\n" +
"  type: String\n" +
"});\n" +
"const Notified = mongoose.model('Notified', notifiedSchema);\n";

code = code.replace(
  "const Stats = mongoose.model('Stats', statsSchema);",
  "const Stats = mongoose.model('Stats', statsSchema);" + notifiedSchema
);

const notifiedFunctions = "\nasync function isNotifiedDB(clientId, userId, type) {\n" +
"  const found = await Notified.findOne({ clientId, userId, type });\n" +
"  return !!found;\n" +
"}\n\n" +
"async function markNotifiedDB(clientId, userId, type) {\n" +
"  await Notified.findOneAndUpdate({ clientId, userId, type }, { clientId, userId, type }, { upsert: true });\n" +
"}\n";

code = code.replace(
  "module.exports = { connectDB,",
  notifiedFunctions + "module.exports = { connectDB, isNotifiedDB, markNotifiedDB,"
);

fs.writeFileSync('src/database.js', code);
console.log('OK');