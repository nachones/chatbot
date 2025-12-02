const fs = require('fs');

// Read the file
const filePath = './public/css/dashboard.css';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove :root block (it's in variables.css)
content = content.replace(/:root\s*{[^}]*}/s, '/* Variables moved to variables.css */');

// 2. Remove base styles (*, body) - simplistic regex, might need adjustment
content = content.replace(/\*\s*{[^}]*}/s, '/* Base reset moved to modern-reset.css */');
content = content.replace(/body\s*{[^}]*}/s, '/* Body styles moved to modern-reset.css */');

// 3. Remove .btn-primary and .btn-secondary definitions to let modern-reset.css take over
// We need to be careful not to remove specific overrides if they are needed, 
// but for consistency we want the base styles.
// Let's comment them out instead of removing to be safe.
content = content.replace(/\.btn-primary\s*{[^}]*}/g, '/* .btn-primary moved to modern-reset.css */');
content = content.replace(/\.btn-secondary\s*{[^}]*}/g, '/* .btn-secondary moved to modern-reset.css */');
content = content.replace(/\.btn-primary:hover\s*{[^}]*}/g, '/* .btn-primary:hover moved to modern-reset.css */');
content = content.replace(/\.btn-secondary:hover\s*{[^}]*}/g, '/* .btn-secondary:hover moved to modern-reset.css */');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ dashboard.css limpiado exitosamente!');
