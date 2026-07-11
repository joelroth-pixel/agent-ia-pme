const fs = require('fs');

const code = "const twilio = require('twilio');\n" +
"const twilioClient = twilio(\n" +
"  process.env.TWILIO_ACCOUNT_SID,\n" +
"  process.env.TWILIO_AUTH_TOKEN\n" +
");\n" +
"const FROM = process.env.TWILIO_WHATSAPP_NUMBER;\n\n" +
"async function sendMessage(to, body) {\n" +
"  const toFormatted = to.startsWith('whatsapp:') ? to : 'whatsapp:' + to;\n" +
"  await twilioClient.messages.create({ from: FROM, to: toFormatted, body });\n" +
"}\n\n" +
"async function notifyOwner(leadInfo, userPhone, config) {\n" +
"  const ownerNumber = config.business.whatsapp_number;\n" +
"  const { name, city, rawText } = leadInfo;\n" +
"  const message =\n" +
"    'Nouveau prospect via WhatsApp !\\n\\n' +\n" +
"    'Nom : ' + name + '\\n' +\n" +
"    'Ville : ' + city + '\\n' +\n" +
"    'Numero : ' + userPhone + '\\n\\n' +\n" +
"    'Resume de la conversation :\\n' + (rawText || '').slice(0, 200) + '...\\n\\n' +\n" +
"    'A rappeler des que possible.';\n" +
"  await sendMessage(ownerNumber, message);\n" +
"}\n\n" +
"module.exports = { sendMessage, notifyOwner };\n";

fs.writeFileSync('src/whatsapp.js', code);
console.log('OK');