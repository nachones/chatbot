// ==========================================
// GOOGLE CALENDAR SERVICE
// ==========================================
const { google } = require('googleapis');
const db = require('./databaseService');
const logger = require('./logger');

class CalendarService {
  constructor() {
    this.db = db;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'https://app.micopiloto.es'}/api/calendar/callback`;
  }

  // Create OAuth2 client instance
  _createOAuth2Client() {
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  // Create authenticated OAuth2 client for a chatbot
  async _getAuthClient(chatbotId) {
    const tokens = await this.getTokens(chatbotId);
    if (!tokens) throw new Error('Google Calendar no conectado');

    const oauth2Client = this._createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Auto-refresh token
    oauth2Client.on('tokens', async (newTokens) => {
      logger.info('Tokens de Google Calendar refrescados para chatbot:', chatbotId);
      await this.saveTokens(chatbotId, {
        ...tokens,
        ...newTokens
      });
    });

    return oauth2Client;
  }

  // ---- OAuth Flow ----

  getAuthUrl(chatbotId, userId) {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }
    const oauth2Client = this._createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: JSON.stringify({ chatbotId, userId })
    });
  }

  async handleCallback(code) {
    const oauth2Client = this._createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    return { tokens, email };
  }

  // ---- Token Storage (DB) ----

  async saveTokens(chatbotId, tokens) {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        `INSERT OR REPLACE INTO calendar_connections (chatbot_id, tokens, updated_at)
         VALUES (?, ?, datetime('now'))`,
        [chatbotId, JSON.stringify(tokens)],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  async getTokens(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT tokens FROM calendar_connections WHERE chatbot_id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.tokens) : null);
        }
      );
    });
  }

  async saveCalendarInfo(chatbotId, email) {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        `UPDATE calendar_connections SET calendar_email = ? WHERE chatbot_id = ?`,
        [email, chatbotId],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  async getCalendarStatus(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT calendar_email, config FROM calendar_connections WHERE chatbot_id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? {
            connected: true,
            email: row.calendar_email,
            config: row.config ? JSON.parse(row.config) : null
          } : { connected: false });
        }
      );
    });
  }

  async saveConfig(chatbotId, config) {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        `UPDATE calendar_connections SET config = ?, updated_at = datetime('now') WHERE chatbot_id = ?`,
        [JSON.stringify(config), chatbotId],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  async getConfig(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.db.get(
        'SELECT config FROM calendar_connections WHERE chatbot_id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row && row.config ? JSON.parse(row.config) : null);
        }
      );
    });
  }

  async disconnect(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.db.run(
        'DELETE FROM calendar_connections WHERE chatbot_id = ?',
        [chatbotId],
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  // ---- Calendar Operations ----

  // Check availability using freebusy API
  async checkAvailability(chatbotId, dateStr) {
    const auth = await this._getAuthClient(chatbotId);
    const calendar = google.calendar({ version: 'v3', auth });
    const config = await this.getConfig(chatbotId);

    if (!config) throw new Error('Configuración de calendario no encontrada');

    // Parse date
    const date = new Date(dateStr);
    const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const dayConfig = config.schedule[dayOfWeek];

    if (!dayConfig || !dayConfig.enabled) {
      return { available: false, slots: [], reason: 'Día no disponible' };
    }

    // Build time range for the day
    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(endH, endM, 0, 0);

    // Query freebusy
    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: 'primary' }]
      }
    });

    const busySlots = freeBusyRes.data.calendars.primary.busy || [];

    // Generate available slots
    const duration = config.duration || 30; // minutes
    const buffer = config.buffer || 0;
    const slots = [];
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      if (slotEnd > dayEnd) break;

      // Check if slot conflicts with any busy period
      const isBusy = busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return current < busyEnd && slotEnd > busyStart;
      });

      // Also check minimum advance time
      const now = new Date();
      const minAdvance = (config.advance || 2) * 3600000; // hours to ms
      const hasEnoughAdvance = current.getTime() - now.getTime() >= minAdvance;

      if (!isBusy && hasEnoughAdvance) {
        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          display: current.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) +
            ' — ' + slotEnd.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        });
      }

      // Move to next slot (duration + buffer)
      current = new Date(current.getTime() + (duration + buffer) * 60000);
    }

    return {
      available: slots.length > 0,
      slots,
      date: dateStr,
      day: dayOfWeek
    };
  }

  // Book an appointment
  async bookAppointment(chatbotId, { startTime, name, email, phone, notes }) {
    const auth = await this._getAuthClient(chatbotId);
    const calendar = google.calendar({ version: 'v3', auth });
    const config = await this.getConfig(chatbotId);
    const duration = config?.duration || 30;

    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    const event = {
      summary: `Cita: ${name || 'Visitante web'}`,
      description: [
        notes ? `Notas: ${notes}` : '',
        email ? `Email: ${email}` : '',
        phone ? `Teléfono: ${phone}` : '',
        'Agendado automáticamente por MIABOT'
      ].filter(Boolean).join('\n'),
      start: {
        dateTime: start.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      attendees: email ? [{ email }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      }
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: email ? 'all' : 'none'
    });

    return {
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
      start: result.data.start.dateTime,
      end: result.data.end.dateTime,
      summary: result.data.summary
    };
  }

  // Get upcoming appointments (for dashboard)
  async getUpcomingAppointments(chatbotId, maxResults = 20) {
    const auth = await this._getAuthClient(chatbotId);
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
      q: 'MIABOT' // Filter events created by our system
    });

    return (res.data.items || []).map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      attendees: (event.attendees || []).map(a => a.email),
      htmlLink: event.htmlLink
    }));
  }

  // ---- Function Calling Tools (for chatbot integration) ----

  // Returns the tool definitions to inject into LLM calls
  static getCalendarTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'check_calendar_availability',
          description: 'Consulta los horarios disponibles para agendar una cita en una fecha específica. Usa esta función cuando el usuario quiera saber qué horarios hay disponibles o quiera agendar una cita.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Fecha en formato YYYY-MM-DD para consultar disponibilidad'
              }
            },
            required: ['date']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_calendar_appointment',
          description: 'Agenda una cita en el calendario en el horario seleccionado. Usa esta función cuando el usuario confirme que quiere reservar un horario específico. Necesitas el nombre del cliente y opcionalmente su email y teléfono.',
          parameters: {
            type: 'object',
            properties: {
              startTime: {
                type: 'string',
                description: 'Hora de inicio de la cita en formato ISO 8601 (ej: 2025-01-15T10:00:00)'
              },
              name: {
                type: 'string',
                description: 'Nombre completo del cliente'
              },
              email: {
                type: 'string',
                description: 'Email del cliente (opcional, para enviar confirmación)'
              },
              phone: {
                type: 'string',
                description: 'Teléfono del cliente (opcional)'
              },
              notes: {
                type: 'string',
                description: 'Notas adicionales sobre la cita (opcional)'
              }
            },
            required: ['startTime', 'name']
          }
        }
      }
    ];
  }

  // Execute a calendar tool call (called from chatbotService)
  async executeCalendarTool(chatbotId, functionName, args) {
    switch (functionName) {
      case 'check_calendar_availability':
        return await this.checkAvailability(chatbotId, args.date);
      case 'book_calendar_appointment':
        return await this.bookAppointment(chatbotId, args);
      default:
        throw new Error('Función de calendario no reconocida: ' + functionName);
    }
  }

  // Check if a chatbot has calendar connected
  async isConnected(chatbotId) {
    const tokens = await this.getTokens(chatbotId);
    return !!tokens;
  }
}

module.exports = CalendarService;
