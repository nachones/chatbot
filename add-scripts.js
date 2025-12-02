const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Check if scripts are already added
if (content.includes('preview.js')) {
    console.log('✅ Los scripts ya están agregados!');
    process.exit(0);
}

// Add all script tags after dashboard.js
content = content.replace(
    '    <script src="/js/dashboard.js"></script>',
    `    <script src="/js/dashboard.js"></script>
    <script src="/js/training.js"></script>
    <script src="/js/integrations.js"></script>
    <script src="/js/preview.js"></script>`
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Scripts agregados exitosamente!');
console.log('   - training.js');
console.log('   - integrations.js');
console.log('   - preview.js');
