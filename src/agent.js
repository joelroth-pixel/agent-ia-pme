const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/client.json');
const memory = require('./memory');
const { notifyOwner } = require('./whatsapp');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt() {
  const { business, service_area, hours, services, pricing, faq, agent } = config;
  const hoursText = Object.entries(hours).map(([day, h]) => '  - ' + day + ' : ' + h).join('\n');
  const servicesText = services.map(s => '  - ' + s).join('\n');
  const pricingText = Object.entries(pricing).filter(([k]) => k !== 'grille_devis').map(([k, v]) => '  - ' + k + ' : ' + v).join('\n');
  const faqText = faq.map(f => '  Q : ' + f.question + '\n  R : ' + f.answer).join('\n\n');
  return 'Tu es l assistant WhatsApp de ' + business.name + ', gere par ' + business.owner + '.\nTon role : repondre aux clients de maniere ' + agent.tone + ', en ' + agent.language + '.\n\nINFORMATIONS SUR L ENTREPRISE :\n- Zone d intervention : ' + service_area + '\n- Services proposes :\n' + servicesText + '\n\nHORAIRES :\n' + hoursText + '\n\nTARIFS :\n' + pricingText + '\n\nQUESTIONS FREQUENTES :\n' + faqText + '\n\nREGLES IMPORTANTES :\n1. Reponds toujours en francais, de maniere concise (3-5 phrases max).\n2. Ne promets jamais un prix fixe sans avoir vu le probleme.\n3. Si le client mentionne une urgence (fuite active, eau coupee, degat des eaux, inondation, pas d eau chaude), reponds normalement ET ajoute le tag : [URGENCE]\n4. Quand tu as collecte le nom complet, le probleme et la ville du client ET que ce n est PAS une urgence, termine par : [LEAD_COLLECTE] [NOM:Prenom Nom] [VILLE:NomVille]. Si c est une urgence ne mets PAS ces tags.\n5. Ne reponds qu aux sujets lies aux services de l entreprise.\n6. Quand un client demande un prix ou decrit un probleme precis, propose une fourchette indicative : debouchage simple 120-200 CHF, debouchage complexe 200-400 CHF, reparation fuite 150-350 CHF, remplacement robinet 150-250 CHF, remplacement chauffe-eau 800-1500 CHF, installation sanitaire 300-800 CHF, urgence week-end 250-450 CHF. Precise toujours que c est indicatif et que le prix exact sera confirme sur place.';
}

function extractTag(text, tag) {
  return text.indexOf('[' + tag + ']') !== -1;
}

function extractTagValue(text, tag) {
  const match = text.match(new RegExp('\\[' + tag + ':([^\\]]+)\\]'));
  return match ? match[1].trim() : null;
}

function cleanResponse(text) {
  return text.replace(/\[URGENCE\]/g, '').replace(/\[LEAD_COLLECTE\]/g, '').replace(/\[NOM:[^\]]+\]/g, '').replace(/\[VILLE:[^\]]+\]/g, '').trim();
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
  const finalReply = cleanResponse(rawReply);

  memory.addMessage(userId, 'assistant', finalReply);

  if (isUrgent) {
    const leadInfo = extractLeadInfo(userId, rawReply);
    const urgentMsg = 'URGENCE CLIENT !\n\nMessage : ' + userMessage + '\n\nA rappeler immediatement !';
    await notifyOwner({ name: leadInfo.name, city: leadInfo.city, rawText: urgentMsg }, userId);
    if (global.statsHebdo) global.statsHebdo.urgences++;
  }

  if (isLeadReady && !isUrgent) {
    const leadInfo = extractLeadInfo(userId, rawReply);
    memory.updateLead(userId, leadInfo);
    await notifyOwner(leadInfo, userId);
  }

  return {
    reply: finalReply,
    isLeadReady,
    leadInfo: isLeadReady ? memory.getLead(userId) : null,
  };
}

module.exports = { chat };
