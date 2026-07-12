const fs = require('fs');

const code = "require('dotenv').config();\n" +
"const { envoyerRapport } = require('./rapport');\n" +
"const { ajouterProspect, demarrerRelances } = require('./relance');\n" +
"const { connectDB, incrementStats, getStats } = require('./database');\n" +
"const { getClientConfig } = require('../clients/index');\n" +
"const express = require('express');\n" +
"const path = require('path');\n" +
"const { sendMessage, notifyOwner } = require('./whatsapp');\n" +
"const { chat } = require('./agent');\n" +
"const { isFirstMessage, markFirstMessageSent } = require('./memory');\n\n" +
"const app = express();\n" +
"app.use(express.urlencoded({ extended: false }));\n" +
"app.use(express.json());\n" +
"app.use(express.static(path.join(__dirname, '../dashboard')));\n\n" +
"global.statsHebdo = { messages: 0, prospects: 0, urgences: 0, prospectsList: [] };\n" +
"global.blacklist = new Set();\n" +
"global.vacancesMode = false;\n" +
"global.tokens = new Set();\n\n" +
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
"// Routes dashboard\n" +
"app.post('/dashboard/login', (req, res) => {\n" +
"  const { password } = req.body;\n" +
"  const config = Object.values(require('../clients/index').getAllConfigs())[0];\n" +
"  if (password === (config && config.business.dashboard_password)) {\n" +
"    const token = Math.random().toString(36).slice(2) + Date.now();\n" +
"    global.tokens.add(token);\n" +
"    res.json({ token });\n" +
"  } else {\n" +
"    res.status(401).json({ error: 'Mot de passe incorrect' });\n" +
"  }\n" +
"});\n\n" +
"function authMiddleware(req, res, next) {\n" +
"  const auth = req.headers.authorization || '';\n" +
"  const token = auth.replace('Bearer ', '');\n" +
"  if (global.tokens.has(token)) return next();\n" +
"  res.status(401).json({ error: 'Non autorise' });\n" +
"}\n\n" +
"app.get('/dashboard/data', authMiddleware, async (req, res) => {\n" +
"  try {\n" +
"    const stats = await getStats();\n" +
"    const config = Object.values(require('../clients/index').getAllConfigs())[0];\n" +
"    res.json({\n" +
"      businessName: config ? config.business.name : 'Dashboard',\n" +
"      stats: {\n" +
"        messages: stats ? stats.messages : 0,\n" +
"        prospects: stats ? stats.prospects : 0,\n" +
"        urgences: stats ? stats.urgences : 0\n" +
"      },\n" +
"      prospects: stats ? stats.prospectsList : [],\n" +
"      vacancesMode: global.vacancesMode\n" +
"    });\n" +
"  } catch (err) {\n" +
"    res.json({ businessName: 'Dashboard', stats: { messages: 0, prospects: 0, urgences: 0 }, prospects: [], vacancesMode: false });\n" +
"  }\n" +
"});\n\n" +
"app.post('/dashboard/vacances', authMiddleware, (req, res) => {\n" +
"  global.vacancesMode = req.body.active || false;\n" +
"  console.log('[VACANCES] Mode vacances : ' + global.vacancesMode);\n" +
"  res.json({ success: true, vacancesMode: global.vacancesMode });\n" +
"});\n\n" +
"app.post('/webhook', async (req, res) => {\n" +
"  const userPhone = req.body.From;\n" +
"  const userMessage = req.body.Body;\n" +
"  const twilioNumber = req.body.To;\n\n" +
"  if (!userPhone || !userMessage) return res.status(400).send('Missing From or Body');\n\n" +
"  const config = getClientConfig(twilioNumber);\n" +
"  if (!config) return res.status(404).send('Client not found');\n\n" +
"  const userId = userPhone.replace('whatsapp:', '');\n\n" +
"  const numerosInternes = config.business.numeros_internes || [];\n" +
"  if (numerosInternes.includes(userId)) {\n" +
"    console.log('[INTERNE] Message de ' + userId + ' ignore par l agent');\n" +
"    return res.status(200).send('OK');\n" +
"  }\n\n" +
"  if (global.blacklist.has(userId)) {\n" +
"    console.log('[BLACKLIST] Message de ' + userId + ' ignore - STOP demande');\n" +
"    return res.status(200).send('OK');\n" +
"  }\n\n" +
"  if (userMessage.trim().toUpperCase() === 'STOP') {\n" +
"    global.blacklist.add(userId);\n" +
"    await sendMessage(userPhone, 'Vous avez ete desabonne. Vous ne recevrez plus de messages automatiques. Pour nous contacter, appelez directement le ' + config.business.phone + '.');\n" +
"    return res.status(200).send('OK');\n" +
"  }\n\n" +
"  if (global.vacancesMode) {\n" +
"    await sendMessage(userPhone, config.business.message_vacances || 'Nous sommes actuellement en vacances. Nous reviendrons bientot. Pour les urgences, appelez le ' + config.business.phone + '.');\n" +
"    return res.status(200).send('OK');\n" +
"  }\n\n" +
"  global.statsHebdo.messages++;\n" +
"  await incrementStats('messages');\n" +
"  console.log('[' + new Date().toLocaleTimeString() + '] Message de ' + userId + ' pour ' + twilioNumber);\n\n" +
"  try {\n" +
"    const { reply, isLeadReady, leadInfo } = await chat(userId, userMessage, config);\n\n" +
"    let finalReply = reply;\n" +
"    if (isFirstMessage(userId)) {\n" +
"      const messageLPD = (config.business.message_lpd || '').replace('{entreprise}', config.business.name) + '\\n\\n';\n" +
"      finalReply = messageLPD + reply;\n" +
"      markFirstMessageSent(userId);\n" +
"    }\n\n" +
"    await sendMessage(userPhone, finalReply);\n" +
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