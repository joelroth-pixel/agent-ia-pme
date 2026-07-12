const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

code = code.replace(
  "  await incrementStats('messages');",
  "  await incrementStats('messages', null, clientId);"
);

code = code.replace(
  "      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId });",
  "      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId }, clientId);"
);

code = code.replace(
  "      await incrementStats('urgences');",
  "      await incrementStats('urgences', null, clientId);"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');