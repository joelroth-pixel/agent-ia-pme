const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/client.json');
const memory = require('./memory');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Construit le prompt système à partir du fichier config client
function buildSystemPrompt() {
  const { business, service_area, hours, services, pricing, faq, agent } = config;

  const hoursText = Object.entries(hours)
    .map(([day, h]) => `  - ${day} : ${h}`)
    .join('\n');

  const servicesText = services.map(s => `  - ${s}`).join('\n');

  const pricingText = Object.entries(pricing)
    .map(([k, v]) => `  - ${k} : ${v}`)
    .join('\n');

  const faqText = faq
    .map(f => `  Q : ${f.question}\n  R : ${f.answer}`)
    .join('\n\n');

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
2. Ne promets jamais un prix fixe sans avoir vu le problème — oriente vers un devis gratuit.
3. Si le client a un problème urgent (fuite active, eau coupée), propose immédiatement un contact direct avec ${business.owner}.
4. Quand tu as collecté le nom, le problème et la ville du client, termine ta réponse par le tag exact : [LEAD_COLLECTÉ]
5. Ne réponds qu'aux sujets liés à la plomberie et aux services de l'entreprise.
6. Si tu ne sais pas répondre, dis-le honnêtement et propose de rappeler le client.`;
}

// Détecte si l'IA a signalé qu'un lead est complet
function extractLeadSignal(text) {
  return text.includes('[LEAD_COLLECTÉ]');
}

// Nettoie le tag interne avant d'envoyer au client
function cleanResponse(text) {
  return text.replace('[LEAD_COLLECTÉ]', '').trim();
}

// Tente d'extraire nom + ville depuis les derniers messages
function extractLeadInfo(userId) {
  const messages = memory.getMessages(userId);
  const fullText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  // Extraction simple basée sur des patterns courants
  const nameMatch = fullText.match(/(?:je m'appelle|c'est|mon nom est|bonjour,? )\s*([A-ZÀ-Ÿa-zà-ÿ\-]+(?:\s[A-ZÀ-Ÿa-zà-ÿ\-]+)?)/i);
  const cityMatch = fullText.match(/(?:à|de|habite|sur|dans|quartier|commune de)\s+([A-ZÀ-Ÿa-zà-ÿ\s\-]+?)(?:\.|,|$)/i);

  return {
    name: nameMatch ? nameMatch[1] : 'Non précisé',
    city: cityMatch ? cityMatch[1].trim() : 'Non précisé',
    rawText: fullText.slice(-300) // Derniers 300 caractères pour le résumé
  };
}

async function chat(userId, userMessage) {
  // Sauvegarde le message utilisateur
  memory.addMessage(userId, 'user', userMessage);

  const messages = memory.getMessages(userId);

  // Appel à Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: buildSystemPrompt(),
    messages: messages
  });

  const rawReply = response.content[0].text;
  const isLeadReady = extractLeadSignal(rawReply);
  const cleanReply = cleanResponse(rawReply);

  // Sauvegarde la réponse de l'agent
  memory.addMessage(userId, 'assistant', cleanReply);

  // Si lead détecté, extrait les infos
  if (isLeadReady) {
    const leadInfo = extractLeadInfo(userId);
    memory.updateLead(userId, leadInfo);
  }

  return { reply: cleanReply, isLeadReady, leadInfo: isLeadReady ? extractLeadInfo(userId) : null };
}

module.exports = { chat };
