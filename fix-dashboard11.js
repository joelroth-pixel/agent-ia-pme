const fs = require('fs');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1e3a5f">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.svg">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="AP">
  <title>Assistant PME - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
    .header { background: #1e3a5f; color: white; padding: 20px; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .header p { font-size: 13px; opacity: 0.8; margin-top: 4px; }
    .back-btn { color: white; background: none; border: none; font-size: 24px; cursor: pointer; padding: 4px 8px; }
    .container { padding: 16px; max-width: 600px; margin: 0 auto; }
    .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { font-size: 14px; color: #64748b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat { text-align: center; }
    .stat .number { font-size: 32px; font-weight: 700; color: #1e3a5f; }
    .stat .label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .conv-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; margin-bottom: 8px; background: #f8fafc; cursor: pointer; border: 1px solid #e2e8f0; }
    .conv-item:hover { background: #f1f5f9; }
    .conv-left { display: flex; align-items: center; gap: 12px; }
    .conv-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; flex-shrink: 0; }
    .conv-avatar.normal { background: #64748b; }
    .conv-avatar.prospect { background: #22c55e; }
    .conv-avatar.urgence { background: #ef4444; }
    .conv-name { font-weight: 600; font-size: 14px; }
    .conv-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
    .conv-arrow { color: #94a3b8; font-size: 18px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-top: 4px; }
    .badge.prospect { background: #dcfce7; color: #16a34a; }
    .badge.urgence { background: #fee2e2; color: #dc2626; }
    .badge.normal { background: #f1f5f9; color: #64748b; }
    .msg-list { display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
    .msg.user { background: #1e3a5f; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
    .msg.assistant { background: #f1f5f9; color: #1e293b; align-self: flex-start; border-bottom-left-radius: 4px; }
    .msg-time { font-size: 10px; opacity: 0.6; margin-top: 4px; }
    .toggle { display: flex; align-items: center; justify-content: space-between; }
    .toggle-label { font-size: 15px; font-weight: 500; }
    .toggle-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
    .switch { position: relative; width: 52px; height: 28px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; border-radius: 28px; transition: 0.3s; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background: white; border-radius: 50%; transition: 0.3s; }
    input:checked + .slider { background: #1e3a5f; }
    input:checked + .slider:before { transform: translateX(24px); }
    .login { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .login .card { width: 100%; max-width: 360px; }
    .login h2 { font-size: 20px; font-weight: 700; margin-bottom: 20px; text-align: center; color: #1e293b; }
    .input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 15px; margin-bottom: 12px; outline: none; }
    .input:focus { border-color: #1e3a5f; }
    .btn { width: 100%; padding: 12px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
    .btn:hover { background: #162d4a; }
    .error { color: #ef4444; font-size: 13px; text-align: center; margin-bottom: 12px; }
    .refresh { font-size: 12px; color: #64748b; text-align: center; margin-top: 8px; }
    .empty { text-align: center; color: #94a3b8; font-size: 14px; padding: 20px 0; }
    .screen { display: none; }
    .screen.active { display: block; }
  </style>
</head>
<body>

<div id="login-screen" class="login">
  <div class="card">
    <h2>Assistant PME</h2>
    <input id="password-input" class="input" type="password" placeholder="Mot de passe" onkeypress="if(event.key==='Enter') login()">
    <div id="error-msg" class="error" style="display:none">Mot de passe incorrect</div>
    <button class="btn" onclick="login()">Se connecter</button>
  </div>
</div>

<div id="main-screen" class="screen">
  <div class="header">
    <div>
      <h1 id="business-name">Dashboard</h1>
      <p id="last-update">Chargement...</p>
    </div>
  </div>
  <div class="container">

    <div class="card">
      <h2>Cette semaine</h2>
      <div class="stats">
        <div class="stat">
          <div class="number" id="stat-messages">-</div>
          <div class="label">Messages</div>
        </div>
        <div class="stat">
          <div class="number" id="stat-prospects">-</div>
          <div class="label">Prospects</div>
        </div>
        <div class="stat">
          <div class="number" id="stat-urgences">-</div>
          <div class="label">Urgences</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Conversations recentes</h2>
      <div id="conv-list">
        <div class="empty">Aucune conversation</div>
      </div>
    </div>

    <div class="card">
      <h2>Notifications push</h2>
      <div class="toggle">
        <div>
          <div class="toggle-label">Alertes en temps reel</div>
          <div class="toggle-desc" id="notif-desc">Desactivees</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="notif-toggle" onchange="toggleNotifications()">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="card">
      <h2>Mode vacances</h2>
      <div class="toggle">
        <div>
          <div class="toggle-label">Activer le mode vacances</div>
          <div class="toggle-desc" id="vacances-desc">L agent repond normalement</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="vacances-toggle" onchange="toggleVacances()">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="refresh">Actualisation automatique toutes les 30 secondes</div>
  </div>
</div>

<div id="conv-screen" class="screen">
  <div class="header">
    <button class="back-btn" onclick="showMain()">&#8592;</button>
    <div>
      <h1 id="conv-title">Conversation</h1>
      <p id="conv-subtitle"></p>
    </div>
    <div style="width:40px"></div>
  </div>
  <div class="container">
    <div class="card">
      <div class="msg-list" id="msg-list"></div>
    </div>
  </div>
</div>

<script>
  const API_URL = '';
  let authToken = localStorage.getItem('dashboard_token') || '';
  let dataInterval = null;

  function login() {
    const pwd = document.getElementById('password-input').value;
    fetch(API_URL + '/dashboard/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    })
    .then(r => r.json())
    .then(data => {
      if (data.token) {
        authToken = data.token;
        localStorage.setItem('dashboard_token', authToken);
        showMain();
      } else {
        document.getElementById('error-msg').style.display = 'block';
      }
    })
    .catch(() => {
      document.getElementById('error-msg').style.display = 'block';
    });
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('login-screen').style.display = 'none';
  }

  function showMain() {
    showScreen('main-screen');
    if (localStorage.getItem('push_active') === 'true') {
      document.getElementById('notif-toggle').checked = true;
      document.getElementById('notif-desc').textContent = 'Activees';
    }
    loadData();
    if (dataInterval) clearInterval(dataInterval);
    dataInterval = setInterval(loadData, 30000);
  }

  function loadData() {
    return fetch(API_URL + '/dashboard/data', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
    .then(r => {
      if (r.status === 401) { logout(); return; }
      return r.json();
    })
    .then(data => {
      if (!data) return;
      document.getElementById('business-name').textContent = data.businessName || 'Dashboard';
      document.getElementById('stat-messages').textContent = data.stats.messages || 0;
      document.getElementById('stat-prospects').textContent = data.stats.prospects || 0;
      document.getElementById('stat-urgences').textContent = data.stats.urgences || 0;
      document.getElementById('last-update').textContent = 'Mis a jour : ' + new Date().toLocaleTimeString('fr-CH');

      const toggle = document.getElementById('vacances-toggle');
      toggle.checked = data.vacancesMode || false;
      document.getElementById('vacances-desc').textContent = data.vacancesMode ? 'Mode vacances actif' : 'L agent repond normalement';

      const convList = document.getElementById('conv-list');
      if (data.conversations && data.conversations.length > 0) {
        convList.innerHTML = data.conversations.map(c => {
          const initials = (c.name || 'I').charAt(0).toUpperCase();
          const date = new Date(c.lastMessage).toLocaleDateString('fr-CH');
          const badgeClass = c.status === 'prospect' ? 'prospect' : c.status === 'urgence' ? 'urgence' : 'normal';
          const badgeText = c.status === 'prospect' ? 'Prospect' : c.status === 'urgence' ? 'Urgence' : 'Normal';
          return '<div class="conv-item" onclick="showConversation(\'' + c.userId + '\', \'' + (c.name || 'Client') + '\', \'' + c.status + '\')">' +
            '<div class="conv-left">' +
            '<div class="conv-avatar ' + badgeClass + '">' + initials + '</div>' +
            '<div><div class="conv-name">' + (c.name || 'Client') + '</div>' +
            '<div class="conv-meta">' + c.userId + ' - ' + date + '</div>' +
            '<span class="badge ' + badgeClass + '">' + badgeText + '</span></div>' +
            '</div><div class="conv-arrow">&#8250;</div></div>';
        }).join('');
      } else {
        convList.innerHTML = '<div class="empty">Aucune conversation</div>';
      }
    })
    .catch(console.error);
  }

  function showConversation(userId, name, status) {
    if (dataInterval) clearInterval(dataInterval);
    document.getElementById('conv-title').textContent = name || 'Client';
    document.getElementById('conv-subtitle').textContent = userId;
    showScreen('conv-screen');

    fetch(API_URL + '/dashboard/conversation/' + encodeURIComponent(userId), {
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
    .then(r => r.json())
    .then(data => {
      const msgList = document.getElementById('msg-list');
      if (data.messages && data.messages.length > 0) {
        msgList.innerHTML = data.messages.map(m => {
          const time = new Date(m.timestamp).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
          return '<div class="msg ' + m.role + '">' + m.content + '<div class="msg-time">' + time + '</div></div>';
        }).join('');
        msgList.scrollTop = msgList.scrollHeight;
      } else {
        msgList.innerHTML = '<div class="empty">Aucun message</div>';
      }
    })
    .catch(console.error);
  }

  function toggleVacances() {
    const active = document.getElementById('vacances-toggle').checked;
    fetch(API_URL + '/dashboard/vacances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ active })
    })
    .then(r => r.json())
    .then(() => {
      document.getElementById('vacances-desc').textContent = active ? 'Mode vacances actif' : 'L agent repond normalement';
    });
  }

  async function toggleNotifications() {
    const active = document.getElementById('notif-toggle').checked;
    if (active) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          document.getElementById('notif-toggle').checked = false;
          document.getElementById('notif-desc').textContent = 'Permission refusee';
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
        document.getElementById('notif-desc').textContent = 'Activees';
      } catch (err) {
        document.getElementById('notif-toggle').checked = false;
        document.getElementById('notif-desc').textContent = 'Erreur activation';
      }
    } else {
      localStorage.removeItem('push_active');
      document.getElementById('notif-desc').textContent = 'Desactivees';
    }
  }

  function logout() {
    localStorage.removeItem('dashboard_token');
    authToken = '';
    document.getElementById('login-screen').style.display = 'flex';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  }

  if (authToken) showMain();
</script>

<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>

</body>
</html>`;

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');