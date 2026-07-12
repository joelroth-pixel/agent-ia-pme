const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

const route = "\napp.post('/dashboard/reply', authMiddleware, async (req, res) => {\n" +
"  try {\n" +
"    const { userId, message } = req.body;\n" +
"    const configs = getAllConfigs();\n" +
"    const clientId = Object.keys(configs)[0];\n" +
"    await sendMessage('whatsapp:' + userId, message);\n" +
"    await saveMessage(clientId, userId, 'assistant', message);\n" +
"    console.log('[REPLY] Message envoye a ' + userId);\n" +
"    res.json({ success: true });\n" +
"  } catch (err) {\n" +
"    res.status(500).json({ error: err.message });\n" +
"  }\n" +
"});\n";

code = code.replace("app.get('/relance-test'", route + "app.get('/relance-test'");
fs.writeFileSync('src/server.js', code);
console.log('OK');