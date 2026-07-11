const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const FROM = process.env.TWILIO_WHATSAPP_NUMBER;

async function sendMessage(to, body) {
  const toFormatted = to.startsWith('whatsapp:') ? to : 'whatsapp:' + to;
  await twilioClient.messages.create({ from: FROM, to: toFormatted, body });
}

async function notifyOwner(leadInfo, userPhone, config) {
  const ownerNumber = config.business.whatsapp_number;
  const { name, city, rawText } = leadInfo;
  const message =
    'Nouveau prospect via WhatsApp !\n\n' +
    'Nom : ' + name + '\n' +
    'Ville : ' + city + '\n' +
    'Numero : ' + userPhone + '\n\n' +
    'Resume de la conversation :\n' + (rawText || '').slice(0, 200) + '...\n\n' +
    'A rappeler des que possible.';
  await sendMessage(ownerNumber, message);
}

module.exports = { sendMessage, notifyOwner };
