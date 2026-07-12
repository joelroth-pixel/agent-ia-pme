const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

const metaTags = `  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.svg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="AP">`;

html = html.replace('<meta name="theme-color" content="#2563eb">', '<meta name="theme-color" content="#1e3a5f">\n' + metaTags);

// Ajoute le service worker
const swScript = `
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('Service Worker enregistre');
    });
  }
</script>`;

html = html.replace('</body>', swScript + '\n</body>');

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');