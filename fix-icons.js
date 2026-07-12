const fs = require('fs');

// Icone 192x192
const icon192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#faf9f6"/>
  <text x="96" y="115" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#1e3a5f" text-anchor="middle">AP</text>
</svg>`;

// Icone 512x512
const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#faf9f6"/>
  <text x="256" y="310" font-family="Georgia, serif" font-size="200" font-weight="700" fill="#1e3a5f" text-anchor="middle">AP</text>
</svg>`;

fs.writeFileSync('dashboard/icon-192.svg', icon192);
fs.writeFileSync('dashboard/icon-512.svg', icon512);
console.log('OK - icones creees');