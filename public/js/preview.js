// Chatbot Preview for Appearance Page
(function () {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {
        initChatbotPreview();
    });

    function initChatbotPreview() {
        const appearancePage = document.getElementById('page-appearance');
        if (!appearancePage) return;

        const container = appearancePage.querySelector('.appearance-container-new');
        if (!container) return;

        // Wrap existing content in appearance-left div
        const existingContent = Array.from(container.children);
        const leftDiv = document.createElement('div');
        leftDiv.className = 'appearance-left';

        existingContent.forEach(child => {
            leftDiv.appendChild(child);
        });

        container.appendChild(leftDiv);

        // Create preview panel
        const previewDiv = createPreviewPanel();
        container.appendChild(previewDiv);

        // Initialize preview interactions
        initPreviewInteractions();
    }

    function createPreviewPanel() {
        const preview = document.createElement('div');
        preview.className = 'appearance-preview';
        preview.innerHTML = `
            <div class="browser-mockup">
                <div class="browser-header">
                    <div class="browser-dots">
                        <span class="dot red"></span>
                        <span class="dot yellow"></span>
                        <span class="dot green"></span>
                    </div>
                    <div class="browser-address-bar">
                        <i class="fas fa-lock"></i>
                        <span>tusitio.com</span>
                    </div>
                </div>
                <div class="browser-content">
                    <!-- Website Mockup -->
                    <div class="website-mockup">
                        <div class="mockup-header">
                            <div class="mockup-logo"></div>
                            <div class="mockup-nav">
                                <div class="mockup-nav-item"></div>
                                <div class="mockup-nav-item"></div>
                                <div class="mockup-nav-item"></div>
                            </div>
                        </div>
                        <div class="mockup-hero">
                            <div class="mockup-title"></div>
                            <div class="mockup-subtitle"></div>
                            <div class="mockup-button"></div>
                        </div>
                    </div>

                    <!-- Chatbot Widget -->
                    <div class="chatbot-preview-widget">
                        <button class="chat-bubble-btn" id="preview-chat-bubble">
                            <i class="fas fa-comment"></i>
                        </button>

                        <div class="chat-window" id="preview-chat-window">
                            <div class="chat-window-header">
                                <div class="chat-header-info">
                                    <div class="chat-avatar">
                                        <i class="fas fa-robot"></i>
                                    </div>
                                    <div class="chat-header-text">
                                        <h4 id="preview-chatbot-name">Mi Asistente</h4>
                                        <span class="chat-status">En línea</span>
                                    </div>
                                </div>
                                <button class="chat-close-btn" id="preview-chat-close">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="chat-window-messages" id="preview-messages">
                                <div class="preview-message bot">
                                    <div class="preview-message-avatar">
                                        <i class="fas fa-robot"></i>
                                    </div>
                                    <div class="preview-message-content">
                                        <div class="preview-message-bubble">
                                            ¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?
                                        </div>
                                    </div>
                                </div>
                                <div class="preview-message user">
                                    <div class="preview-message-content">
                                        <div class="preview-message-bubble">
                                            ¿Cuáles son vuestros horarios?
                                        </div>
                                    </div>
                                </div>
                                <div class="preview-message bot">
                                    <div class="preview-message-avatar">
                                        <i class="fas fa-robot"></i>
                                    </div>
                                    <div class="preview-message-content">
                                        <div class="preview-message-bubble">
                                            Estamos disponibles de lunes a viernes de 9:00 a 18:00. ¿Hay algo más en lo que pueda ayudarte? 😊
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="chat-window-input">
                                <input type="text" placeholder="Escribe tu mensaje..." class="chat-preview-input" id="preview-input">
                                <button class="chat-send-btn" id="preview-send">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                            <div class="chat-branding">
                                Powered by <strong>MIA BOT</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return preview;
    }

    function initPreviewInteractions() {
        // Toggle chat window
        const bubbleBtn = document.getElementById('preview-chat-bubble');
        const chatWindow = document.getElementById('preview-chat-window');
        const closeBtn = document.getElementById('preview-chat-close');

        if (bubbleBtn && chatWindow) {
            bubbleBtn.addEventListener('click', () => {
                chatWindow.classList.toggle('active');
            });
        }

        if (closeBtn && chatWindow) {
            closeBtn.addEventListener('click', () => {
                chatWindow.classList.remove('active');
            });
        }

        // Send message in preview
        const sendBtn = document.getElementById('preview-send');
        const input = document.getElementById('preview-input');
        const messagesContainer = document.getElementById('preview-messages');

        if (sendBtn && input && messagesContainer) {
            const sendMessage = () => {
                const text = input.value.trim();
                if (!text) return;

                // Add user message
                const userMsg = document.createElement('div');
                userMsg.className = 'preview-message user';
                userMsg.innerHTML = `
                    <div class="preview-message-content">
                        <div class="preview-message-bubble">${escapeHtml(text)}</div>
                    </div>
                `;
                messagesContainer.appendChild(userMsg);

                // Clear input
                input.value = '';

                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Simulate bot response
                setTimeout(() => {
                    const botMsg = document.createElement('div');
                    botMsg.className = 'preview-message bot';
                    botMsg.innerHTML = `
                        <div class="preview-message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="preview-message-content">
                            <div class="preview-message-bubble">
                                Gracias por tu mensaje. Esta es una vista previa del chatbot. 😊
                            </div>
                        </div>
                    `;
                    messagesContainer.appendChild(botMsg);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 1000);
            };

            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // Update preview when chatbot name changes
        const chatbotNameInput = document.getElementById('chatbot-name');
        const previewName = document.getElementById('preview-chatbot-name');

        if (chatbotNameInput && previewName) {
            chatbotNameInput.addEventListener('input', (e) => {
                const name = e.target.value.trim() || 'Mi Asistente';
                previewName.textContent = name;
            });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================
    // SAVE APPEARANCE SETTINGS
    // ========================================
    function initSaveAppearance() {
        const saveBtn = document.getElementById('save-appearance');
        if (!saveBtn) return;

        saveBtn.addEventListener('click', async () => {
            const app = window.dashboardApp;
            if (!app) return;

            const chatbotId = app.getCurrentChatbotId();
            if (!chatbotId) {
                app.showError('No hay chatbot seleccionado');
                return;
            }

            // Collect all appearance settings
            const settings = {
                // Content
                name: document.getElementById('chatbot-name')?.value?.trim() || 'Mi Asistente',
                welcome_message: document.getElementById('welcome-message')?.value?.trim() || '¡Hola! ¿En qué puedo ayudarte?',
                input_placeholder: document.getElementById('input-placeholder')?.value?.trim() || 'Escribe tu mensaje...',
                // Options
                display_prompts_vertical: document.getElementById('display-prompts-vertical')?.checked || false,
                hide_bot_avatar: document.getElementById('hide-bot-avatar')?.checked || false,
                hide_sources: document.getElementById('hide-sources')?.checked || false,
                hide_branding: document.getElementById('hide-branding')?.checked || false,
                // Colors
                primary_color: document.getElementById('primary-color-picker')?.value || '#6366F1',
                header_bg: document.getElementById('header-bg-picker')?.value || '#FFFFFF',
                header_font_color: document.getElementById('header-font-picker')?.value || '#111827',
                bot_bubble_bg: document.getElementById('bot-bubble-bg-picker')?.value,
                bot_bubble_font: document.getElementById('bot-bubble-font-picker')?.value,
                user_bubble_bg: document.getElementById('user-bubble-bg-picker')?.value,
                user_bubble_font: document.getElementById('user-bubble-font-picker')?.value,
                // Bubble
                bubble_icon: document.querySelector('.icon-option.active')?.dataset?.icon || 'comments',
                bubble_position: document.querySelector('input[name="bubble-position"]:checked')?.value || 'right',
                custom_css: document.getElementById('custom-bubble-css')?.value || ''
            };

            // Visual feedback: show loading state
            const originalHTML = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.7';

            try {
                const response = await (app.authFetch || fetch)(`/api/chatbots/${chatbotId}/appearance`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });

                const data = await response.json();

                if (data.success) {
                    // Also update chatbot name via main endpoint
                    await (app.authFetch || fetch)(`/api/chatbots/${chatbotId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: settings.name,
                            welcome_message: settings.welcome_message
                        })
                    });

                    // Success feedback
                    saveBtn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
                    saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    saveBtn.style.opacity = '1';
                    app.showSuccess('Apariencia guardada correctamente');

                    // Update chatbot name in sidebar
                    const nameEl = document.getElementById('current-chatbot-name');
                    if (nameEl) nameEl.textContent = settings.name;

                    // Reset button after 2 seconds
                    setTimeout(() => {
                        saveBtn.innerHTML = originalHTML;
                        saveBtn.style.background = '';
                        saveBtn.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Error desconocido');
                }
            } catch (error) {
                console.error('Error saving appearance:', error);
                saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                saveBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                saveBtn.style.opacity = '1';
                app.showError('Error al guardar: ' + error.message);

                setTimeout(() => {
                    saveBtn.innerHTML = originalHTML;
                    saveBtn.style.background = '';
                    saveBtn.disabled = false;
                }, 2500);
            }
        });
    }

    // Initialize save button when DOM is ready
    document.addEventListener('DOMContentLoaded', initSaveAppearance);

})();
