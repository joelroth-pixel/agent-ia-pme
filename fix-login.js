const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

code = code.replace(
  "app.post('/dashboard/login', (req, res) => {\n" +
  "  const { password } = req.body;\n" +
  "  const configs = getAllConfigs();\n" +
  "  const config = Object.values(configs)[0];\n" +
  "  if (password === (config && config.business.dashboard_password)) {\n" +
  "    const token = Math.random().toString(36).slice(2) + Date.now();\n" +
  "    global.tokens.add(token);\n" +
  "    res.json({ token });\n" +
  "  } else {\n" +
  "    res.status(401).json({ error: 'Mot de passe incorrect' });\n" +
  "  }\n" +
  "});",
  "app.post('/dashboard/login', (req, res) => {\n" +
  "  const { password } = req.body;\n" +
  "  const configs = getAllConfigs();\n" +
  "  let matchedClientId = null;\n" +
  "  for (const [clientId, config] of Object.entries(configs)) {\n" +
  "    if (password === config.business.dashboard_password) {\n" +
  "      matchedClientId = clientId;\n" +
  "      break;\n" +
  "    }\n" +
  "  }\n" +
  "  if (matchedClientId) {\n" +
  "    const token = Math.random().toString(36).slice(2) + Date.now();\n" +
  "    global.tokens.set(token, matchedClientId);\n" +
  "    res.json({ token });\n" +
  "  } else {\n" +
  "    res.status(401).json({ error: 'Mot de passe incorrect' });\n" +
  "  }\n" +
  "});"
);

// Remplace global.tokens = new Set() par global.tokens = new Map()
code = code.replace(
  "global.tokens = new Set();",
  "global.tokens = new Map();"
);

// Remplace authMiddleware
code = code.replace(
  "function authMiddleware(req, res, next) {\n" +
  "  const auth = req.headers.authorization || '';\n" +
  "  const token = auth.replace('Bearer ', '');\n" +
  "  if (global.tokens.has(token)) return next();\n" +
  "  res.status(401).json({ error: 'Non autorise' });\n" +
  "}",
  "function authMiddleware(req, res, next) {\n" +
  "  const auth = req.headers.authorization || '';\n" +
  "  const token = auth.replace('Bearer ', '');\n" +
  "  if (global.tokens.has(token)) {\n" +
  "    req.clientId = global.tokens.get(token);\n" +
  "    return next();\n" +
  "  }\n" +
  "  res.status(401).json({ error: 'Non autorise' });\n" +
  "}"
);

// Remplace toutes les occurrences de Object.keys(configs)[0] par req.clientId dans les routes dashboard
code = code.replace(
  /const clientId = Object\.keys\(configs\)\[0\];/g,
  "const clientId = req.clientId || Object.keys(configs)[0];"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');