const { sendMessage } = require('./whatsapp');
const config = require('../config/client.json');
const memory = require('./memory');

async function envoyerRapport() {
  const ownerNumber = config.business.whatsapp_number;
  const now = new Date();
  const semaine = now.toLocaleDateString('fr-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = global.statsHebdo || { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };

  const rapport =
    '📊 RAPPORT HEBDOMADAIRE\n' +
    '📅 ' + semaine + '\n\n' +
    '📨 Messages reçus : ' + stats.messages + '\n' +
    '👤 Prospects collectés : ' + stats.prospects + '\n' +
    '🚨 Urgences détectées : ' + stats.urgences + '\n\n' +
    (stats.prospectsList.length > 0
      ? '📋 Liste des prospects :\n' + stats.prospectsList.map(p => '- ' + p.name + ' (' + p.phone + ')').join('\n')
      : 'Aucun prospect cette semaine.') +
    '\n\n→ Bonne semaine !';

  await sendMessage('whatsapp:' + ownerNumber, rapport);

  // Réinitialise les stats
  global.statsHebdo = { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };
  console.log('[RAPPORT] Envoyé avec succès');
}

module.exports = { envoyerRapport };