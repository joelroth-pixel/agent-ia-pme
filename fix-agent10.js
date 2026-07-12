const fs = require('fs');
let code = fs.readFileSync('src/agent.js', 'utf8');

code = code.replace(
  "  return {\n    reply: finalReply,\n    isLeadReady,\n    leadInfo: isLeadReady ? memory.getLead(userId) : null,\n  };",
  "  return {\n    reply: finalReply,\n    isLeadReady,\n    isUrgent,\n    leadInfo: isLeadReady ? memory.getLead(userId) : null,\n  };"
);

fs.writeFileSync('src/agent.js', code);
console.log('OK');