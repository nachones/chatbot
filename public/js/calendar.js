// ==========================================
// GOOGLE CALENDAR INTEGRATION - Frontend
// ==========================================
(function () {
  'use strict';

  const API_URL = window.API_URL || '/api';

  function authFetch(url, opts = {}) {
    const token = localStorage.getItem('miabot_token');
    opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'Bearer ' + token;
    if (opts.body && typeof opts.body === 'string') {
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, opts);
  }

  function getChatbotId() {
    return window.dashboardApp ? window.dashboardApp.getCurrentChatbotId() : null;
  }

  // ---- Init page ----
  window.initCalendarPage = async function () {
    await checkCalendarStatus();
    bindEvents();
  };

  // ---- Check if Google Calendar is connected ----
  async function checkCalendarStatus() {
    try {
      const chatbotId = getChatbotId();
      const res = await authFetch(`${API_URL}/calendar/status${chatbotId ? '?chatbotId=' + chatbotId : ''}`);
      const data = await res.json();

      const notConnected = document.getElementById('calendar-not-connected');
      const connected = document.getElementById('calendar-connected');
      const planBlock = document.getElementById('calendar-plan-block');
      const connectSection = document.getElementById('calendar-connect-section');

      if (data.planBlocked) {
        // Plan starter — block
        notConnected.style.display = '';
        connected.style.display = 'none';
        planBlock.style.display = '';
        connectSection.style.display = 'none';
        return;
      }

      if (data.connected) {
        notConnected.style.display = 'none';
        connected.style.display = '';
        document.getElementById('calendar-email').textContent = data.email || '';
        loadCalendarConfig(data.config);
        loadUpcomingAppointments();
      } else {
        notConnected.style.display = '';
        connected.style.display = 'none';
        planBlock.style.display = 'none';
        connectSection.style.display = '';
      }
    } catch (err) {
      console.error('Error checking calendar status:', err);
    }
  }

  // ---- Bind UI events ----
  function bindEvents() {
    // Connect Google
    const btnConnect = document.getElementById('btn-connect-google');
    if (btnConnect) {
      btnConnect.onclick = connectGoogle;
    }

    // Disconnect
    const btnDisconnect = document.getElementById('btn-disconnect-google');
    if (btnDisconnect) {
      btnDisconnect.onclick = disconnectGoogle;
    }

    // Save config
    const btnSave = document.getElementById('btn-save-calendar-config');
    if (btnSave) {
      btnSave.onclick = saveCalendarConfig;
    }

    // Schedule day toggles
    document.querySelectorAll('.schedule-toggle input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', function () {
        const dayId = this.id.replace('day-', '');
        const startInput = document.getElementById('start-' + dayId);
        const endInput = document.getElementById('end-' + dayId);
        if (startInput) startInput.disabled = !this.checked;
        if (endInput) endInput.disabled = !this.checked;
      });
    });

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname + '#calendar');
      checkCalendarStatus();
    }
  }

  // ---- Connect Google Calendar (OAuth2) ----
  async function connectGoogle() {
    try {
      const chatbotId = getChatbotId();
      if (!chatbotId) { alert('Primero selecciona un chatbot.'); return; }
      const res = await authFetch(`${API_URL}/calendar/auth-url?chatbotId=${chatbotId}`);
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'No se pudo obtener la URL de autorización. Verifica que Google Calendar esté configurado.');
      }
    } catch (err) {
      console.error('Error connecting Google:', err);
      alert('Error al conectar con Google. Inténtalo de nuevo.');
    }
  }

  // ---- Disconnect ----
  async function disconnectGoogle() {
    if (!confirm('¿Seguro que quieres desconectar Google Calendar? El chatbot dejará de agendar citas.')) return;
    try {
      const chatbotId = getChatbotId();
      await authFetch(`${API_URL}/calendar/disconnect`, {
        method: 'POST',
        body: JSON.stringify({ chatbotId })
      });
      checkCalendarStatus();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }

  // ---- Load config into UI ----
  function loadCalendarConfig(config) {
    if (!config) return;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    days.forEach(day => {
      const cb = document.getElementById('day-' + day);
      const startInput = document.getElementById('start-' + day);
      const endInput = document.getElementById('end-' + day);
      if (config.schedule && config.schedule[day]) {
        if (cb) cb.checked = config.schedule[day].enabled;
        if (startInput) {
          startInput.value = config.schedule[day].start || '09:00';
          startInput.disabled = !config.schedule[day].enabled;
        }
        if (endInput) {
          endInput.value = config.schedule[day].end || '18:00';
          endInput.disabled = !config.schedule[day].enabled;
        }
      }
    });

    if (config.duration) {
      document.getElementById('appointment-duration').value = config.duration;
    }
    if (config.buffer !== undefined) {
      document.getElementById('appointment-buffer').value = config.buffer;
    }
    if (config.advance) {
      document.getElementById('appointment-advance').value = config.advance;
    }
    if (config.maxDays) {
      document.getElementById('appointment-max-days').value = config.maxDays;
    }
  }

  // ---- Save calendar config ----
  async function saveCalendarConfig() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const schedule = {};
    days.forEach(day => {
      const cb = document.getElementById('day-' + day);
      const startInput = document.getElementById('start-' + day);
      const endInput = document.getElementById('end-' + day);
      schedule[day] = {
        enabled: cb ? cb.checked : false,
        start: startInput ? startInput.value : '09:00',
        end: endInput ? endInput.value : '18:00'
      };
    });

    const config = {
      chatbotId: getChatbotId(),
      schedule,
      duration: parseInt(document.getElementById('appointment-duration').value),
      buffer: parseInt(document.getElementById('appointment-buffer').value),
      advance: parseInt(document.getElementById('appointment-advance').value),
      maxDays: parseInt(document.getElementById('appointment-max-days').value)
    };

    try {
      const res = await authFetch(`${API_URL}/calendar/config`, {
        method: 'POST',
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        const btn = document.getElementById('btn-save-calendar-config');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        btn.style.background = '#16a34a';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
      }
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Error guardando la configuración.');
    }
  }

  // ---- Load upcoming appointments ----
  async function loadUpcomingAppointments() {
    try {
      const chatbotId = getChatbotId();
      const res = await authFetch(`${API_URL}/calendar/appointments?chatbotId=${chatbotId}`);
      const data = await res.json();
      const container = document.getElementById('upcoming-appointments');

      if (!data.appointments || data.appointments.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-calendar-plus"></i>
            <p>No hay citas agendadas. Cuando un visitante agende a través del chatbot, aparecerán aquí.</p>
          </div>`;
        return;
      }

      container.innerHTML = data.appointments.map(apt => {
        const d = new Date(apt.start);
        const day = d.getDate();
        const month = d.toLocaleString('es', { month: 'short' });
        const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(apt.end).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="appointment-item">
            <div class="appointment-date">
              <div class="day">${day}</div>
              <div class="month">${month}</div>
            </div>
            <div class="appointment-info">
              <div class="time">${time} — ${endTime}</div>
              <div class="visitor">${apt.summary || 'Cita agendada'}</div>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
  }

})();
