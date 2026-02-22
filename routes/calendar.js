// ==========================================
// GOOGLE CALENDAR ROUTES
// ==========================================
const express = require('express');
const router = express.Router();
const CalendarService = require('../services/calendarService');
const { authMiddleware } = require('./auth');
const DatabaseService = require('../services/databaseService');

const calendarService = new CalendarService();
const db = new DatabaseService();

// ---- OAuth: Get authorization URL ----
router.get('/auth-url', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.query;
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId requerido' });
    }

    // Check plan
    const user = await db.getUserById(req.user.id);
    if (user && user.plan === 'starter') {
      return res.status(403).json({ error: 'Google Calendar requiere plan Pro o superior' });
    }

    // Verify chatbot ownership
    const chatbot = await db.getChatbot(chatbotId);
    if (!chatbot || chatbot.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso sobre este chatbot' });
    }

    const url = calendarService.getAuthUrl(chatbotId, req.user.id);
    if (!url) {
      return res.status(500).json({ error: 'Google Calendar no está configurado. Falta GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.' });
    }
    res.json({ url });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- OAuth: Callback ----
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect('/dashboard.html#calendar?error=missing_params');
    }

    const { chatbotId, userId } = JSON.parse(state);

    // Exchange code for tokens
    const { tokens, email } = await calendarService.handleCallback(code);

    // Save tokens and email
    await calendarService.saveTokens(chatbotId, tokens);
    await calendarService.saveCalendarInfo(chatbotId, email);

    // Save default config if none exists
    const existingConfig = await calendarService.getConfig(chatbotId);
    if (!existingConfig) {
      await calendarService.saveConfig(chatbotId, {
        schedule: {
          mon: { enabled: true, start: '09:00', end: '18:00' },
          tue: { enabled: true, start: '09:00', end: '18:00' },
          wed: { enabled: true, start: '09:00', end: '18:00' },
          thu: { enabled: true, start: '09:00', end: '18:00' },
          fri: { enabled: true, start: '09:00', end: '14:00' },
          sat: { enabled: false, start: '10:00', end: '14:00' },
          sun: { enabled: false, start: '10:00', end: '14:00' }
        },
        duration: 30,
        buffer: 10,
        advance: 2,
        maxDays: 30
      });
    }

    // Redirect to dashboard calendar page
    res.redirect('/dashboard.html?calendar=connected#calendar');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect('/dashboard.html#calendar?error=oauth_failed');
  }
});

// ---- Get calendar status ----
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.query;

    // Check plan
    const user = await db.getUserById(req.user.id);
    if (user && user.plan === 'starter') {
      return res.json({ connected: false, planBlocked: true });
    }

    if (!chatbotId) {
      // Try to get user's first chatbot
      const chatbots = await db.getChatbotsByUser(req.user.id);
      if (chatbots && chatbots.length > 0) {
        const status = await calendarService.getCalendarStatus(chatbots[0].id);
        return res.json(status);
      }
      return res.json({ connected: false });
    }

    const status = await calendarService.getCalendarStatus(chatbotId);
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Save calendar config ----
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { chatbotId, schedule, duration, buffer, advance, maxDays } = req.body;
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId requerido' });
    }

    // Verify ownership
    const chatbot = await db.getChatbot(chatbotId);
    if (!chatbot || chatbot.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await calendarService.saveConfig(chatbotId, {
      schedule, duration, buffer, advance, maxDays
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Get calendar config ----
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.query;
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId requerido' });
    }

    const config = await calendarService.getConfig(chatbotId);
    res.json({ config });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Check availability (public - for chatbot widget) ----
router.get('/availability', async (req, res) => {
  try {
    const { chatbotId, date } = req.query;
    if (!chatbotId || !date) {
      return res.status(400).json({ error: 'chatbotId y date requeridos' });
    }

    const availability = await calendarService.checkAvailability(chatbotId, date);
    res.json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Book appointment (public - for chatbot widget) ----
router.post('/book', async (req, res) => {
  try {
    const { chatbotId, startTime, name, email, phone, notes } = req.body;
    if (!chatbotId || !startTime || !name) {
      return res.status(400).json({ error: 'chatbotId, startTime y name son requeridos' });
    }

    const result = await calendarService.bookAppointment(chatbotId, {
      startTime, name, email, phone, notes
    });
    res.json(result);
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Get upcoming appointments ----
router.get('/appointments', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.query;
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId requerido' });
    }

    // Verify ownership
    const chatbot = await db.getChatbot(chatbotId);
    if (!chatbot || chatbot.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const appointments = await calendarService.getUpcomingAppointments(chatbotId);
    res.json({ appointments });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ error: error.message, appointments: [] });
  }
});

// ---- Disconnect Google Calendar ----
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.body;
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId requerido' });
    }

    // Verify ownership
    const chatbot = await db.getChatbot(chatbotId);
    if (!chatbot || chatbot.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await calendarService.disconnect(chatbotId);
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
