const fs = require('fs');
let h = fs.readFileSync('dashboard/index.html', 'utf8');

h = h.replace(
  "function toggleVac() {\n    const a = document.getElementById('vac-toggle').checked;\n    fetch('/dashboard/vacances',",
  "function toggleVac() {\n    const a = document.getElementById('vac-toggle').checked;\n    localStorage.setItem('vac', a ? '1' : '0');\n    fetch('/dashboard/vacances',"
);

h = h.replace(
  "    if (localStorage.getItem('push') === '1') {",
  "    if (localStorage.getItem('vac') === '1') {\n      document.getElementById('vac-toggle').checked = true;\n      document.getElementById('vac-desc').textContent = 'Mode vacances actif';\n    }\n    if (localStorage.getItem('push') === '1') {"
);

fs.writeFileSync('dashboard/index.html', h, 'utf8');
console.log('OK');