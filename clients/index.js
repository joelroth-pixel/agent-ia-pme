const fs = require('fs');
const path = require('path');

const clientsMap = {
  'whatsapp:+14155238886': 'durand-plomberie'
};

function getClientConfig(twilioNumber) {
  const clientFolder = clientsMap[twilioNumber];
  if (!clientFolder) {
    console.error('[CLIENTS] Numero inconnu : ' + twilioNumber);
    return null;
  }
  const configPath = path.join(__dirname, clientFolder, 'client.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getClientFolder(twilioNumber) {
  return clientsMap[twilioNumber] || null;
}

function getAllConfigs() {
  const configs = {};
  for (const folder of Object.values(clientsMap)) {
    const configPath = path.join(__dirname, folder, 'client.json');
    configs[folder] = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return configs;
}

module.exports = { getClientConfig, getClientFolder, getAllConfigs };