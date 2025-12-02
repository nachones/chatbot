const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Add the script tag after dashboard.js
content = content.replace(
    '<script src="/js/dashboard.js"></script>',
    '<script src="/js/dashboard.js"></script>\r\n    <script src="/js/preview.js"></script>'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Script preview.js agregado exitosamente!');
