// Stocke les conversations en mémoire (redémarre au restart du serveur)
// Pour la production, remplace par Redis ou une base de données
const conversations = new Map();

const MAX_MESSAGES = 20; // Garde les 20 derniers messages par utilisateur

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, { messages: [], lead: {} });
  }
  return conversations.get(userId);
}

function addMessage(userId, role, content) {
  const session = getHistory(userId);
  session.messages.push({ role, content });

  // Garde uniquement les derniers MAX_MESSAGES messages
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
}

function updateLead(userId, data) {
  const session = getHistory(userId);
  session.lead = { ...session.lead, ...data };
}

function getLead(userId) {
  return getHistory(userId).lead;
}

function getMessages(userId) {
  return getHistory(userId).messages;
}

function clearSession(userId) {
  conversations.delete(userId);
}

module.exports = { addMessage, updateLead, getLead, getMessages, clearSession };
