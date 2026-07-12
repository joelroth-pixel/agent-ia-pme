const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

// Remplace la carte notifications
html = html.replace(
  `    <div class="card">
      <h2>Notifications push</h2>
      <div class="toggle">
        <div>
          <div class="toggle-label">Alertes en temps reel</div>
          <div class="toggle-desc">Recevez une alerte meme quand l app est fermee</div>
          <div class="notif-status" id="notif-status">Notifications activees</div>
        </div>
        <button class="btn btn-small" onclick="activerNotifications()">Activer</button>
      </div>
    </div>`,
  `    <div class="card">
      <h2>Notifications push</h2>
      <div class="toggle">
        <div>
          <div class="toggle-label">Alertes en temps reel</div>
          <div class="toggle-desc" id="notif-desc">Activez pour recevoir des alertes quand l app est fermee</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="notif-toggle" onchange="toggleNotifications()">
          <span class="slider"></span>
        </label>
      </div>
    </div>`
);

// Remplace la fonction activerNotifications par toggleNotifications
html = html.replace(
  `  async function activerNotifications() {
    try {
      if (!('Notification' in window)) {
        alert('Votre navigateur ne supporte pas les notifications');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permission refusee. Activez les notifications dans les parametres.');
        return;
      }
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
      document.getElementById('notif-status').style.display = 'block';
      localStorage.setItem('push_active', 'true');
      console.log('Notifications push activees');
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur: ' + err.message);
    }
  }`,
  `  async function toggleNotifications() {
    const active = document.getElementById('notif-toggle').checked;
    if (active) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          document.getElementById('notif-toggle').checked = false;
          document.getElementById('notif-desc').textContent = 'Permission refusee - verifiez les parametres';
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const keyResp = await fetch('/dashboard/vapid-public-key');
        const { key } = await keyResp.json();
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        });
        await fetch('/dashboard/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
          body: JSON.stringify(sub)
        });
        localStorage.setItem('push_active', 'true');
        document.getElementById('notif-desc').textContent = 'Notifications activees';
      } catch (err) {
        document.getElementById('notif-toggle').checked = false;
        document.getElementById('notif-desc').textContent = 'Erreur : ' + err.message;
      }
    } else {
      localStorage.removeItem('push_active');
      document.getElementById('notif-desc').textContent = 'Activez pour recevoir des alertes quand l app est fermee';
    }
  }`
);

// Met a jour l etat au demarrage
html = html.replace(
  'if (localStorage.getItem("push_active") === "true") {\n    const btn = document.querySelector(\'[onclick="activerNotifications()"]\');\n    if (btn) { btn.textContent = "Active"; btn.style.background = "#22c55e"; btn.disabled = true; }\n    document.getElementById("notif-status").style.display = "block";\n  }',
  'if (localStorage.getItem("push_active") === "true") {\n    const toggle = document.getElementById("notif-toggle");\n    if (toggle) { toggle.checked = true; }\n    const desc = document.getElementById("notif-desc");\n    if (desc) desc.textContent = "Notifications activees";\n  }'
);

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');