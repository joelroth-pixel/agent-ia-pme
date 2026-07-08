const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/client.json');
const memory = require('./memory');
const calendar = require('./calendar');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Construit le prompt système
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

GESTION DES RENDEZ-VOUS :
- Quand un client veut prendre un RDV, réponds UNIQUEMENT par le tag : [SHOW_SLOTS]
- Quand le client choisit un créneau (répond "1", "2" ou "3"), réponds UNIQUEMENT par : [BOOK_SLOT:X] où X est le numéro choisi
- Quand tu as collecté le nom du client pour le RDV, inclus [CLIENT_NAME:Prénom Nom] dans ta réponse
- Ne propose jamais de dates ou d'heures toi-même — utilise toujours [SHOW_SLOTS]

RÈGLES IMPORTANTES :
1. Réponds toujours en français, de manière concise (3-5 phrases max).
2. Ne promets jamais un prix fixe sans avoir vu le problème.
3. Si le client a un problème urgent (fuite active, eau coupée), propose immédiatement un contact direct.
4. Quand tu as collecté le nom, le problème et la ville du client (sans RDV), termine par : [LEAD_COLLECTÉ]
5. Ne réponds qu'aux sujets liés aux services de l'entreprise.`;
}

function extractTag(text, tag) {
  const regex = new RegExp(`\\[${tag}(?::([^\\]]+))?\\]`);
  const match = text.match(regex);
  return match ? (match[1] || true) : null;
}

function cleanResponse(text) {
  return text
    .replace(/\[SHOW_SLOTS\]/g, '')
    .replace(/\[BOOK_SLOT:\d\]/g, '')
    .replace(/\[LEAD_COLLECTÉ\]/g, '')
    .replace(/\[CLIENT_NAME:[^\]]+\]/g, '')
    .trim();
}

async function chat(userId, userMessage) {
  memory.addMessage(userId, 'user', userMessage);

  const messages = memory.getMessages(userId);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    timeout: 30000,
    system: buildSystemPrompt(),
    messages: messages,
  });

  const rawReply = response.content[0].text;

  // Détecte les tags d'action
  const showSlots = extractTag(rawReply, 'SHOW_SLOTS');
  const bookSlot = extractTag(rawReply, 'BOOK_SLOT');
  const isLeadReady = extractTag(rawReply, 'LEAD_COLLECTÉ');
  const clientName = extractTag(rawReply, 'CLIENT_NAME');

  let finalReply = cleanResponse(rawReply);
  let slotBooked = null;

  // Affiche les créneaux disponibles
  if (showSlots) {
    try {
      const slots = await calendar.getAvailableSlots(3);
      memory.updateLead(userId, { pendingSlots: slots });

      if (slots.length === 0) {
        finalReply = "Je n'ai malheureusement aucun créneau disponible dans les 7 prochains jours. Voulez-vous que je transmette votre demande directement à " + config.business.owner + " ?";
      } else {
        const slotsText = slots.map((s, i) => calendar.formatSlot(s, i)).join('\n');
        finalReply = `Voici les prochains créneaux disponibles :\n\n${slotsText}\n\nRépondez avec le numéro de votre choix (1, 2 ou 3) 👆`;
      }
    } catch (err) {
      console.error('Erreur Calendar:', err);
      finalReply = "Je rencontre un problème avec l'agenda. Voulez-vous que je transmette votre demande directement au patron ?";
    }
  }

  // Réserve un créneau
  if (bookSlot) {
    const slotNumber = parseInt(bookSlot);
    const session = memory.getLead(userId);
    const slots = session.pendingSlots;

    if (slots && slots[slotNumber - 1]) {
      const chosenSlot = slots[slotNumber - 1];
      const name = clientName || session.name || 'Client';
      const phone = userId;
      const description = session.rawText || 'Demande via WhatsApp';

      try {
        await calendar.createAppointment(chosenSlot, name, phone, description);
        const formattedSlot = calendar.formatSlot(chosenSlot, 0).replace('1️⃣ ', '');
        finalReply = `✅ RDV confirmé !\n\n📅 ${formattedSlot}\n👤 Au nom de : ${name}\n\n${config.business.owner} vous contactera si nécessaire. À bientôt !`;
        slotBooked = chosenSlot;
        memory.updateLead(userId, { rdvConfirmed: true, rdvSlot: chosenSlot });
      } catch (err) {
        console.error('Erreur création RDV:', err);
        finalReply = "Je n'ai pas pu enregistrer le RDV. Voulez-vous réessayer ou préférez-vous appeler directement ?";
      }
    }
  }

  // Met à jour le nom si détecté
  if (clientName) {
    memory.updateLead(userId, { name: clientName });
  }

  memory.addMessage(userId, 'assistant', finalReply);

  return {
    reply: finalReply,
    isLeadReady: !!isLeadReady,
    slotBooked,
    leadInfo: isLeadReady ? memory.getLead(userId) : null,
  };
}

module.exports = { chat };
