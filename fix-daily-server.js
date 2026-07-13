const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// Ajoute incrementDaily et getWeeklyDaily dans les imports
code = code.replace(
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation, pauseConversation, isConversationPaused } = require('./database');",
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation, pauseConversation, isConversationPaused, incrementDaily, getWeeklyDaily } = require('./database');"
);

// Ajoute incrementDaily apres incrementStats messages
code = code.replace(
  "  await incrementStats('messages', null, clientId);",
  "  await incrementStats('messages', null, clientId);\n  await incrementDaily('messages', clientId);"
);

// Ajoute incrementDaily apres incrementStats urgences
code = code.replace(
  "      await incrementStats('urgences', null, clientId);",
  "      await incrementStats('urgences', null, clientId);\n      await incrementDaily('urgences', clientId);"
);

// Ajoute incrementDaily apres incrementStats prospects
code = code.replace(
  "      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId }, clientId);",
  "      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId }, clientId);\n      await incrementDaily('prospects', clientId);"
);

// Ajoute getWeeklyDaily dans la route dashboard/data
code = code.replace(
  "    const conversations = await getConversations(clientId, 10);",
  "    const conversations = await getConversations(clientId, 10);\n    const weeklyData = await getWeeklyDaily(clientId);"
);

code = code.replace(
  "      conversations: conversations.map(c => ({",
  "      weeklyData,\n      conversations: conversations.map(c => ({"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');