const fs = require('fs');

const code = "require('dotenv').config();\n" +
"const { envoyerRapport } = require('./rapport');\n" +
"const express = require('express');\n" +
"const { sendMessage, notifyOwner } = require('./whatsapp');\n" +
"const { chat } = require('./agent');\n" +
"const config = require('../config/client.json');\n\n" +
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
"}\n" +
"planifierRapport();\n\n" +
"app.post('/webhook', async (req, res) => {\n" +
"  const userPhone = req.body.From;\n" +
"  const userMessage = req.body.Body;\n" +
"  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');\n" +
"  const userId = userPhone.replace('whatsapp:', '');\n" +
"  global.statsHebdo.messages++;\n" +
"  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ': ' + userMessage);\n" +
"  try {\n" +
"    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage);\n" +
"    await sendMessage(userPhone, reply);\n" +
"    console.log('[' + new Date().toLocaleTimeString() + '] Reponse envoyee a ' + userId);\n" +
"    if (isLeadReady && leadInfo) {\n" +
"      global.statsHebdo.prospects++;\n" +
"      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });\n" +
"    }\n" +
"  } catch (error) {\n" +
"    console.error('Erreur agent IA :', error);\n" +
"    await sendMessage(userPhone, 'Desole, une erreur est survenue. Veuillez rappeler directement au numero habituel.');\n" +
"  }\n" +
"  res.status(200).send('OK');\n" +
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