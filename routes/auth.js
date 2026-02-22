const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/databaseService');
const emailService = require('../services/emailService');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no configurado en .env');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_EXPIRY = process.env.SESSION_EXPIRY || '7d';
const EMAIL_VERIFICATION_REQUIRED = process.env.EMAIL_VERIFICATION !== 'false'; // true por defecto

// Middleware to verify JWT token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticacion requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son obligatorios' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email no valido' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await db.createUser(userId, email.toLowerCase(), hashedPassword, name || '', company || '');

    // Email verification flow
    if (EMAIL_VERIFICATION_REQUIRED && emailService.configured) {
      const verificationToken = emailService.generateToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
      await db.setVerificationToken(userId, verificationToken, expires);
      await emailService.sendVerificationEmail(email.toLowerCase(), verificationToken, name);

      return res.json({
        success: true,
        requiresVerification: true,
        message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.'
      });
    }

    // Si no se requiere verificacion, login directo
    const token = jwt.sign(
      { id: userId, email: email.toLowerCase(), name: name || '' },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY }
    );

    res.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: name || '',
        company: company || '',
        plan: 'starter'
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// Verify email via token (GET - clicked from email link)
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect('/?verify=invalid');
    }

    const user = await db.verifyEmail(token);
    if (!user) {
      return res.redirect('/?verify=expired');
    }

    // Enviar email de bienvenida
    await emailService.sendWelcomeEmail(user.email, user.name);

    return res.redirect('/?verify=success');
  } catch (error) {
    console.error('Error verificando email:', error);
    return res.redirect('/?verify=error');
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const user = await db.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.json({ success: true, message: 'Si el email existe, se ha reenviado el enlace de verificacion' });
    }

    if (user.email_verified) {
      return res.json({ success: true, message: 'Tu email ya esta verificado. Puedes iniciar sesion.' });
    }

    const verificationToken = emailService.generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.setVerificationToken(user.id, verificationToken, expires);
    await emailService.sendVerificationEmail(user.email, verificationToken, user.name);

    res.json({ success: true, message: 'Si el email existe, se ha reenviado el enlace de verificacion' });
  } catch (error) {
    console.error('Error reenviando verificacion:', error);
    res.status(500).json({ error: 'Error al reenviar verificacion' });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const resetToken = emailService.generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
    const user = await db.setResetToken(email.toLowerCase(), resetToken, expires);

    if (user) {
      await emailService.sendPasswordResetEmail(email.toLowerCase(), resetToken, user.name);
    }

    // Siempre responder igual (no revelar si el email existe)
    res.json({ success: true, message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contrasena' });
  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// Reset password - apply new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token y contrasena son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.resetPassword(token, hashedPassword);

    if (!user) {
      return res.status(400).json({ error: 'El enlace ha expirado o no es valido. Solicita uno nuevo.' });
    }

    res.json({ success: true, message: 'Contrasena actualizada correctamente. Ya puedes iniciar sesion.' });
  } catch (error) {
    console.error('Error en reset password:', error);
    res.status(500).json({ error: 'Error al restablecer la contrasena' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena son obligatorios' });
    }

    // Find user
    const user = await db.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email o contrasena incorrectos' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta esta desactivada' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email o contrasena incorrectos' });
    }

    // Check email verification
    if (EMAIL_VERIFICATION_REQUIRED && emailService.configured && !user.email_verified) {
      return res.status(403).json({ 
        error: 'Debes verificar tu email antes de iniciar sesion. Revisa tu bandeja de entrada.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        plan: user.plan,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Verify token (used by dashboard to check if logged in)
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
