const fs = require('fs');

const code = "const Anthropic = require('@anthropic-ai/sdk');\n" +
"const config = require('../config/client.json');\n" +
"const memory = require('./memory');\n" +
"const { notifyOwner } = require('./whatsapp');\n" +
"const { isAlreadyNotified, markAsNotified, isUrgenceNotified, markUrgenceNotified } = require('./memory');\n\n" +
"const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });\n\n" +
"function buildSystemPrompt() {\n" +
"  const { business, service_area, hours, services, pricing, faq, agent } = config;\n" +
"  const hoursText = Object.entries(hours).map(([day, h]) => '  - ' + day + ' : ' + h).join('\\n');\n" +
"  const servicesText = services.map(s => '  - ' + s).join('\\n');\n" +
"  const pricingText = Object.entries(pricing).filter(([k]) => k !== 'grille_devis').map(([k, v]) => '  - ' + k + ' : ' + v).join('\\n');\n" +
"  const faqText = faq.map(f => '  Q : ' + f.question + '\\n  R : ' + f.answer).join('\\n\\n');\n" +
"  return 'Tu es l assistant WhatsApp de ' + business.name + ', gere par ' + business.owner + '.\\nTon role : repondre aux clients de maniere ' + agent.tone + ', en ' + agent.language + '.\\n\\nINFORMATIONS SUR L ENTREPRISE :\\n- Zone d intervention : ' + service_area + '\\n- Services proposes :\\n' + servicesText + '\\n\\nHORAIRES :\\n' + hoursText + '\\n\\nTARIFS :\\n' + pricingText + '\\n\\nQUESTIONS FREQUENTES :\\n' + faqText + '\\n\\nREGLES IMPORTANTES :\\n1. Reponds toujours en francais, de maniere concise (3-5 phrases max), sans emojis, avec un ton professionnel et courtois. Vouvoie toujours le client, jamais de tutoiement ni de familiarite.\\n2. Ne promets jamais un prix fixe sans avoir vu le probleme.\\n3. Si le client mentionne une urgence (fuite active, eau coupee, degat des eaux, inondation, pas d eau chaude), reponds normalement ET ajoute [URGENCE] [NOM:Prenom Nom] [VILLE:NomVille] si tu connais ces infos.\\n4. Quand tu as collecte le nom, le probleme et la ville du client ET que ce n est PAS une urgence, termine par : [LEAD_COLLECTE] [NOM:Prenom Nom] [VILLE:NomVille].\\n5. Ne demande JAMAIS le numero de telephone - tu l as deja automatiquement.\\n6. Ne reponds qu aux sujets lies aux services de l entreprise.\\n7. Ne propose une fourchette de prix QUE si le client demande explicitement le prix ou le cout. Si le client decrit juste son probleme sans demander de prix, ne donne pas de fourchette. Quand le client demande un prix, utilise cette grille : debouchage simple 120-200 CHF, debouchage complexe 200-400 CHF, reparation fuite 150-350 CHF, remplacement robinet 150-250 CHF, remplacement chauffe-eau 800-1500 CHF, installation sanitaire 300-800 CHF, urgence week-end 250-450 CHF. Precise toujours que c est indicatif et que le prix exact sera confirme sur place.';\n" +
"}\n\n" +
"function extractTag(text, tag) {\n" +
"  return text.indexOf('[' + tag + ']') !== -1;\n" +
"}\n\n" +
"function extractTagValue(text, tag) {\n" +
"  const match = text.match(new RegExp('\\\\[' + tag + ':([^\\\\]]+)\\\\]'));\n" +
"  return match ? match[1].trim() : null;\n" +
"}\n\n" +
"function cleanResponse(text) {\n" +
"  return text.replace(/\\[URGENCE\\]/g, '').replace(/\\[LEAD_COLLECTE\\]/g, '').replace(/\\[NOM:[^\\]]+\\]/g, '').replace(/\\[VILLE:[^\\]]+\\]/g, '').trim();\n" +
"}\n\n" +
"function extractLeadInfo(userId, rawReply) {\n" +
"  const messages = memory.getMessages(userId);\n" +
"  const fullText = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');\n" +
"  const name = extractTagValue(rawReply, 'NOM') || 'Client';\n" +
"  const city = extractTagValue(rawReply, 'VILLE') || 'Non precise';\n" +
"  return { name, city, rawText: fullText.slice(-300) };\n" +
"}\n\n" +
"async function chat(userId, userMessage) {\n" +
"  memory.addMessage(userId, 'user', userMessage);\n" +
"  const messages = memory.getMessages(userId);\n\n" +
"  const response = await client.messages.create({\n" +
"    model: 'claude-sonnet-4-6',\n" +
"    max_tokens: 500,\n" +
"    system: buildSystemPrompt(),\n" +
"    messages: messages,\n" +
"  });\n\n" +
"  const rawReply = response.content[0].text;\n" +
"  const isUrgent = extractTag(rawReply, 'URGENCE');\n" +
"  const isLeadReady = extractTag(rawReply, 'LEAD_COLLECTE');\n" +
"  const finalReply = cleanResponse(rawReply);\n\n" +
"  memory.addMessage(userId, 'assistant', finalReply);\n\n" +
"  if (isUrgent && !isUrgenceNotified(userId)) {\n" +
"    const leadInfo = extractLeadInfo(userId, rawReply);\n" +
"    const urgentMsg = 'URGENCE CLIENT !\\n\\nMessage : ' + userMessage + '\\n\\nA rappeler immediatement !';\n" +
"    await notifyOwner({ name: leadInfo.name, city: leadInfo.city, rawText: urgentMsg }, userId);\n" +
"    markUrgenceNotified(userId);\n" +
"    if (global.statsHebdo) global.statsHebdo.urgences++;\n" +
"  }\n\n" +
"  if (isLeadReady && !isUrgent && !isAlreadyNotified(userId)) {\n" +
"    const leadInfo = extractLeadInfo(userId, rawReply);\n" +
"    memory.updateLead(userId, leadInfo);\n" +
"    await notifyOwner(leadInfo, userId);\n" +
"    markAsNotified(userId);\n" +
"  }\n\n" +
"  return {\n" +
"    reply: finalReply,\n" +
"    isLeadReady,\n" +
"    leadInfo: isLeadReady ? memory.getLead(userId) : null,\n" +
"  };\n" +
"}\n\n" +
"module.exports = { chat };\n";

fs.writeFileSync('src/agent.js', code);
console.log('OK');