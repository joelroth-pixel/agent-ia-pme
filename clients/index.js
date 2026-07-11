const fs = require('fs');
const path = require('path');

// Map numéro Twilio -> dossier client
const clientsMap = {
  'whatsapp:+14155238886': 'durand-plomberie'
};

function getClientConfig(twilioNumber) {
  const clientFolder = clientsMap[twilioNumber];
  if (!clientFolder) {
    console.error('[CLIENTS] Numéro inconnu : ' + twilioNumber);
    return null;
  }
  const configPath = path.join(__dirname, clientFolder, 'client.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getClientFolder(twilioNumber) {
  return clientsMap[twilioNumber] || null;
}

module.exports = { getClientConfig, getClientFolder };