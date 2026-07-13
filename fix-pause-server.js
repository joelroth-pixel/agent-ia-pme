const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// Ajoute pauseConversation et isConversationPaused dans les imports
code = code.replace(
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation } = require('./database');",
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation, pauseConversation, isConversationPaused } = require('./database');"
);

// Ajoute la pause dans la route /dashboard/reply
code = code.replace(
  "    await sendMessage('whatsapp:' + userId, message);\n    await saveMessage(clientId, userId, 'assistant', message);\n    console.log('[REPLY] Message envoye a ' + userId);\n    res.json({ success: true });",
  "    await sendMessage('whatsapp:' + userId, message);\n    await saveMessage(clientId, userId, 'assistant', message);\n    await pauseConversation(clientId, userId, 2);\n    console.log('[REPLY] Message envoye a ' + userId + ' - agent en pause 2h');\n    res.json({ success: true });"
);

// Verifie la pause avant de repondre dans le webhook
code = code.replace(
  "  global.statsHebdo.messages++;\n  await incrementStats('messages', null, clientId);",
  "  // Verifie si la conversation est en pause\n  const paused = await isConversationPaused(clientId, userId);\n  if (paused) {\n    console.log('[PAUSE] Message de ' + userId + ' ignore - patron a pris la main');\n    await saveMessage(clientId, userId, 'user', userMessage);\n    return res.status(200).send('OK');\n  }\n\n  global.statsHebdo.messages++;\n  await incrementStats('messages', null, clientId);"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');