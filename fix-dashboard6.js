const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

// Ajoute la verification au demarrage
html = html.replace(
  'if (authToken) showDashboard();',
  'if (authToken) showDashboard();\n  if (localStorage.getItem("push_active") === "true") {\n    const btn = document.querySelector(\'[onclick="activerNotifications()"]\');\n    if (btn) { btn.textContent = "Active"; btn.style.background = "#22c55e"; btn.disabled = true; }\n    document.getElementById("notif-status").style.display = "block";\n  }'
);

// Sauvegarde dans localStorage apres activation
html = html.replace(
  "document.getElementById('notif-status').style.display = 'block';",
  "document.getElementById('notif-status').style.display = 'block';\n      localStorage.setItem('push_active', 'true');"
);

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');