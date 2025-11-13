(function() {
  'use strict';

  class ChatWidget {
    constructor(config) {
      this.config = {
        apiUrl: config.apiUrl || 'http://localhost:3000/api',
        apiKey: config.apiKey || '',
        position: config.position || 'bottom-right',
        theme: config.theme || 'default',
        title: config.title || 'Asistente Virtual',
        welcomeMessage: config.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?',
        ...config
      };
      
      this.sessionId = this.generateSessionId();
      this.isOpen = false;
      this.messages = [];
      this.quickPrompts = [];
      
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
          .chat-widget-container {
            position: fixed;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
          }

          .chat-widget-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .chat-widget-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 123, 255, 0.4);
          }

          .chat-widget-window {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
            display: none;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .chat-widget-window.open {
            display: flex;
          }

          .chat-widget-header {
            background: #007bff;
            color: white;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .chat-widget-title {
            font-weight: 600;
            font-size: 16px;
          }

          .chat-widget-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .chat-widget-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #f8f9fa;
          }

          .chat-widget-message {
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
          }

          .chat-widget-message.user {
            align-items: flex-end;
          }

          .chat-widget-message.bot {
            align-items: flex-start;
          }

          .chat-widget-message-content {
            max-width: 80%;
            padding: 10px 15px;
            border-radius: 18px;
            word-wrap: break-word;
          }

          .chat-widget-message.user .chat-widget-message-content {
            background: #007bff;
            color: white;
          }

          .chat-widget-message.bot .chat-widget-message-content {
            background: white;
            color: #333;
            border: 1px solid #e9ecef;
          }

          .chat-widget-input-container {
            padding: 15px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
            background: white;
          }

          .chat-widget-input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #ced4da;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
          }

          .chat-widget-input:focus {
            border-color: #007bff;
          }

          .chat-widget-send {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
          }

          .chat-widget-send:hover:not(:disabled) {
            background: #0056b3;
          }

          .chat-widget-send:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }

          .chat-widget-typing {
            display: none;
            padding: 10px 15px;
            color: #6c757d;
            font-style: italic;
          }

          .chat-widget-typing.show {
            display: block;
          }

          .chat-widget-prompts {
            padding: 12px 15px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .chat-widget-prompts.hidden {
            display: none;
          }

          .chat-widget-prompt-btn {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 16px;
            padding: 6px 12px;
            font-size: 13px;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-family: inherit;
          }

          .chat-widget-prompt-btn:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }

          @media (max-width: 480px) {
            .chat-widget-window {
              width: 100%;
              height: 100%;
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

    createWidget() {
      const container = document.createElement('div');
      container.className = 'chat-widget-container';
      container.innerHTML = `
        <button class="chat-widget-button" id="chat-widget-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        
        <div class="chat-widget-window" id="chat-widget-window">
          <div class="chat-widget-header">
            <div class="chat-widget-title">${this.config.title}</div>
            <button class="chat-widget-close" id="chat-widget-close">×</button>
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
            <button class="chat-widget-send" id="chat-widget-send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      const window = document.getElementById('chat-widget-window');
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
      const window = document.getElementById('chat-widget-window');
      const button = document.getElementById('chat-widget-button');
      
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
      
      // Focus en el input
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
      contentDiv.textContent = content;
      
      messageDiv.appendChild(contentDiv);
      messagesContainer.appendChild(messageDiv);
      
      // Scroll al último mensaje
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      this.messages.push({ content, role, timestamp: new Date().toISOString() });
    }

    async sendMessage() {
      const input = document.getElementById('chat-widget-input');
      const send = document.getElementById('chat-widget-send');
      const message = input.value.trim();
      
      if (!message) return;
      
      // Deshabilitar input y botón
      input.disabled = true;
      send.disabled = true;
      
      // Agregar mensaje del usuario
      this.addMessage(message, 'user');
      input.value = '';
      
      // Mostrar indicador de escritura
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
        // Ocultar indicador de escritura
        typing.classList.remove('show');
        
        // Habilitar input y botón
        input.disabled = false;
        send.disabled = false;
        input.focus();
      }
    }

    async loadQuickPrompts() {
      try {
        // Solo intentar cargar si hay un apiKey configurado
        if (!this.config.apiKey) {
          console.log('No API key configured, skipping quick prompts');
          return;
        }

        const response = await fetch(
          `${this.config.apiUrl}/quick-prompts?chatbotId=${this.config.apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.prompts && data.prompts.length > 0) {
            this.quickPrompts = data.prompts;
            this.renderQuickPrompts();
          } else {
            console.log('No quick prompts available for this chatbot');
          }
        } else if (response.status === 404) {
          console.log('Quick prompts endpoint not found or no prompts configured');
        } else if (response.status === 400) {
          console.log('Invalid chatbot ID for quick prompts');
        }
      } catch (error) {
        console.log('Quick prompts not available:', error.message);
        // No mostrar error al usuario, simplemente no cargar los prompts
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
            const input = document.getElementById('chat-widget-input');
            input.value = prompt.prompt;
            this.sendMessage(prompt.prompt);
          }
        });
        
        container.appendChild(button);
      });

      container.classList.remove('hidden');
    }
  }

  // Inicialización automática
  function initChatWidget() {
    const script = document.currentScript;
    const config = {
      apiUrl: script.getAttribute('data-api-url') || 'http://localhost:3000/api',
      apiKey: script.getAttribute('data-api-key') || '',
      position: script.getAttribute('data-position') || 'bottom-right',
      theme: script.getAttribute('data-theme') || 'default',
      title: script.getAttribute('data-title') || 'Asistente Virtual',
      welcomeMessage: script.getAttribute('data-welcome') || '¡Hola! ¿En qué puedo ayudarte?'
    };
    
    new ChatWidget(config);
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }

  // Exponer globalmente para uso manual
  window.ChatWidget = ChatWidget;
})();
