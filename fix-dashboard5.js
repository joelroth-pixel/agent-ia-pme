const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

html = html.replace(
  "document.getElementById('notif-status').style.display = 'block';",
  "document.getElementById('notif-status').style.display = 'block';\n      const btn = document.querySelector('[onclick=\"activerNotifications()\"]');\n      btn.textContent = 'Active';\n      btn.style.background = '#22c55e';\n      btn.disabled = true;"
);

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');