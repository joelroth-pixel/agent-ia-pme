const { sendMessage } = require('./whatsapp');
const config = require('../config/client.json');

// Stocke les prospects en attente de relance
// Format : { userId: { name, problem, timestamp, relanced } }
global.prospectsEnAttente = {};

function ajouterProspect(userId, name, problem) {
  global.prospectsEnAttente[userId] = {
    name: name || 'Client',
    problem: problem || 'votre demande',
    timestamp: Date.now(),
    relanced: false
  };
  console.log('[RELANCE] Prospect ajouté : ' + name + ' (' + userId + ')');
}

async function verifierRelances() {
  const maintenant = Date.now();
  const vingtQuatreHeures = 24 * 60 * 60 * 1000;

  for (const userId in global.prospectsEnAttente) {
    const prospect = global.prospectsEnAttente[userId];
    if (!prospect.relanced && (maintenant - prospect.timestamp) >= vingtQuatreHeures) {
      try {
        const message =
          'Bonjour ' + prospect.name + ', c est l assistant de ' + config.business.name + '. ' +
          'Vous nous avez contacte hier concernant ' + prospect.problem + '. ' +
          config.business.owner + ' est disponible pour vous aider. ' +
          'Souhaitez-vous qu on planifie une intervention ?';

        await sendMessage('whatsapp:' + userId, message);
        prospect.relanced = true;
        console.log('[RELANCE] Message envoye a ' + prospect.name + ' (' + userId + ')');
      } catch (err) {
        console.error('[RELANCE] Erreur pour ' + userId + ':', err);
      }
    }
  }
}

// Vérifie toutes les heures
function demarrerRelances() {
  setInterval(verifierRelances, 60 * 60 * 1000);
  console.log('[RELANCE] Système de relance démarré');
}

module.exports = { ajouterProspect, demarrerRelances, verifierRelances };