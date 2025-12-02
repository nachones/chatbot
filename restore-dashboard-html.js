const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the CSS links I added
content = content.replace('<link rel="stylesheet" href="/css/variables.css">', '');
content = content.replace('<link rel="stylesheet" href="/css/modern-reset.css">', '');

// Ensure dashboard.css is there
if (!content.includes('<link rel="stylesheet" href="/css/dashboard.css">')) {
    content = content.replace(
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">',
        '<link rel="stylesheet" href="/css/dashboard.css">\n    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">'
    );
}

// Clean up empty lines
content = content.replace(/^\s*[\r\n]/gm, '');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ dashboard.html restaurado (links CSS eliminados)!');
