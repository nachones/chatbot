// Server entry point - Production Ready
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import security middleware
const { requestLogger } = require('./services/securityMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

console.log(`Inicializando servidor MIABOT (${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'})...\n`);

// Crear directorios necesarios
const requiredDirs = ['uploads', 'logs', 'training-data'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Directorio creado: ${dir}/`);
  }
});

// Stripe webhook needs raw body - must be before json middleware
try {
  const paymentsRoutes = require('./routes/payments');
  // Mount webhook FIRST with raw body parser
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    // Forward to payments router webhook handler
    req.url = '/webhook';
    paymentsRoutes(req, res, next);
  });
} catch (error) {
  console.error('⚠ Payments webhook pre-mount error:', error.message);
}

// Middleware básico
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile, curl, etc.) and allowed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Widget can be embedded anywhere
    }
  },
  credentials: true
}));

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT) || 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (production)
if (isProduction) {
  app.use(requestLogger);
}

app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas básicas
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>MIABOT Server</h1><p>El servidor está funcionando correctamente.</p>');
  }
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-widget.js'));
});

app.get('/example.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'example.html'));
});

// Cargar rutas con manejo de errores
console.log('\nCargando rutas...');

try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('✓ API routes cargadas');
} catch (error) {
  console.error('✗ Error cargando API routes:', error.message);
}

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✓ Auth routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Auth routes:', error.message);
}

try {
  const chatbotsRoutes = require('./routes/chatbots');
  app.use('/api/chatbots', chatbotsRoutes);
  console.log('✓ Chatbots routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Chatbots routes:', error.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✓ Dashboard routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Dashboard routes:', error.message);
}

try {
  const trainingRoutes = require('./routes/training');
  app.use('/api/training', trainingRoutes);
  console.log('✓ Training routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Training routes:', error.message);
}

try {
  const functionsRoutes = require('./routes/functions');
  app.use('/api/functions', functionsRoutes);
  console.log('✓ Functions routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Functions routes:', error.message);
}

try {
  const quickPromptsRoutes = require('./routes/quickPrompts');
  app.use('/api/quick-prompts', quickPromptsRoutes);
  console.log('✓ Quick Prompts routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Quick Prompts routes:', error.message);
}

try {
  const usageRoutes = require('./routes/usage');
  app.use('/api/usage', usageRoutes);
  console.log('✓ Usage routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Usage routes:', error.message);
}

try {
  const leadsRoutes = require('./routes/leads');
  app.use('/api/leads', leadsRoutes);
  console.log('✓ Leads routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Leads routes:', error.message);
}

try {
  const paymentsRoutes = require('./routes/payments');
  app.use('/api/payments', paymentsRoutes);
  console.log('✓ Payments routes cargadas');
} catch (error) {
  console.error('✗ Error cargando Payments routes:', error.message);
}

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en request:', err);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
console.log(`\nIniciando servidor en puerto ${PORT}...\n`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('✓ Servidor MIABOT ejecutándose correctamente');
  console.log(`  - http://localhost:${PORT}`);
  console.log(`  - http://127.0.0.1:${PORT}`);
  console.log(`  - PID: ${process.pid}\n`);
});

server.on('error', (error) => {
  console.error('✗ Error en servidor:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nRecibida se\u00f1al SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nRecibida se\u00f1al SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente.');
    process.exit(0);
  });
});

module.exports = app;
