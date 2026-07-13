const fs = require('fs');
let code = fs.readFileSync('src/database.js', 'utf8');

code = code.replace(
  "const statsSchema = new mongoose.Schema({\n  semaine: String,\n  messages: { type: Number, default: 0 },\n  prospects: { type: Number, default: 0 },\n  urgences: { type: Number, default: 0 },\n  prospectsList: { type: Array, default: [] }\n});",
  "const statsSchema = new mongoose.Schema({\n  semaine: String,\n  clientId: String,\n  messages: { type: Number, default: 0 },\n  prospects: { type: Number, default: 0 },\n  urgences: { type: Number, default: 0 },\n  prospectsList: { type: Array, default: [] }\n});"
);

fs.writeFileSync('src/database.js', code);
console.log('OK');