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

function isAlreadyNotified(userId) {
  return getHistory(userId).notified === true;
}

function markAsNotified(userId) {
  getHistory(userId).notified = true;
}

function isUrgenceNotified(userId) {
  return getHistory(userId).urgenceNotified === true;
}

function markUrgenceNotified(userId) {
  getHistory(userId).urgenceNotified = true;
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


function isFirstMessage(userId) {
  return getHistory(userId).firstMessageSent !== true;
}

function markFirstMessageSent(userId) {
  getHistory(userId).firstMessageSent = true;
}

module.exports = { addMessage, updateLead, getLead, getMessages, clearSession, isAlreadyNotified, markAsNotified, isUrgenceNotified, markUrgenceNotified, isFirstMessage, markFirstMessageSent };