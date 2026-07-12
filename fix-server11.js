const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// Corrige la ligne 55 dans connectDB
code = code.replace(
  "  const clientId = req.clientId || Object.keys(configs)[0];\n  const settings = await getSettings(clientId);",
  "  const clientId = Object.keys(configs)[0];\n  const settings = await getSettings(clientId);"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');