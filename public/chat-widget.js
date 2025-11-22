(function () {
  'use strict';

  // Cargar marked.js para soporte Markdown
  const markedScript = document.createElement('script');
  markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
  document.head.appendChild(markedScript);

  class ChatWidget {
    constructor(config) {
      this.config = {
        apiUrl: config.apiUrl || 'http://localhost:3000/api',
        apiKey: config.apiKey || '',
        position: config.position || 'bottom-right',
        theme: config.theme || 'default',
        title: config.title || 'Asistente Virtual',
        welcomeMessage: config.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?',
        primaryColor: config.primaryColor || '#007bff',
        ...config
      };

      this.sessionId = this.generateSessionId();
      this.isOpen = false;
      this.messages = [];
      this.quickPrompts = [];

      // Esperar a que marked cargue antes de inicializar si es posible, 
      // pero no bloquear la UI
      this.init();
    }

    init() {
      this.createStyles();
      this.createWidget();
      this.bindEvents();
      this.loadQuickPrompts();
    }

    generateSessionId() {
      return 'widget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createStyles() {
      if (document.getElementById('chat-widget-styles')) return;

      const styles = `
        <style id="chat-widget-styles">
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

          .chat-widget-container {
            position: fixed;
            z-index: 10000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            --primary-color: ${this.config.primaryColor};
          }

          /* Botón flotante */
          .chat-widget-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--primary-color);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            z-index: 10002;
          }

          .chat-widget-button:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          }

          .chat-widget-button.hidden {
            transform: scale(0) rotate(90deg);
            opacity: 0;
            pointer-events: none;
          }

          /* Ventana del chat */
          .chat-widget-window {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 110px);
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            z-index: 10001;
            border: 1px solid rgba(0,0,0,0.05);
          }

          .chat-widget-window.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
          }

          /* Header */
          .chat-widget-header {
            background: var(--primary-color);
            background: linear-gradient(135deg, var(--primary-color), ${this.adjustColor(this.config.primaryColor, -20)});
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          .chat-widget-title {
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.3px;
          }

          .chat-widget-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 20px;
            line-height: 1;
          }

          .chat-widget-close:hover {
            background: rgba(255,255,255,0.3);
          }

          /* Área de mensajes */
          .chat-widget-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
            scroll-behavior: smooth;
          }

          .chat-widget-messages::-webkit-scrollbar {
            width: 6px;
          }
          
          .chat-widget-messages::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .chat-widget-messages::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 3px;
          }

          .chat-widget-message {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            animation: fadeIn 0.3s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .chat-widget-message.user {
            align-items: flex-end;
          }

          .chat-widget-message.bot {
            align-items: flex-start;
          }

          .chat-widget-message-content {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            font-size: 14px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }

          .chat-widget-message.user .chat-widget-message-content {
            background: var(--primary-color);
            color: white;
            border-bottom-right-radius: 4px;
          }

          .chat-widget-message.bot .chat-widget-message-content {
            background: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-bottom-left-radius: 4px;
          }

          /* Markdown Styles */
          .chat-widget-message-content p { margin: 0 0 8px 0; }
          .chat-widget-message-content p:last-child { margin: 0; }
          .chat-widget-message-content ul, .chat-widget-message-content ol { margin: 8px 0; padding-left: 20px; }
          .chat-widget-message-content code { 
            background: rgba(0,0,0,0.1); 
            padding: 2px 4px; 
            border-radius: 4px; 
            font-family: monospace;
            font-size: 0.9em;
          }
          .chat-widget-message.user .chat-widget-message-content code {
            background: rgba(255,255,255,0.2);
          }
          .chat-widget-message-content pre {
            background: #1f2937;
            color: #f3f4f6;
            padding: 10px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 8px 0;
          }
          .chat-widget-message-content pre code {
            background: transparent;
            color: inherit;
            padding: 0;
          }
          .chat-widget-message-content a {
            color: #007bff;
            text-decoration: none;
          }
          .chat-widget-message.user .chat-widget-message-content a {
            color: white;
            text-decoration: underline;
          }

          /* Input Area */
          .chat-widget-input-container {
            padding: 15px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
            background: white;
            align-items: center;
          }

          .chat-widget-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.2s;
            background: #f9fafb;
          }

          .chat-widget-input:focus {
            border-color: var(--primary-color);
            background: white;
          }

          .chat-widget-send {
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 42px;
            height: 42px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
          }

          .chat-widget-send:hover:not(:disabled) {
            transform: scale(1.05);
            filter: brightness(1.1);
          }

          .chat-widget-send:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
          }

          /* Typing Indicator */
          .chat-widget-typing {
            display: none;
            padding: 10px 20px;
            color: #6b7280;
            font-size: 12px;
            font-style: italic;
          }

          .chat-widget-typing.show {
            display: block;
            animation: pulse 1.5s infinite;
          }
          
          @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }

          /* Quick Prompts */
          .chat-widget-prompts {
            padding: 12px 15px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            max-height: 120px;
            overflow-y: auto;
          }

          .chat-widget-prompts.hidden {
            display: none;
          }

          .chat-widget-prompt-btn {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 6px 12px;
            font-size: 13px;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-family: inherit;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }

          .chat-widget-prompt-btn:hover {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
          }

          /* Responsive */
          @media (max-width: 480px) {
            .chat-widget-window {
              width: 100%;
              height: 100%;
              max-height: 100%;
              bottom: 0;
              right: 0;
              border-radius: 0;
            }
            
            .chat-widget-button {
              bottom: 15px;
              right: 15px;
            }
          }
        </style>
      `;

      document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Helper para oscurecer colores
    adjustColor(color, amount) {
      return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = 'chat-widget-container';
      container.innerHTML = `
        <button class="chat-widget-button" id="chat-widget-button" aria-label="Abrir chat">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        
        <div class="chat-widget-window" id="chat-widget-window">
          <div class="chat-widget-header">
            <div class="chat-widget-title">${this.config.title}</div>
            <button class="chat-widget-close" id="chat-widget-close" aria-label="Cerrar chat">×</button>
          </div>
          
          <div class="chat-widget-messages" id="chat-widget-messages">
            <div class="chat-widget-message bot">
              <div class="chat-widget-message-content">${this.config.welcomeMessage}</div>
            </div>
          </div>
          
          <div class="chat-widget-typing" id="chat-widget-typing">
            Escribiendo...
          </div>
          
          <div class="chat-widget-prompts hidden" id="chat-widget-prompts"></div>
          
          <div class="chat-widget-input-container">
            <input type="text" class="chat-widget-input" id="chat-widget-input" 
                   placeholder="Escribe tu mensaje..." maxlength="500">
            <button class="chat-widget-send" id="chat-widget-send" aria-label="Enviar mensaje">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    bindEvents() {
      const button = document.getElementById('chat-widget-button');
      const close = document.getElementById('chat-widget-close');
      const input = document.getElementById('chat-widget-input');
      const send = document.getElementById('chat-widget-send');

      button.addEventListener('click', () => this.toggle());
      close.addEventListener('click', () => this.close());
      send.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      const window = document.getElementById('chat-widget-window');
      const button = document.getElementById('chat-widget-button');

      window.classList.add('open');
      button.classList.add('hidden');
      this.isOpen = true;

      setTimeout(() => {
        document.getElementById('chat-widget-input').focus();
      }, 300);
    }

    close() {
      const window = document.getElementById('chat-widget-window');
      const button = document.getElementById('chat-widget-button');

      window.classList.remove('open');
      button.classList.remove('hidden');
      this.isOpen = false;
    }

    addMessage(content, role) {
      const messagesContainer = document.getElementById('chat-widget-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-widget-message ${role}`;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'chat-widget-message-content';

      // Renderizar Markdown si es mensaje del bot y marked está disponible
      if (role === 'bot' && typeof marked !== 'undefined') {
        try {
          contentDiv.innerHTML = marked.parse(content);
        } catch (e) {
          console.warn('Error parsing markdown:', e);
          contentDiv.textContent = content;
        }
      } else {
        contentDiv.textContent = content;
      }

      messageDiv.appendChild(contentDiv);
      messagesContainer.appendChild(messageDiv);

      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.messages.push({ content, role, timestamp: new Date().toISOString() });
    }

    async sendMessage(text = null) {
      const input = document.getElementById('chat-widget-input');
      const send = document.getElementById('chat-widget-send');
      const message = text || input.value.trim();

      if (!message) return;

      input.disabled = true;
      send.disabled = true;

      this.addMessage(message, 'user');
      if (!text) input.value = '';

      const typing = document.getElementById('chat-widget-typing');
      typing.classList.add('show');

      try {
        const response = await fetch(`${this.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            message: message,
            sessionId: this.sessionId
          })
        });

        const data = await response.json();

        if (data.success) {
          this.addMessage(data.response, 'bot');
        } else {
          this.addMessage('Lo siento, ocurrió un error al procesar tu mensaje.', 'bot');
        }
      } catch (error) {
        console.error('Error:', error);
        this.addMessage('Lo siento, no puedo conectarme al servidor.', 'bot');
      } finally {
        typing.classList.remove('show');
        input.disabled = false;
        send.disabled = false;
        input.focus();
      }
    }

    async loadQuickPrompts() {
      try {
        if (!this.config.apiKey) return;

        const response = await fetch(
          `${this.config.apiUrl}/quick-prompts?chatbotId=${this.config.apiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.prompts && data.prompts.length > 0) {
            this.quickPrompts = data.prompts;
            this.renderQuickPrompts();
          }
        }
      } catch (error) {
        console.log('Quick prompts not available');
      }
    }

    renderQuickPrompts() {
      const container = document.getElementById('chat-widget-prompts');
      if (!container || this.quickPrompts.length === 0) return;

      container.innerHTML = '';

      this.quickPrompts.forEach(prompt => {
        const button = document.createElement('button');
        button.className = 'chat-widget-prompt-btn';
        button.textContent = prompt.button_title;

        button.addEventListener('click', () => {
          if (prompt.link) {
            window.open(prompt.link, '_blank');
          } else if (prompt.prompt) {
            this.sendMessage(prompt.prompt);
          }
        });

        container.appendChild(button);
      });

      container.classList.remove('hidden');
    }
  }

  function initChatWidget() {
    // Intentar obtener el script actual o buscarlo por ID/src
    let script = document.currentScript;

    if (!script) {
      script = document.querySelector('script[src*="chat-widget.js"]') ||
        document.querySelector('script[id="chat-widget-script"]');
    }

    // Configuración por defecto si no se encuentra el script (caso raro)
    const config = {
      apiUrl: 'http://localhost:3000/api',
      apiKey: '',
      position: 'bottom-right',
      theme: 'default',
      title: 'Asistente Virtual',
      welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
      primaryColor: '#007bff'
    };

    if (script) {
      config.apiUrl = script.getAttribute('data-api-url') || config.apiUrl;
      config.apiKey = script.getAttribute('data-api-key') || config.apiKey;
      config.position = script.getAttribute('data-position') || config.position;
      config.theme = script.getAttribute('data-theme') || config.theme;
      config.title = script.getAttribute('data-title') || config.title;
      config.welcomeMessage = script.getAttribute('data-welcome') || config.welcomeMessage;
      config.primaryColor = script.getAttribute('data-primary-color') || config.primaryColor;
    }

    // Evitar múltiples instancias
    if (window.chatWidgetInstance) return;
    window.chatWidgetInstance = new ChatWidget(config);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }

  window.ChatWidget = ChatWidget;
})();
