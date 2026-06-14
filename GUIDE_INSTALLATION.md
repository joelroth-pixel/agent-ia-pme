# Guide d'installation — Agent IA WhatsApp pour PME

## Ce dont tu as besoin (tout est gratuit pour commencer)

| Outil | Pourquoi | Lien |
|-------|----------|------|
| Node.js | Faire tourner le code | nodejs.org |
| Compte Twilio | Envoyer/recevoir des WhatsApp | twilio.com |
| Clé API Anthropic | Le cerveau IA (Claude) | console.anthropic.com |
| Railway ou Render | Héberger le serveur en ligne | railway.app |
| ngrok (tests locaux) | Tester sur ton ordinateur d'abord | ngrok.com |

---

## Étape 1 — Installer Node.js

1. Va sur https://nodejs.org
2. Télécharge la version "LTS" (bouton vert)
3. Installe-la normalement (suivre les étapes)
4. Vérifie : ouvre un terminal et tape `node --version` → doit afficher v18 ou plus

---

## Étape 2 — Récupérer le code

Ouvre un terminal dans le dossier où tu veux installer le projet, puis :

```bash
# Installe les dépendances
npm install
```

---

## Étape 3 — Créer ton compte Twilio (WhatsApp)

1. Va sur https://twilio.com → "Sign up" (gratuit)
2. Dans le tableau de bord, note :
   - **Account SID** (commence par AC...)
   - **Auth Token** (clique pour révéler)
3. Va dans **Messaging → Try it out → Send a WhatsApp message**
4. Note le numéro sandbox : `+1 415 523 8886`
5. Envoie "join [ton-mot-clé]" depuis ton WhatsApp personnel pour activer le sandbox

---

## Étape 4 — Créer ta clé Anthropic

1. Va sur https://console.anthropic.com
2. Crée un compte → **API Keys → Create Key**
3. Copie la clé (commence par sk-ant-...)

---

## Étape 5 — Configurer le projet

1. Copie le fichier `.env.example` et renomme-le `.env`
2. Remplis les valeurs :

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx  ← depuis Twilio
TWILIO_AUTH_TOKEN=xxxxxxxx     ← depuis Twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  ← numéro sandbox Twilio
ANTHROPIC_API_KEY=sk-ant-xxx   ← depuis Anthropic
PORT=3000
```

---

## Étape 6 — Personnaliser pour ton client

Ouvre `config/client.json` et modifie :
- `name` : nom de l'entreprise
- `owner` : prénom du patron
- `whatsapp_number` : son vrai numéro WhatsApp (format +41...)
- `hours` : ses horaires réels
- `services` : ses prestations
- `pricing` : ses tarifs
- `faq` : ajoute les vraies questions qu'il reçoit souvent

---

## Étape 7 — Tester en local

### Terminal 1 — démarre le serveur :
```bash
npm start
```
Tu dois voir : `✅ Agent IA PME démarré sur le port 3000`

### Terminal 2 — expose le serveur sur internet (pour Twilio) :
```bash
# Installe ngrok : https://ngrok.com/download
ngrok http 3000
```
Copie l'URL générée, ex : `https://abc123.ngrok.io`

### Dans Twilio :
1. Va dans **Messaging → Settings → WhatsApp Sandbox Settings**
2. Dans "When a message comes in", colle : `https://abc123.ngrok.io/webhook`
3. Méthode : POST
4. Sauvegarde

### Test :
Envoie "Bonjour" depuis ton WhatsApp → tu dois recevoir une réponse de l'agent !

---

## Étape 8 — Mettre en production (Railway)

1. Va sur https://railway.app → "Start a new project"
2. Connecte ton dépôt GitHub (ou dépose les fichiers)
3. Railway détecte automatiquement Node.js
4. Dans **Variables**, ajoute les mêmes valeurs que dans ton `.env`
5. Railway te donne une URL publique, ex : `https://agent-ia-pme.up.railway.app`
6. Mets cette URL dans Twilio (remplace l'URL ngrok)

**Coût Railway : ~5$/mois** pour un petit projet.

---

## Étape 9 — Passer en production WhatsApp (quand tu as un vrai client)

Le sandbox Twilio est limité aux numéros qui ont rejoint manuellement.
Pour un vrai déploiement client :

1. Dans Twilio : **Messaging → Senders → WhatsApp Senders → Request Access**
2. Soumets ton cas d'usage (service client artisan)
3. Approbation en 1 à 5 jours ouvrables
4. Tu reçois un numéro dédié → mets-le dans `.env` à la place du sandbox

---

## Structure des fichiers

```
agent-ia-pme/
├── config/
│   └── client.json        ← À personnaliser pour chaque client
├── src/
│   ├── server.js          ← Serveur principal (ne pas toucher)
│   ├── agent.js           ← Logique IA (ne pas toucher)
│   ├── memory.js          ← Gestion des conversations (ne pas toucher)
│   └── whatsapp.js        ← Envoi des messages (ne pas toucher)
├── .env                   ← Tes clés secrètes (ne jamais partager)
├── .env.example           ← Modèle pour créer le .env
└── package.json           ← Dépendances Node.js
```

---

## Ajouter un 2ème client

1. Copie le dossier entier
2. Modifie uniquement `config/client.json`
3. Déploie un nouveau projet Railway
4. Configure un nouveau numéro WhatsApp Twilio

**Temps pour onboarder un nouveau client : 30 min.**

---

## Prix de revient par client/mois

| Poste | Coût |
|-------|------|
| Railway (hébergement) | ~5 $ |
| Twilio WhatsApp | ~0–10 $ selon volume |
| Claude API (Anthropic) | ~5–20 $ selon volume |
| **Total** | **~15–35 $** |

Tu factures 200–500 €. Marge brute : **85–92%**.
