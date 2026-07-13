const fs = require('fs');

const icon192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#faf9f6"/>
  <text x="68" y="110" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#1e3a5f" text-anchor="middle">AP</text>
  <text x="148" y="110" font-family="Georgia, serif" font-size="36" font-weight="400" fill="#2563eb" text-anchor="middle">/JR</text>
</svg>`;

const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#faf9f6"/>
  <text x="180" y="300" font-family="Georgia, serif" font-size="190" font-weight="700" fill="#1e3a5f" text-anchor="middle">AP</text>
  <text x="395" y="300" font-family="Georgia, serif" font-size="95" font-weight="400" fill="#2563eb" text-anchor="middle">/JR</text>
</svg>`;

fs.writeFileSync('dashboard/icon-192.svg', icon192);
fs.writeFileSync('dashboard/icon-512.svg', icon512);
console.log('OK');