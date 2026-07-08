const twilio = require('twilio');
const config = require('../config/client.json');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER; // ex: whatsapp:+14155238886

// Envoie un message WhatsApp à un numéro
async function sendMessage(to, body) {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await twilioClient.messages.create({ from: FROM, to: toFormatted, body });
}

// Envoie une alerte au patron quand un prospect a été collecté
async function notifyOwner(leadInfo, userPhone) {
  const ownerNumber = config.business.whatsapp_number;
  const { name, city, rawText } = leadInfo;

  const message =
    `🔔 Nouveau prospect via WhatsApp !\n\n` +
    `👤 Nom : ${name}\n` +
    `📍 Ville : ${city}\n` +
    `📱 Numéro : ${userPhone}\n\n` +
    `💬 Résumé de la conversation :\n"${(rawText || '').slice(0, 200)}..."\n\n` +
    `→ À rappeler dès que possible.`;

  await sendMessage(ownerNumber, message);
}

module.exports = { sendMessage, notifyOwner };
