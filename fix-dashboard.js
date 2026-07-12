const fs = require('fs');

let html = fs.readFileSync('dashboard/index.html', 'utf8');

html = html
  .replace("L agent repond normalement", "L'agent répond normalement")
  .replace("Mode vacances actif", "Mode vacances actif")
  .replace("Aucune alerte cette semaine", "Aucune alerte cette semaine")
  .replace("Actualisation automatique toutes les 30 secondes", "Actualisation automatique toutes les 30 secondes")
  .replace("'Mis a jour : '", "'Mis à jour : '")
  .replace("'L agent repond normalement'", "'L\\'agent répond normalement'")
  .replace("'Mode vacances actif'", "'Mode vacances actif'")
  .replace("Mot de passe", "Mot de passe")
  .replace("Se connecter", "Se connecter")
  .replace("Mot de passe incorrect", "Mot de passe incorrect")
  .replace("Non autorise", "Non autorisé")
  .replace("Chargement...", "Chargement...")
  .replace("Cette semaine", "Cette semaine")
  .replace("Alertes recentes", "Alertes récentes")
  .replace("Mode vacances", "Mode vacances")
  .replace("Activer le mode vacances", "Activer le mode vacances");

fs.writeFileSync('dashboard/index.html', html, 'utf8');
console.log('OK');