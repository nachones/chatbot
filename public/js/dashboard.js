// Dashboard JavaScript - Fully Functional
(function () {
    'use strict';

    // Configuration
    const API_URL = '/api';
    let currentChatbotId = null;
    let allChatbots = [];
    let authToken = localStorage.getItem('miabot_token');
    let currentUser = null;

    // Auth helper - add token to fetch requests
    function authFetch(url, options = {}) {
        if (!options.headers) options.headers = {};
        if (authToken) options.headers['Authorization'] = 'Bearer ' + authToken;
        return fetch(url, options);
    }

    // Check authentication on load
    async function checkAuth() {
        if (!authToken) {
            window.location.href = '/?login=true';
            return false;
        }
        try {
            const res = await fetch(API_URL + '/auth/verify', {
                headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await res.json();
            if (!data.success) {
                localStorage.removeItem('miabot_token');
                localStorage.removeItem('miabot_user');
                window.location.href = '/?login=true';
                return false;
            }
            currentUser = data.user;
            // Show user info in header
            const userEl = document.getElementById('user-display-name');
            if (userEl) userEl.textContent = currentUser.name || currentUser.email;
            return true;
        } catch {
            // Don't redirect on network error - let dashboard work offline
            return true;
        }
    }

    // Logout function
    window.logoutUser = function() {
        localStorage.removeItem('miabot_token');
        localStorage.removeItem('miabot_user');
        window.location.href = '/';
    };

    // Initialize Dashboard
    document.addEventListener('DOMContentLoaded', async function () {
        const isAuth = await checkAuth();
        if (!isAuth) return;
        
        initNavigation();
        initChatbotSelector();
        initModals();
        initAppearanceTabs();
        loadChatbots();
    });

    // --- Appearance Tabs ---
    function initAppearanceTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn-modern');
        const panels = document.querySelectorAll('.appearance-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // Update buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update panels
                panels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.getAttribute('data-content') === tabName) {
                        panel.classList.add('active');
                    }
                });
            });
        });

        // Initialize color dots
        initColorDots();
        
        // Initialize icon options
        initIconOptions();
    }

    function initColorDots() {
        document.querySelectorAll('.color-presets').forEach(presetGroup => {
            const dots = presetGroup.querySelectorAll('.color-dot');
            const colorInput = presetGroup.nextElementSibling;
            
            dots.forEach(dot => {
                dot.addEventListener('click', function() {
                    const color = this.getAttribute('data-color');
                    dots.forEach(d => d.classList.remove('active'));
                    this.classList.add('active');
                    if (colorInput && colorInput.type === 'color') {
                        colorInput.value = color;
                        colorInput.dispatchEvent(new Event('input'));
                    }
                });
            });
        });
    }

    function initIconOptions() {
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', function() {
                iconOptions.forEach(o => o.classList.remove('active'));
                this.classList.add('active');
                // Update preview bubble icon
                const icon = this.getAttribute('data-icon');
                const previewIcon = document.getElementById('preview-bubble-icon');
                if (previewIcon && icon) {
                    previewIcon.className = icon === 'whatsapp' ? 'fab fa-whatsapp' : `fas fa-${icon}`;
                }
            });
        });
    }

    // --- Navigation ---
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                if (page) {
                    switchPage(page);
                }
            });
        });
    }

    function switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update title
        const titles = {
            'dashboard': 'Panel de Control',
            'conversations': 'Conversaciones',
            'leads': 'Contactos',
            'calendar': 'Agendar con Google',
            'train': 'Entrenar Chatbot',
            'test': 'Probar Chatbot',
            'appearance': 'Apariencia',
            'prompts': 'Respuestas Rápidas',
            'functions': 'Funciones',
            'integrations': 'Integraciones',
            'settings': 'Configuración'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = titles[pageName] || 'Dashboard';
        }

        // Load page specific data
        if (pageName === 'dashboard') loadDashboardStats();
        if (pageName === 'integrations') generateIntegrationCode();
        if (pageName === 'conversations') loadConversations();
        if (pageName === 'leads') loadLeads();
        if (pageName === 'calendar') window.initCalendarPage && window.initCalendarPage();
        if (pageName === 'appearance') window.loadAppearanceSettings && window.loadAppearanceSettings();
    }

    // --- Chatbot Selector ---
    function initChatbotSelector() {
        const selectorBtn = document.getElementById('chatbot-current');
        const dropdown = document.getElementById('chatbot-dropdown');
        const newBtn = document.getElementById('btn-new-chatbot');

        if (selectorBtn) {
            selectorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dropdown) {
                    dropdown.classList.toggle('hidden');
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (dropdown) {
                dropdown.classList.add('hidden');
            }
        });

        // Prevent dropdown from closing when clicking inside
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (newBtn) {
            newBtn.addEventListener('click', () => {
                openNewChatbotModal();
            });
        }
    }

    async function loadChatbots() {
        try {
            const response = await authFetch(`${API_URL}/chatbots`);
            const data = await response.json();

            if (data.success && data.chatbots) {
                allChatbots = data.chatbots;
                renderChatbotList();

                // Select first chatbot if none selected
                if (!currentChatbotId && allChatbots.length > 0) {
                    selectChatbot(allChatbots[0].id);
                } else if (allChatbots.length === 0) {
                    showNoChatbotsState();
                }
            }
        } catch (error) {
            console.error('Error loading chatbots:', error);
            showError('Error al cargar los chatbots');
        }
    }

    function renderChatbotList() {
        const list = document.getElementById('chatbot-list');
        if (!list) return;

        if (allChatbots.length === 0) {
            list.innerHTML = '<div class="empty-chatbot-list">No hay chatbots aún</div>';
            return;
        }

        list.innerHTML = allChatbots.map(bot => `
            <div class="chatbot-item" data-id="${bot.id}" onclick="window.selectChatbotById('${bot.id}')">
                <i class="fas fa-robot"></i>
                <span>${escapeHtml(bot.name)}</span>
            </div>
        `).join('');
    }

    window.selectChatbotById = function (id) {
        selectChatbot(id);
        const dropdown = document.getElementById('chatbot-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    };

    function selectChatbot(id) {
        currentChatbotId = id;
        const bot = allChatbots.find(b => b.id === id);

        if (bot) {
            const nameEl = document.getElementById('current-chatbot-name');
            if (nameEl) {
                nameEl.textContent = bot.name;
            }
            loadDashboardStats();
            generateIntegrationCode();

            // Reload appearance if that page is active
            const appearancePage = document.getElementById('page-appearance');
            if (appearancePage && appearancePage.classList.contains('active')) {
                window.loadAppearanceSettings && window.loadAppearanceSettings();
            }
        }
    }

    function showNoChatbotsState() {
        const nameEl = document.getElementById('current-chatbot-name');
        if (nameEl) {
            nameEl.textContent = 'Sin chatbots';
        }
    }

    // --- Dashboard Stats ---
    async function loadDashboardStats() {
        if (!currentChatbotId) return;

        try {
            // Load stats from API
            const response = await fetch(`${API_URL}/chatbots/${currentChatbotId}/stats`);
            const data = await response.json();

            if (data.success) {
                const stats = data.stats || {};

                // Update stat cards
                updateStatElement('total-messages', stats.messages || 0);
                updateStatElement('total-conversations', stats.conversations || 0);
                updateStatElement('total-training', stats.training || 0);
                updateStatElement('total-leads', stats.leads || 0);
            }

            // Load usage from usage endpoint
            try {
                const usageRes = await fetch(`${API_URL}/usage/${currentChatbotId}`);
                const usageData = await usageRes.json();
                if (usageData.success && usageData.usage) {
                    const u = usageData.usage;
                    updateUsageIndicator({
                        used: u.tokensUsed || 0,
                        limit: u.tokensLimit || 10000,
                        plan: u.planName || 'Starter',
                        isCustom: u.isCustomApi || false
                    });
                }
            } catch (usageErr) {
                console.error('Error loading usage:', usageErr);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Show zeros if error
            updateStatElement('total-messages', 0);
            updateStatElement('total-conversations', 0);
            updateStatElement('total-training', 0);
            updateStatElement('total-leads', 0);
        }
    }

    function updateStatElement(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            // Animate number change
            animateValue(el, parseInt(el.textContent) || 0, value, 500);
        }
    }

    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    }

    function updateUsageIndicator(usage) {
        const countEl = document.getElementById('usage-count');
        const fillEl = document.getElementById('usage-bar-fill');

        if (countEl) {
            if (usage.isCustom) {
                countEl.textContent = `Custom (API propia)`;
            } else {
                countEl.textContent = `${usage.used.toLocaleString('es-ES')}/${usage.limit.toLocaleString('es-ES')}`;
            }
        }

        if (fillEl) {
            if (usage.isCustom) {
                fillEl.style.width = '0%';
                fillEl.style.backgroundColor = '#10b981';
            } else {
                const percentage = usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0;
                fillEl.style.width = `${Math.min(percentage, 100)}%`;
                if (percentage >= 90) fillEl.style.backgroundColor = '#ef4444';
                else if (percentage >= 70) fillEl.style.backgroundColor = '#f59e0b';
                else fillEl.style.backgroundColor = '#6366f1';
            }
        }
    }

    // --- Integration Code ---
    function generateIntegrationCode() {
        if (!currentChatbotId) return;

        const bot = allChatbots.find(b => b.id === currentChatbotId);
        const primaryColor = bot?.widget_color || '#6366f1';
        const position = bot?.widget_position || 'bottom-right';
        const welcomeMsg = bot?.welcome_message || '¡Hola! ¿En qué puedo ayudarte?';
        const title = bot?.widget_title || 'Mi Asistente';
        const origin = window.location.origin;

        // Widget script code
        const scriptCode = `<!-- Chatbot Widget MIABOT -->
<script 
  src="${origin}/chat-widget.js"
  data-api-url="${origin}/api"
  data-api-key="${currentChatbotId}"
  data-title="${escapeHtml(title)}"
  data-primary-color="${primaryColor}"
  data-position="${position}"
  data-welcome="${escapeHtml(welcomeMsg)}"
  defer>
</script>`;

        const codeEl = document.getElementById('integration-code');
        if (codeEl) {
            codeEl.textContent = scriptCode;
        }

        // API example
        const apiExample = document.getElementById('api-example-code');
        if (apiExample) {
            apiExample.textContent = `// Ejemplo con fetch
const response = await fetch("${origin}/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Hola, ¿qué servicios ofrecen?",
    chatbotId: "${currentChatbotId}",
    sessionId: "session_" + Date.now()
  })
});
const data = await response.json();
console.log(data.text);`;
        }

        const apiUrl = document.getElementById('api-endpoint-url');
        if (apiUrl) apiUrl.textContent = `${origin}/api/chat`;

        // Direct link
        const directLink = document.getElementById('direct-link-code');
        if (directLink) {
            directLink.textContent = `${origin}/widget-preview.html?id=${currentChatbotId}`;
        }
    }

    // --- Modals ---
    function initModals() {
        // Integration modal
        const integrateBtn = document.getElementById('integrate-btn');
        if (integrateBtn) {
            integrateBtn.addEventListener('click', () => {
                switchPage('integrations');
            });
        }

        // Copy integration code button
        const copyBtn = document.getElementById('copy-integration-code');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const code = document.getElementById('integration-code');
                if (code) {
                    navigator.clipboard.writeText(code.textContent).then(() => {
                        showSuccess('Código copiado al portapapeles');
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Código';
                        }, 2000);
                    });
                }
            });
        }

        // Create chatbot button
        const createChatbotBtn = document.getElementById('create-chatbot-btn');
        if (createChatbotBtn) {
            createChatbotBtn.addEventListener('click', createNewChatbot);
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
    }

    async function createNewChatbot() {
        const nameInput = document.getElementById('new-chatbot-name');
        const descInput = document.getElementById('new-chatbot-description');
        const apiKeyInput = document.getElementById('new-chatbot-api-key');
        const modelSelect = document.getElementById('new-chatbot-model');
        const promptInput = document.getElementById('new-chatbot-prompt');

        const name = nameInput?.value?.trim();
        
        if (!name) {
            showError('El nombre del chatbot es requerido');
            nameInput?.focus();
            return;
        }

        const createBtn = document.getElementById('create-chatbot-btn');
        const originalText = createBtn.innerHTML;
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        try {
            const response = await authFetch(`${API_URL}/chatbots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    description: descInput?.value?.trim() || '',
                    api_key: apiKeyInput?.value?.trim() || '',
                    model: modelSelect?.value || 'gemini-2.0-flash',
                    system_prompt: promptInput?.value?.trim() || 'Eres un asistente útil y amigable.'
                })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('¡Chatbot creado exitosamente!');
                
                // Close modal
                const modal = document.getElementById('new-chatbot-modal');
                if (modal) modal.classList.remove('active');

                // Clear form
                if (nameInput) nameInput.value = '';
                if (descInput) descInput.value = '';
                if (apiKeyInput) apiKeyInput.value = '';
                if (promptInput) promptInput.value = 'Eres un asistente útil y amigable.';

                // Reload chatbots and select the new one
                await loadChatbots();
                if (data.chatbot?.id) {
                    selectChatbot(data.chatbot.id);
                }
            } else {
                showError(data.error || 'Error al crear el chatbot');
            }
        } catch (error) {
            console.error('Error creating chatbot:', error);
            showError('Error de conexión al crear el chatbot');
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }

    function openNewChatbotModal() {
        // This will be handled by wizard.js
        const modal = document.getElementById('new-chatbot-modal');
        if (modal) {
            modal.classList.add('active');
            if (typeof window.resetWizard === 'function') {
                window.resetWizard();
            }
        }
    }

    // --- Conversations ---
    async function loadConversations() {
        if (!currentChatbotId) return;

        const container = document.getElementById('conversations-list');
        if (!container) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando conversaciones...</p>
                </div>
            `;

            const response = await fetch(`${API_URL}/dashboard/conversations?chatbotId=${currentChatbotId}&limit=20`);
            const data = await response.json();

            if (data.success && data.conversations && data.conversations.length > 0) {
                container.innerHTML = data.conversations.map(conv => `
                    <div class="conversation-item" data-session="${conv.session_id}">
                        <div class="conversation-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="conversation-info">
                            <div class="conversation-name">Usuario ${conv.session_id.slice(-6)}</div>
                            <div class="conversation-preview">${escapeHtml(conv.last_message?.substring(0, 50) || 'Sin mensajes')}...</div>
                        </div>
                        <div class="conversation-meta">
                            <div class="conversation-time">${formatDate(conv.last_message_time)}</div>
                            <div class="conversation-count">${conv.message_count} msgs</div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="empty-state-title">No hay conversaciones aún</div>
                        <div class="empty-state-description">
                            Las conversaciones con tus usuarios aparecerán aquí
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="empty-state-title">Error al cargar</div>
                    <div class="empty-state-description">
                        No se pudieron cargar las conversaciones
                    </div>
                </div>
            `;
        }
    }

    // --- Leads ---
    async function loadLeads() {
        if (!currentChatbotId) return;

        try {
            const response = await fetch(`${API_URL}/leads?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            const container = document.getElementById('leads-list');
            if (!container) return;

            if (data.success && data.leads && data.leads.length > 0) {
                container.innerHTML = data.leads.map(lead => `
                    <div class="lead-card">
                        <div class="lead-header">
                            <div class="lead-name">${escapeHtml(lead.name || 'Anónimo')}</div>
                            <div class="lead-date">${formatDate(lead.created_at)}</div>
                        </div>
                        <div class="lead-info">
                            ${lead.email ? `<div><i class="fas fa-envelope"></i> ${escapeHtml(lead.email)}</div>` : ''}
                            ${lead.phone ? `<div><i class="fas fa-phone"></i> ${escapeHtml(lead.phone)}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="empty-state-title">No hay contactos aún</div>
                        <div class="empty-state-description">
                            Los contactos capturados aparecerán aquí
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading leads:', error);
        }
    }

    // --- Utilities ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minutos`;
        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffDays < 7) return `Hace ${diffDays} días`;

        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function showSuccess(message) {
        showNotification(message, 'success');
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Expose functions globally for inline event handlers
    window.dashboardApp = {
        selectChatbot: selectChatbotById,
        getCurrentChatbotId: () => currentChatbotId,
        loadChatbots,
        showSuccess,
        showError,
        authFetch
    };

})();

// CSS for notifications (inject into page)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
