const fs = require('fs');

// Read the file
const filePath = './public/dashboard.html';
let content = fs.readFileSync(filePath, 'utf8');

// Check if links are already updated
if (content.includes('variables.css')) {
    console.log('✅ Links CSS ya actualizados!');
    process.exit(0);
}

// Replace the dashboard.css link with the new sequence
content = content.replace(
    '<link rel="stylesheet" href="/css/dashboard.css">',
    `<link rel="stylesheet" href="/css/variables.css">
    <link rel="stylesheet" href="/css/modern-reset.css">
    <link rel="stylesheet" href="/css/dashboard.css">`
);

// Remove the previously added modern-reset.css link if it exists separately
content = content.replace(
    '<link rel="stylesheet" href="/css/modern-reset.css">',
    '' // Remove duplicate if it was added by previous script
);

// Clean up any double newlines created
content = content.replace(/\n\s*\n/g, '\n');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Links CSS actualizados exitosamente!');
