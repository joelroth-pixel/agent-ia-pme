const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

html = html.replace(
  'function showDashboard() {\n    document.getElementById(\'login-screen\').style.display = \'none\';\n    document.getElementById(\'dashboard\').style.display = \'block\';\n    loadData();\n    setInterval(loadData, 30000);\n    if (localStorage.getItem(\'push_active\') === \'true\') {\n      document.getElementById(\'notif-toggle\').checked = true;\n      document.getElementById(\'notif-desc\').textContent = \'Activees\';\n    }\n  }',
  'function showDashboard() {\n    document.getElementById(\'login-screen\').style.display = \'none\';\n    if (localStorage.getItem(\'push_active\') === \'true\') {\n      document.getElementById(\'notif-toggle\').checked = true;\n      document.getElementById(\'notif-desc\').textContent = \'Activees\';\n    }\n    loadData().then(() => {\n      document.getElementById(\'dashboard\').style.display = \'block\';\n      setInterval(loadData, 30000);\n    });\n  }'
);

html = html.replace(
  'function loadData() {\n    fetch(API_URL + \'/dashboard/data\'',
  'function loadData() {\n    return fetch(API_URL + \'/dashboard/data\''
);

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');