// Chatbot Preview for Appearance Page - Real-time preview + Load/Save
(function () {
    'use strict';

    // ========================================
    // INITIALIZATION
    // ========================================
    document.addEventListener('DOMContentLoaded', function () {
        initPreviewInteractions();
        initSaveAppearance();
    });

    // ========================================
    // REAL-TIME PREVIEW INTERACTIONS
    // ========================================
    function initPreviewInteractions() {
        // --- Content Tab ---
        bindInput('chatbot-name', (val) => {
            setText('preview-bot-name', val || 'Mi Asistente');
        });

        bindInput('welcome-message', (val) => {
            setText('preview-welcome', val || '¡Hola! ¿En qué puedo ayudarte?');
        });

        bindInput('input-placeholder', (val) => {
            const input = document.getElementById('preview-input');
            if (input) input.placeholder = val || 'Escribe tu mensaje...';
        });

        // --- Toggle Options ---
        bindCheckbox('hide-bot-avatar', (checked) => {
            const avatars = document.querySelectorAll('#preview-chat-window .message-avatar');
            avatars.forEach(a => a.style.display = checked ? 'none' : '');
        });

        bindCheckbox('hide-branding', (checked) => {
            const branding = document.querySelector('#preview-chat-window .chat-branding');
            if (branding) branding.style.display = checked ? 'none' : '';
        });

        // --- Colors Tab ---
        bindColor('primary-color-picker', (color) => {
            setStyle('#preview-chat-window .chat-send-btn', 'backgroundColor', color);
        });

        bindColor('header-bg-picker', (color) => {
            setStyle('#preview-header', 'backgroundColor', color);
        });

        bindColor('header-font-picker', (color) => {
            setStyle('#preview-header', 'color', color);
            const header = document.getElementById('preview-header');
            if (header) {
                header.querySelectorAll('h4, span, .chat-status').forEach(el => {
                    el.style.color = color;
                });
            }
        });

        bindColor('user-bubble-picker', (color) => {
            setStyle('#preview-user-bubble', 'backgroundColor', color);
        });

        // --- Chat Bubble Tab ---
        bindColor('bubble-bg-picker', (color) => {
            setStyle('#preview-bubble', 'backgroundColor', color);
        });

        bindColor('bubble-icon-picker', (color) => {
            setStyle('#preview-bubble-icon', 'color', color);
        });

        bindColor('bubble-msg-bg-picker', (color) => {
            setStyle('.bubble-tooltip-preview', 'backgroundColor', color);
        });

        bindColor('bubble-msg-color-picker', (color) => {
            setStyle('.bubble-tooltip-preview', 'color', color);
        });

        // Bubble icon selection (also in dashboard.js initIconOptions, kept here for safety)
        document.querySelectorAll('.icon-option').forEach(option => {
            option.addEventListener('click', function () {
                const icon = this.getAttribute('data-icon');
                const previewIcon = document.getElementById('preview-bubble-icon');
                if (previewIcon && icon) {
                    previewIcon.className = icon === 'whatsapp' ? 'fab fa-whatsapp' : `fas fa-${icon}`;
                }
            });
        });

        // Chat icon size
        bindSelect('chat-icon-size', (val) => {
            const bubble = document.getElementById('preview-bubble');
            if (!bubble) return;
            const sizes = { small: '48px', medium: '56px', large: '64px' };
            bubble.style.width = sizes[val] || '56px';
            bubble.style.height = sizes[val] || '56px';
        });

        // Position
        bindSelect('position-screen', (val) => {
            const widget = document.querySelector('.chatbot-preview-widget');
            if (!widget) return;
            widget.style.removeProperty('top');
            widget.style.removeProperty('bottom');
            widget.style.removeProperty('left');
            widget.style.removeProperty('right');
            if (val.includes('bottom')) widget.style.bottom = '10px';
            if (val.includes('top')) widget.style.top = '10px';
            if (val.includes('right')) widget.style.right = '10px';
            if (val.includes('left')) { widget.style.left = '10px'; widget.style.right = 'auto'; }
        });

        // Distance bottom/side
        bindInput('distance-bottom', (val) => {
            const widget = document.querySelector('.chatbot-preview-widget');
            if (widget) widget.style.bottom = (val || 16) + 'px';
        });

        bindInput('distance-side', (val) => {
            const widget = document.querySelector('.chatbot-preview-widget');
            if (widget) widget.style.right = (val || 16) + 'px';
        });

        // Bubble message (tooltip)
        bindInput('bubble-message', (val) => {
            let tooltip = document.querySelector('.bubble-tooltip-preview');
            const bubble = document.getElementById('preview-bubble');
            if (val && val.trim()) {
                if (!tooltip && bubble) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'bubble-tooltip-preview';
                    bubble.parentElement.insertBefore(tooltip, bubble);
                }
                if (tooltip) {
                    tooltip.textContent = val;
                    tooltip.style.display = '';
                }
            } else if (tooltip) {
                tooltip.style.display = 'none';
            }
        });

        // Upload buttons → trigger hidden file inputs
        document.querySelectorAll('.upload-item-modern').forEach(item => {
            const btn = item.querySelector('.btn-upload-modern');
            const fileInput = item.querySelector('.hidden-file-input');
            if (btn && fileInput) {
                btn.addEventListener('click', () => fileInput.click());
            }
        });

        // Image upload preview - bot avatar
        const botAvatarInput = document.getElementById('bot-avatar');
        if (botAvatarInput) {
            botAvatarInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const uploadPreview = botAvatarInput.closest('.upload-item-modern')?.querySelector('.upload-preview');
                        if (uploadPreview) {
                            uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                        }
                        document.querySelectorAll('#preview-chat-window .message-avatar').forEach(avatar => {
                            avatar.innerHTML = `<img src="${e.target.result}" alt="Bot" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                        });
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }

        // Image upload preview - company logo
        const logoInput = document.getElementById('company-logo');
        if (logoInput) {
            logoInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const uploadPreview = logoInput.closest('.upload-item-modern')?.querySelector('.upload-preview');
                        if (uploadPreview) {
                            uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:8px">`;
                        }
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }

        // Chat window toggle via bubble
        const bubbleBtn = document.getElementById('preview-bubble');
        const chatWindow = document.getElementById('preview-chat-window');
        if (bubbleBtn && chatWindow) {
            bubbleBtn.addEventListener('click', () => {
                chatWindow.classList.toggle('active');
            });
        }

        // Close button
        const closeBtn = chatWindow?.querySelector('.chat-close-btn');
        if (closeBtn && chatWindow) {
            closeBtn.addEventListener('click', () => {
                chatWindow.classList.remove('active');
            });
        }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    function bindInput(elementId, callback) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('input', () => callback(el.value));
        }
    }

    function bindCheckbox(elementId, callback) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('change', () => callback(el.checked));
        }
    }

    function bindColor(elementId, callback) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('input', () => callback(el.value));
            el.addEventListener('change', () => callback(el.value));
        }
    }

    function bindSelect(elementId, callback) {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('change', () => callback(el.value));
        }
    }

    function setText(elementId, text) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = text;
    }

    function setStyle(selector, prop, value) {
        const el = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;
        if (el) el.style[prop] = value;
    }

    // ========================================
    // LOAD APPEARANCE SETTINGS FROM BACKEND
    // ========================================
    async function loadAppearanceSettings() {
        const app = window.dashboardApp;
        if (!app) return;

        const chatbotId = app.getCurrentChatbotId();
        if (!chatbotId) return;

        try {
            const response = await (app.authFetch || fetch)(`/api/chatbots/${chatbotId}/appearance`);
            const data = await response.json();

            if (!data.success || !data.appearance) {
                // No saved appearance — try loading chatbot name/welcome from main endpoint
                try {
                    const botRes = await (app.authFetch || fetch)(`/api/chatbots/${chatbotId}`);
                    const botData = await botRes.json();
                    if (botData.success && botData.chatbot) {
                        setInputValue('chatbot-name', botData.chatbot.name);
                        setText('preview-bot-name', botData.chatbot.name || 'Mi Asistente');
                        if (botData.chatbot.welcome_message) {
                            setInputValue('welcome-message', botData.chatbot.welcome_message);
                            setText('preview-welcome', botData.chatbot.welcome_message);
                        }
                    }
                } catch (_) {}
                return;
            }

            const s = data.appearance;

            // Populate form fields
            setInputValue('chatbot-name', s.name);
            setInputValue('welcome-message', s.welcome_message);
            setInputValue('input-placeholder', s.input_placeholder);

            // Checkboxes
            setCheckbox('display-prompts-vertical', s.display_prompts_vertical);
            setCheckbox('hide-bot-avatar', s.hide_bot_avatar);
            setCheckbox('hide-sources', s.hide_sources);
            setCheckbox('hide-branding', s.hide_branding);

            // Colors
            setColorValue('primary-color-picker', s.primary_color);
            setColorValue('header-bg-picker', s.header_bg);
            setColorValue('header-font-picker', s.header_font_color);
            setColorValue('user-bubble-picker', s.user_bubble_bg);

            // Bubble colors
            setColorValue('bubble-bg-picker', s.bubble_bg);
            setColorValue('bubble-icon-picker', s.bubble_icon_color);
            setColorValue('bubble-msg-bg-picker', s.bubble_msg_bg);
            setColorValue('bubble-msg-color-picker', s.bubble_msg_color);

            // Prompt colors
            setColorValue('prompts-bg-picker', s.prompts_bg);
            setColorValue('prompts-border-picker', s.prompts_border);
            setColorValue('prompts-font-picker', s.prompts_font);
            setColorValue('prompts-bg-hover-picker', s.prompts_bg_hover);
            setColorValue('prompts-border-hover-picker', s.prompts_border_hover);
            setColorValue('prompts-font-hover-picker', s.prompts_font_hover);

            // Bubble settings
            setInputValue('bubble-message', s.bubble_message);
            setSelectValue('chat-icon-size', s.chat_icon_size);
            setSelectValue('position-screen', s.position_screen);
            setInputValue('distance-bottom', s.distance_bottom);
            setInputValue('distance-side', s.distance_side);
            setInputValue('custom-bubble-css', s.custom_css);

            // Bubble icon selection
            if (s.bubble_icon) {
                document.querySelectorAll('.icon-option').forEach(opt => {
                    opt.classList.remove('active');
                    if (opt.getAttribute('data-icon') === s.bubble_icon) {
                        opt.classList.add('active');
                    }
                });
            }

            // Update active color dots to match saved values
            updateColorDots();

            // Apply all settings to preview
            applyAllToPreview(s);

            // If name wasn't saved in appearance, load from chatbot data
            if (!s.name) {
                try {
                    const botRes = await (app.authFetch || fetch)(`/api/chatbots/${chatbotId}`);
                    const botData = await botRes.json();
                    if (botData.success && botData.chatbot) {
                        setInputValue('chatbot-name', botData.chatbot.name);
                        setText('preview-bot-name', botData.chatbot.name || 'Mi Asistente');
                        if (botData.chatbot.welcome_message) {
                            setInputValue('welcome-message', botData.chatbot.welcome_message);
                            setText('preview-welcome', botData.chatbot.welcome_message);
                        }
                    }
                } catch (_) {}
            }

        } catch (error) {
            console.error('Error loading appearance settings:', error);
        }
    }

    function applyAllToPreview(s) {
        // Name
        setText('preview-bot-name', s.name || 'Mi Asistente');

        // Welcome message
        setText('preview-welcome', s.welcome_message || '¡Hola! ¿En qué puedo ayudarte?');

        // Input placeholder
        const prevInput = document.getElementById('preview-input');
        if (prevInput && s.input_placeholder) prevInput.placeholder = s.input_placeholder;

        // Header colors
        if (s.header_bg) setStyle('#preview-header', 'backgroundColor', s.header_bg);
        if (s.header_font_color) {
            setStyle('#preview-header', 'color', s.header_font_color);
            const header = document.getElementById('preview-header');
            if (header) {
                header.querySelectorAll('h4, span, .chat-status').forEach(el => {
                    el.style.color = s.header_font_color;
                });
            }
        }

        // Primary color → send button
        if (s.primary_color) {
            setStyle('#preview-chat-window .chat-send-btn', 'backgroundColor', s.primary_color);
        }

        // User bubble
        if (s.user_bubble_bg) {
            setStyle('#preview-user-bubble', 'backgroundColor', s.user_bubble_bg);
        }

        // Chat bubble button
        if (s.bubble_bg) {
            setStyle('#preview-bubble', 'backgroundColor', s.bubble_bg);
        }
        if (s.bubble_icon_color) {
            setStyle('#preview-bubble-icon', 'color', s.bubble_icon_color);
        }

        // Bubble icon
        if (s.bubble_icon) {
            const previewIcon = document.getElementById('preview-bubble-icon');
            if (previewIcon) {
                previewIcon.className = s.bubble_icon === 'whatsapp' ? 'fab fa-whatsapp' : `fas fa-${s.bubble_icon}`;
            }
        }

        // Bubble size
        if (s.chat_icon_size) {
            const bubble = document.getElementById('preview-bubble');
            if (bubble) {
                const sizes = { small: '48px', medium: '56px', large: '64px' };
                bubble.style.width = sizes[s.chat_icon_size] || '56px';
                bubble.style.height = sizes[s.chat_icon_size] || '56px';
            }
        }

        // Hide bot avatar
        if (s.hide_bot_avatar) {
            document.querySelectorAll('#preview-chat-window .message-avatar').forEach(a => {
                a.style.display = 'none';
            });
        }

        // Hide branding
        const branding = document.querySelector('#preview-chat-window .chat-branding');
        if (branding && s.hide_branding) {
            branding.style.display = 'none';
        }
    }

    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) {
            el.value = value;
        }
    }

    function setCheckbox(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    }

    function setColorValue(id, value) {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    }

    function setSelectValue(id, value) {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    }

    function updateColorDots() {
        document.querySelectorAll('.color-presets').forEach(presetGroup => {
            const colorInput = presetGroup.nextElementSibling;
            if (colorInput && colorInput.type === 'color') {
                const currentVal = colorInput.value?.toUpperCase();
                const dots = presetGroup.querySelectorAll('.color-dot');
                dots.forEach(dot => {
                    dot.classList.remove('active');
                    if (dot.getAttribute('data-color')?.toUpperCase() === currentVal) {
                        dot.classList.add('active');
                    }
                });
            }
        });
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
                if (app.showError) app.showError('No hay chatbot seleccionado');
                return;
            }

            // Collect ALL appearance settings matching actual HTML IDs
            const settings = {
                // Content
                name: getVal('chatbot-name') || 'Mi Asistente',
                welcome_message: getVal('welcome-message') || '¡Hola! ¿En qué puedo ayudarte?',
                input_placeholder: getVal('input-placeholder') || 'Escribe tu mensaje...',

                // Options
                display_prompts_vertical: isChecked('display-prompts-vertical'),
                hide_bot_avatar: isChecked('hide-bot-avatar'),
                hide_sources: isChecked('hide-sources'),
                hide_branding: isChecked('hide-branding'),

                // Main Colors
                primary_color: getVal('primary-color-picker') || '#6366F1',
                header_bg: getVal('header-bg-picker') || '#FFFFFF',
                header_font_color: getVal('header-font-picker') || '#111827',
                user_bubble_bg: getVal('user-bubble-picker') || '#10B981',

                // Chat Bubble
                bubble_bg: getVal('bubble-bg-picker') || '#8B5CF6',
                bubble_icon_color: getVal('bubble-icon-picker') || '#FFFFFF',
                bubble_icon: document.querySelector('.icon-option.active')?.getAttribute('data-icon') || 'comments',
                chat_icon_size: getVal('chat-icon-size') || 'medium',
                position_screen: getVal('position-screen') || 'bottom-right',
                distance_bottom: getVal('distance-bottom') || '16',
                distance_side: getVal('distance-side') || '16',

                // Bubble message tooltip
                bubble_message: getVal('bubble-message') || '',
                bubble_msg_bg: getVal('bubble-msg-bg-picker') || '#8B5CF6',
                bubble_msg_color: getVal('bubble-msg-color-picker') || '#FFFFFF',

                // Prompt colors
                prompts_bg: getVal('prompts-bg-picker') || '#FFFFFF',
                prompts_border: getVal('prompts-border-picker') || '#E5E7EB',
                prompts_font: getVal('prompts-font-picker') || '#374151',
                prompts_bg_hover: getVal('prompts-bg-hover-picker') || '#F3F4F6',
                prompts_border_hover: getVal('prompts-border-hover-picker') || '#D1D5DB',
                prompts_font_hover: getVal('prompts-font-hover-picker') || '#111827',

                // Custom CSS
                custom_css: getVal('custom-bubble-css') || ''
            };

            // Visual feedback
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
                    if (app.showSuccess) app.showSuccess('Apariencia guardada correctamente');

                    // Update chatbot name in sidebar
                    const nameEl = document.getElementById('current-chatbot-name');
                    if (nameEl) nameEl.textContent = settings.name;

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
                if (app.showError) app.showError('Error al guardar: ' + error.message);

                setTimeout(() => {
                    saveBtn.innerHTML = originalHTML;
                    saveBtn.style.background = '';
                    saveBtn.disabled = false;
                }, 2500);
            }
        });
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value?.trim() : '';
    }

    function isChecked(id) {
        const el = document.getElementById(id);
        return el ? el.checked : false;
    }

    // ========================================
    // EXPOSE loadAppearanceSettings globally
    // ========================================
    window.loadAppearanceSettings = loadAppearanceSettings;

})();
