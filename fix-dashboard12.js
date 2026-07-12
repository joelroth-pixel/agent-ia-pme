const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

html = html.replace(
  'function showMain() {\n    showScreen(\'main-screen\');\n    if (localStorage.getItem(\'push_active\') === \'true\') {\n      document.getElementById(\'notif-toggle\').checked = true;\n      document.getElementById(\'notif-desc\').textContent = \'Activees\';\n    }\n    loadData();\n    if (dataInterval) clearInterval(dataInterval);\n    dataInterval = setInterval(loadData, 30000);\n  }',
  'function showMain() {\n    showScreen(\'main-screen\');\n    if (localStorage.getItem(\'push_active\') === \'true\') {\n      document.getElementById(\'notif-toggle\').checked = true;\n      document.getElementById(\'notif-desc\').textContent = \'Activees\';\n    }\n    loadData();\n    if (dataInterval) clearInterval(dataInterval);\n    dataInterval = setInterval(loadData, 30000);\n  }'
);

html = html.replace(
  'function loadData() {\n    return fetch',
  'function loadData() {\n    fetch'
);

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');