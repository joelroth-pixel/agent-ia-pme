const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/client.json');
const memory = require('./memory');
const { notifyOwner } = require('./whatsapp');
const { isAlreadyNotified, markAsNotified, isUrgenceNotified, markUrgenceNotified } = require('./memory');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt() {
  const { business, service_area, hours, services, pricing, faq, agent } = config;
  const hoursText = Object.entries(hours).map(([day, h]) => '  - ' + day + ' : ' + h).join('\n');
  const servicesText = services.map(s => '  - ' + s).join('\n');
  const pricingText = Object.entries(pricing).filter(([k]) => k !== 'grille_devis').map(([k, v]) => '  - ' + k + ' : ' + v).join('\n');
  const faqText = faq.map(f => '  Q : ' + f.question + '\n  R : ' + f.answer).join('\n\n');
  return 'Tu es l assistant WhatsApp de ' + business.name + ', gere par ' + business.owner + '.\nTon role : repondre aux clients de maniere ' + agent.tone + ', en ' + agent.language + '.\n\nINFORMATIONS SUR L ENTREPRISE :\n- Zone d intervention : ' + service_area + '\n- Services proposes :\n' + servicesText + '\n\nHORAIRES :\n' + hoursText + '\n\nTARIFS :\n' + pricingText + '\n\nQUESTIONS FREQUENTES :\n' + faqText + '\n\nREGLES IMPORTANTES :\n1. Reponds toujours sans emojis, avec un ton professionnel et courtois. Vouvoie toujours le client, jamais de tutoiement ni de familiarite.\n2. Detecte automatiquement la langue du client (francais, allemand, anglais, italien) et reponds TOUJOURS dans la meme langue que lui.\n3. Ne promets jamais un prix fixe sans avoir vu le probleme.\n4. Si le client mentionne une urgence (fuite active, eau coupee, degat des eaux, inondation, pas d eau chaude), reponds normalement ET ajoute [URGENCE] [NOM:Prenom Nom] [VILLE:NomVille] si tu connais ces infos.\n5. Quand tu as collecte le nom, le probleme et la ville du client ET que ce n est PAS une urgence, termine par : [LEAD_COLLECTE] [NOM:Prenom Nom] [VILLE:NomVille].\n6. Ne demande JAMAIS le numero de telephone - tu l as deja automatiquement.\n7. Ne reponds qu aux sujets lies aux services de l entreprise.\n8. Ne propose une fourchette de prix QUE si le client demande explicitement le prix ou le cout. Si le client decrit juste son probleme sans demander de prix, ne donne pas de fourchette. Quand le client demande un prix, utilise cette grille : debouchage simple 120-200 CHF, debouchage complexe 200-400 CHF, reparation fuite 150-350 CHF, remplacement robinet 150-250 CHF, remplacement chauffe-eau 800-1500 CHF, installation sanitaire 300-800 CHF, urgence week-end 250-450 CHF. Precise toujours que c est indicatif et que le prix exact sera confirme sur place.\n9. Si le client demande a parler a un humain ou au patron, reponds poliment que tu vas transmettre la demande et ajoute le tag : [TRANSFERT].';
}

function extractTag(text, tag) {
  return text.indexOf('[' + tag + ']') !== -1;
}

function extractTagValue(text, tag) {
  const match = text.match(new RegExp('\\[' + tag + ':([^\\]]+)\\]'));
  return match ? match[1].trim() : null;
}

function cleanResponse(text) {
  return text.replace(/\[URGENCE\]/g, '').replace(/\[LEAD_COLLECTE\]/g, '').replace(/\[NOM:[^\]]+\]/g, '').replace(/\[VILLE:[^\]]+\]/g, '').replace(/\[TRANSFERT\]/g, '').trim();
}

function extractLeadInfo(userId, rawReply) {
  const messages = memory.getMessages(userId);
  const fullText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const name = extractTagValue(rawReply, 'NOM') || 'Client';
  const city = extractTagValue(rawReply, 'VILLE') || 'Non precise';
  return { name, city, rawText: fullText.slice(-300) };
}

async function chat(userId, userMessage) {
  memory.addMessage(userId, 'user', userMessage);
  const messages = memory.getMessages(userId);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: buildSystemPrompt(),
    messages: messages,
  });

  const rawReply = response.content[0].text;
  const isUrgent = extractTag(rawReply, 'URGENCE');
  const isLeadReady = extractTag(rawReply, 'LEAD_COLLECTE');
  const isTransfert = extractTag(rawReply, 'TRANSFERT');
  const finalReply = cleanResponse(rawReply);

  memory.addMessage(userId, 'assistant', finalReply);

  if (isUrgent && !isUrgenceNotified(userId)) {
    const leadInfo = extractLeadInfo(userId, rawReply);
    const urgentMsg = 'URGENCE CLIENT !\n\nMessage : ' + userMessage + '\n\nA rappeler immediatement !';
    await notifyOwner({ name: leadInfo.name, city: leadInfo.city, rawText: urgentMsg }, userId);
    markUrgenceNotified(userId);
    if (global.statsHebdo) global.statsHebdo.urgences++;
  }

  if (isLeadReady && !isUrgent && !isAlreadyNotified(userId)) {
    const leadInfo = extractLeadInfo(userId, rawReply);
    memory.updateLead(userId, leadInfo);
    await notifyOwner(leadInfo, userId);
    markAsNotified(userId);
  }

  if (isTransfert) {
    const leadInfo = extractLeadInfo(userId, rawReply);
    const transfertMsg = 'DEMANDE DE TRANSFERT !\n\nUn client souhaite parler directement au patron.\n\nNumero : ' + userId + '\nDernier message : ' + userMessage;
    await notifyOwner({ name: leadInfo.name, city: leadInfo.city, rawText: transfertMsg }, userId);
  }

  return {
    reply: finalReply,
    isLeadReady,
    leadInfo: isLeadReady ? memory.getLead(userId) : null,
  };
}

module.exports = { chat };
