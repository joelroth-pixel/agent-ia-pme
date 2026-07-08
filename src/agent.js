const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/client.json');
const memory = require('./memory');
const { notifyOwner } = require('./whatsapp');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt() {
  const { business, service_area, hours, services, pricing, faq, agent } = config;
  const hoursText = Object.entries(hours).map(([day, h]) => `  - ${day} : ${h}`).join('\n');
  const servicesText = services.map(s => `  - ${s}`).join('\n');
  const pricingText = Object.entries(pricing).map(([k, v]) => `  - ${k} : ${v}`).join('\n');
  const faqText = faq.map(f => `  Q : ${f.question}\n  R : ${f.answer}`).join('\n\n');

  return `Tu es l'assistant WhatsApp de ${business.name}, géré par ${business.owner}.
Ton rôle : répondre aux clients de manière ${agent.tone}, en ${agent.language}.

INFORMATIONS SUR L'ENTREPRISE :
- Zone d'intervention : ${service_area}
- Services proposés :
${servicesText}

HORAIRES :
${hoursText}

TARIFS :
${pricingText}

QUESTIONS FRÉQUENTES :
${faqText}

RÈGLES IMPORTANTES :
1. Réponds toujours en français, de manière concise (3-5 phrases max).
2. Ne promets jamais un prix fixe sans avoir vu le problème.
3. Si le client mentionne une urgence (fuite active, eau coupée, dégât des eaux, inondation, pas d'eau chaude), réponds normalement ET ajoute le tag : [URGENCE]
4. Quand tu as collecté le nom, le problème et la ville du client, termine par : [LEAD_COLLECTÉ]
5. Ne réponds qu'aux sujets liés aux services de l'entreprise.
6. Quand un client demande un prix ou décrit un problème précis, propose une fourchette indicative basée sur cette grille : débouchage simple 120-200 CHF, débouchage complexe 200-400 CHF, réparation fuite 150-350 CHF, remplacement robinet 150-250 CHF, remplacement chauffe-eau 800-1500 CHF, installation sanitaire 300-800 CHF, urgence week-end 250-450 CHF. Précise toujours que c'est indicatif et que le prix exact sera confirmé sur place.

function extractTag(text, tag) {
  const regex = new RegExp('\\[' + tag + '\\]');
  return regex.test(text);
}

function cleanResponse(text) {
  return text.replace(/\[URGENCE\]/g, '').replace(/\[LEAD_COLLECTÉ\]/g, '').trim();
}

function extractLeadInfo(userId, userMessage) {
  const messages = memory.getMessages(userId);
  const fullText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const nameMatch = fullText.match(/(?:je m'appelle|c'est|mon nom est)\s*([A-ZÀ-Ÿa-zà-ÿ\-]+(?:\s[A-ZÀ-Ÿa-zà-ÿ\-]+)?)/i);
  return {
    name: nameMatch ? nameMatch[1] : 'Client',
    city: 'Non précisé',
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
  const isLeadReady = extractTag(rawReply, 'LEAD_COLLECTÉ');
  const finalReply = cleanResponse(rawReply);

  memory.addMessage(userId, 'assistant', finalReply);

  if (isUrgent) {
    const urgentMsg = `🚨 URGENCE CLIENT !\n\nNuméro : ${userId}\nMessage : "${userMessage}"\n\nÀ rappeler immédiatement !`;
    await notifyOwner({ name: 'URGENCE', city: '', rawText: urgentMsg }, userId);
  }

  if (isLeadReady && !isUrgent) {
    const leadInfo = extractLeadInfo(userId, userMessage);
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
