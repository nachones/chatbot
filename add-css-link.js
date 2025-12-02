const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Check if link is already added
if (content.includes('modern-reset.css')) {
    console.log('✅ modern-reset.css ya está agregado!');
    process.exit(0);
}

// Add link after dashboard.css
content = content.replace(
    '<link rel="stylesheet" href="/css/dashboard.css">',
    '<link rel="stylesheet" href="/css/dashboard.css">\n    <link rel="stylesheet" href="/css/modern-reset.css">'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ modern-reset.css agregado exitosamente!');
