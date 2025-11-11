const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));


// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Importar rutas
const apiRoutes = require('./routes/api');
const trainingRoutes = require('./routes/training');
const dashboardRoutes = require('./routes/dashboard');
const chatbotsRoutes = require('./routes/chatbots');

// Importar rutas de funciones
const functionsRoutes = require('./routes/functions');
const quickPromptsRoutes = require('./routes/quickPrompts');
const usageRoutes = require('./routes/usage');

// Usar rutas
app.use('/api', apiRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chatbots', chatbotsRoutes);
app.use('/api/functions', functionsRoutes);
app.use('/api/quick-prompts', quickPromptsRoutes);
app.use('/api/usage', usageRoutes);

// Servir el widget
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-widget.js'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir landing page principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servir página de ejemplo
app.get('/example', (req, res) => {
  res.sendFile(path.join(__dirname, 'example.html'));
});

// Servir dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Servir widget preview
app.get('/widget-preview.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'widget-preview.html'));
});

// Servir archivos estáticos adicionales
app.use(express.static(__dirname));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});




// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
