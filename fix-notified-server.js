const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// Ajoute isNotifiedDB et markNotifiedDB dans les imports
code = code.replace(
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation, pauseConversation, isConversationPaused, incrementDaily, getWeeklyDaily } = require('./database');",
  "const { connectDB, incrementStats, getStats, savePushSubscription, getPushSubscriptions, removePushSubscription, getSettings, saveSettings, saveMessage, updateConversationStatus, getConversations, getConversation, pauseConversation, isConversationPaused, incrementDaily, getWeeklyDaily, isNotifiedDB, markNotifiedDB } = require('./database');"
);

// Remplace la verification prospect
code = code.replace(
  "    if (isLeadReady && leadInfo) {\n      await updateConversationStatus(clientId, userId, 'prospect', leadInfo.name);\n      global.statsHebdo.prospects++;\n      global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });\n      await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId }, clientId);\n      await incrementDaily('prospects', clientId);\n      ajouterProspect(userId, leadInfo.name, leadInfo.rawText);\n      await envoyerPushNotification(clientId, 'Nouveau prospect !', (leadInfo.name || 'Client') + ' - ' + userId);\n    }",
  "    if (isLeadReady && leadInfo) {\n      const dejaNotifie = await isNotifiedDB(clientId, userId, 'prospect');\n      if (!dejaNotifie) {\n        await updateConversationStatus(clientId, userId, 'prospect', leadInfo.name);\n        global.statsHebdo.prospects++;\n        global.statsHebdo.prospectsList.push({ name: leadInfo.name || 'Inconnu', phone: userId });\n        await incrementStats('prospects', { name: leadInfo.name || 'Inconnu', phone: userId }, clientId);\n        await incrementDaily('prospects', clientId);\n        ajouterProspect(userId, leadInfo.name, leadInfo.rawText);\n        await envoyerPushNotification(clientId, 'Nouveau prospect !', (leadInfo.name || 'Client') + ' - ' + userId);\n        await markNotifiedDB(clientId, userId, 'prospect');\n      }\n    }"
);

// Remplace la verification urgence
code = code.replace(
  "    if (isUrgent) {\n      await updateConversationStatus(clientId, userId, 'urgence');\n      await envoyerPushNotification(clientId, 'Urgence client !', 'Numero : ' + userId + ' - ' + userMessage.slice(0, 50));\n      if (global.statsHebdo) global.statsHebdo.urgences++;\n      await incrementStats('urgences', null, clientId);\n      await incrementDaily('urgences', clientId);\n    }",
  "    if (isUrgent) {\n      const dejaUrgence = await isNotifiedDB(clientId, userId, 'urgence');\n      if (!dejaUrgence) {\n        await updateConversationStatus(clientId, userId, 'urgence');\n        await envoyerPushNotification(clientId, 'Urgence client !', 'Numero : ' + userId + ' - ' + userMessage.slice(0, 50));\n        if (global.statsHebdo) global.statsHebdo.urgences++;\n        await incrementStats('urgences', null, clientId);\n        await incrementDaily('urgences', clientId);\n        await markNotifiedDB(clientId, userId, 'urgence');\n      }\n    }"
);

fs.writeFileSync('src/server.js', code);
console.log('OK');