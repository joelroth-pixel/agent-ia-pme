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

  return 'Tu es l assistant WhatsApp de ' + business.name + ', gere par ' + business.owner + '.\nTon role : repondre aux clients de maniere ' + agent.tone + ', en ' + agent.language + '.\n\nINFORMATIONS SUR L ENTREPRISE :\n- Zone d intervention : ' + service_area + '\n- Services proposes :\n' + servicesText + '\n\nHORAIRES :\n' + hoursText + '\n\nTARIFS :\n' + pricingText + '\n\nQUESTIONS FREQUENTES :\n' + faqText + '\n\nREGLES IMPORTANTES :\n1. Reponds toujours en francais, de maniere concise (3-5 phrases max).\n2. Ne promets jamais un prix fixe sans avoir vu le probleme.\n3. Si le client mentionne une urgence (fuite active, eau coupee, degat des eaux, inondation, pas d eau chaude), reponds normalement ET ajoute le tag : [URGENCE]\n4. Quand tu as collecte le nom, le probleme et la ville du client, termine par : [LEAD_COLLECTE]\n5. Ne reponds qu aux sujets lies aux services de l entreprise.\n6. Quand un client demande un prix ou decrit un probleme precis, propose une fourchette indicative : debouchage simple 120-200 CHF, debouchage complexe 200-400 CHF, reparation fuite 150-350 CHF, remplacement robinet 150-250 CHF, remplacement chauffe-eau 800-1500 CHF, installation sanitaire 300-800 CHF, urgence week-end 250-450 CHF. Precise toujours que c est indicatif et que le prix exact sera confirme sur place.';
}

function extractTag(text, tag) {
  return text.indexOf('[' + tag + ']') !== -1;
}

function cleanResponse(text) {
  return text.replace('[URGENCE]', '').replace('[LEAD_COLLECTE]', '').trim();
}

function extractLeadInfo(userId) {
  const messages = memory.getMessages(userId);
  const fullText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const nameMatch = fullText.match(/(?:je m.appelle|c.est|mon nom est)\s*([A-Za-z\-]+(?:\s[A-Za-z\-]+)?)/i);
  return {
    name: nameMatch ? nameMatch[1] : 'Client',
    city: 'Non precise',
    rawText: fullText.slice(-300)
  };
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
  const isLeadReady = extractTag(rawReply, 'LEAD_COLLECT') || extractTag(rawReply, 'LEAD_COLLECTE');
  const finalReply = cleanResponse(rawReply);

  memory.addMessage(userId, 'assistant', finalReply);

  if (isUrgent) {
    const urgentMsg = '🚨 URGENCE CLIENT !\n\nNumero : ' + userId + '\nMessage : ' + userMessage + '\n\nA rappeler immediatement !';
    await notifyOwner({ name: 'URGENCE', city: '', rawText: urgentMsg }, userId);
  }

  if (isLeadReady && !isUrgent) {
    const leadInfo = extractLeadInfo(userId);
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