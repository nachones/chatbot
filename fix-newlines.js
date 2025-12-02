const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the literal `n characters
content = content.replace(/`n/g, '\r\n');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Saltos de línea corregidos!');
