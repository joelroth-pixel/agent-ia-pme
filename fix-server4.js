const fs = require('fs');

const code = "require('dotenv').config();\n" +
"const { envoyerRapport } = require('./rapport');\n" +
"const { ajouterProspect, demarrerRelances } = require('./relance');\n" +
"const { connectDB, incrementStats } = require('./database');\n" +
"const { getClientConfig } = require('../clients/index');\n" +
"const express = require('express');\n" +
"const { sendMessage, notifyOwner } = require('./whatsapp');\n" +
"const { chat } = require('./agent');\n\n" +
"const app = express();\n" +
"app.use(express.urlencoded({ extended: false }));\n" +
"app.use(express.json());\n\n" +
"global.statsHebdo = { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };\n\n" +
"function planifierRapport() {\n" +
"  const now = new Date();\n" +
"  const prochainLundi = new Date(now);\n" +
"  prochainLundi.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));\n" +
"  prochainLundi.setHours(8, 0, 0, 0);\n" +
"  const delai = prochainLundi - now;\n" +
"  setTimeout(() => {\n" +
"    envoyerRapport();\n" +
"    setInterval(envoyerRapport, 7 * 24 * 60 * 60 * 1000);\n" +
"  }, delai);\n" +
"  console.log('[RAPPORT] Prochain rapport : ' + prochainLundi.toLocaleString('fr-CH'));\n" +
"}\n\n" +
"connectDB().then(() => {\n" +
"  planifierRapport();\n" +
"  demarrerRelances();\n" +
"});\n\n" +
"app.post('/webhook', async (req, res) => {\n" +
"  const userPhone = req.body.From;\n" +
"  const userMessage = req.body.Body;\n" +
"  const twilioNumber = req.body.To;\n\n" +
"  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');\n\n" +
"  const config = getClientConfig(twilioNumber);\n" +
"  if (!config) return res.status(404).send('Client not found');\n\n" +
"  const userId = userPhone.replace('whatsapp:', '');\n\n" +
"  // Verifie si le numero est interne (patron ou collaborateur)\n" +
"  const numerosInternes = config.business.numeros_internes || [];\n" +
"  if (numerosInternes.includes(userId)) {\n" +
"    console.log('[INTERNE] Message de ' + userId + ' ignore par l agent');\n" +
"    return res.status(200).send('OK');\n" +
"  }\n\n" +
"  global.statsHebdo.messages++;\n" +
"  await incrementStats('messages');\n" +
"  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ' pour ' + twilioNumber);\n\n" +
"  try {\n" +
"    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage, config);\n" +
"    await sendMessage(userPhone, reply);\n" +
"    console.log('[' + new Date().toLocaleTimeString() + '] Reponse envoyee a ' + userId);\n\n" +
"    if (isLeadReady && leadInfo) {\n" +
"      global.statsHebdo.prospects++;\n" +
"      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });\n" +
"      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId });\n" +
"      ajouterProspect(userId, leadInfo.name, leadInfo.rawText);\n" +
"    }\n" +
"  } catch (error) {\n" +
"    console.error('Erreur agent IA :', error);\n" +
"    await sendMessage(userPhone, 'Desole, une erreur est survenue. Veuillez rappeler directement au numero habituel.');\n" +
"  }\n" +
"  res.status(200).send('OK');\n" +
"});\n\n" +
"app.get('/relance-test', async (req, res) => {\n" +
"  const { verifierRelances } = require('./relance');\n" +
"  for (const userId in global.prospectsEnAttente) {\n" +
"    global.prospectsEnAttente[userId].timestamp = Date.now() - 25 * 60 * 60 * 1000;\n" +
"  }\n" +
"  await verifierRelances();\n" +
"  res.json({ status: 'relances verifiees', prospects: global.prospectsEnAttente });\n" +
"});\n\n" +
"app.get('/rapport-test', async (req, res) => {\n" +
"  await envoyerRapport();\n" +
"  res.json({ status: 'rapport envoye' });\n" +
"});\n\n" +
"app.get('/health', (req, res) => {\n" +
"  res.json({ status: 'ok', timestamp: new Date().toISOString() });\n" +
"});\n\n" +
"const PORT = process.env.PORT || 3000;\n" +
"app.listen(PORT, () => {\n" +
"  console.log('Agent IA PME demarre sur le port ' + PORT);\n" +
"});\n";

fs.writeFileSync('src/server.js', code);
console.log('OK');