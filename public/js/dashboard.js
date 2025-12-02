// Dashboard JavaScript - Fully Functional
(function () {
    'use strict';

    // Configuration
    const API_URL = '/api';
    let currentChatbotId = null;
    let allChatbots = [];

    // Initialize Dashboard
    document.addEventListener('DOMContentLoaded', function () {
        console.log('Dashboard initializing...');
        initNavigation();
        initChatbotSelector();
        initModals();
        loadChatbots();
    });

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
            console.log('Loading chatbots...');
            const response = await fetch(`${API_URL}/chatbots`);
            const data = await response.json();

            if (data.success && data.chatbots) {
                allChatbots = data.chatbots;
                console.log(`Loaded ${allChatbots.length} chatbots`);
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
            console.log(`Selected chatbot: ${bot.name} (${id})`);
            loadDashboardStats();
            generateIntegrationCode();
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

                // Update usage indicator
                updateUsageIndicator(stats.usage || { used: 0, limit: 10000 });
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
            countEl.textContent = `${usage.used.toLocaleString()}/${usage.limit.toLocaleString()}`;
        }

        if (fillEl) {
            const percentage = (usage.used / usage.limit) * 100;
            fillEl.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    // --- Integration Code ---
    function generateIntegrationCode() {
        if (!currentChatbotId) return;

        const bot = allChatbots.find(b => b.id === currentChatbotId);
        const primaryColor = bot?.widget_color || '#6366f1';
        const position = bot?.widget_position || 'bottom-right';
        const welcomeMsg = bot?.welcome_message || '¡Hola! ¿En qué puedo ayudarte?';

        const scriptCode = `<!-- Chatbot Widget -->
<script 
  src="${window.location.origin}/chat-widget.js"
  data-api-url="${window.location.origin}/api"
  data-api-key="${currentChatbotId}"
  data-primary-color="${primaryColor}"
  data-position="${position}"
  data-welcome="${escapeHtml(welcomeMsg)}"
  defer>
</script>`;

        const codeEl = document.getElementById('integration-code');
        if (codeEl) {
            codeEl.textContent = scriptCode;
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
            const response = await fetch(`${API_URL}/chatbots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    description: descInput?.value?.trim() || '',
                    api_key: apiKeyInput?.value?.trim() || '',
                    model: modelSelect?.value || 'gpt-3.5-turbo',
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

        try {
            // This would load from the API
            // For now, show empty state
            const container = document.getElementById('conversations-list');
            if (container) {
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
        showError
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
