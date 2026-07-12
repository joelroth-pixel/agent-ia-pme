const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

const pushScript = `
  async function activerNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      
      const reg = await navigator.serviceWorker.ready;
      const keyResp = await fetch('/dashboard/vapid-public-key');
      const { key } = await keyResp.json();
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key
      });
      
      await fetch('/dashboard/push-subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify(sub)
      });
      
      console.log('Notifications push activees');
    } catch (err) {
      console.error('Erreur notifications push:', err);
    }
  }`;

const pushButton = `
    <div class="card">
      <h2>Notifications</h2>
      <div class="toggle">
        <div>
          <div class="toggle-label">Notifications push</div>
          <div class="toggle-desc">Recevez une alerte meme quand l app est fermee</div>
        </div>
        <button class="btn" style="width:auto;padding:8px 16px;font-size:13px" onclick="activerNotifications()">Activer</button>
      </div>
    </div>`;

html = html.replace('    <div class="refresh"', pushScript + '\n    <div class="refresh"');
html = html.replace('    <div class="refresh"', pushButton + '\n    <div class="refresh"');

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');