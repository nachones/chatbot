// Dashboard JavaScript - SupportAI Style
(function () {
    'use strict';

    // Configuration
    const API_URL = '/api';
    let currentChatbotId = null;
    let allChatbots = [];
    let wizardData = {};

    // Initialize Dashboard
    document.addEventListener('DOMContentLoaded', function () {
        initNavigation();
        initChatbotSelector();
        initWizard();
        initIntegration();
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
        document.getElementById(`page-${pageName}`)?.classList.add('active');

        // Update title
        const titles = {
            'dashboard': 'Dashboard',
            'conversations': 'Conversaciones',
            'leads': 'Contactos',
            'train': 'Entrenamiento',
            'appearance': 'Apariencia',
            'prompts': 'Respuestas Rápidas',
            'functions': 'Funciones',
            'integrations': 'Integraciones',
            'settings': 'Ajustes'
        };
        document.getElementById('page-title').textContent = titles[pageName] || 'Dashboard';

        // Load page specific data
        if (pageName === 'dashboard') loadDashboardStats();
        if (pageName === 'integrations') generateIntegrationCode();
    }

    // --- Chatbot Selector ---
    function initChatbotSelector() {
        const selectorBtn = document.getElementById('chatbot-current');
        const dropdown = document.getElementById('chatbot-dropdown');
        const newBtn = document.getElementById('btn-new-chatbot');

        selectorBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        newBtn?.addEventListener('click', () => {
            openWizard();
        });
    }

    async function loadChatbots() {
        try {
            const response = await fetch(`${API_URL}/chatbots`);
            const data = await response.json();

            if (data.success && data.chatbots) {
                allChatbots = data.chatbots;
                renderChatbotList();

                if (!currentChatbotId && allChatbots.length > 0) {
                    selectChatbot(allChatbots[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading chatbots:', error);
        }
    }

    function renderChatbotList() {
        const list = document.getElementById('chatbot-list');
        if (!list) return;

        list.innerHTML = allChatbots.map(bot => `
            <button class="dropdown-item" onclick="window.selectChatbot('${bot.id}')">
                ${escapeHtml(bot.name)}
            </button>
        `).join('');
    }

    window.selectChatbot = function (id) {
        currentChatbotId = id;
        const bot = allChatbots.find(b => b.id === id);
        if (bot) {
            document.getElementById('current-chatbot-name').textContent = bot.name;
        }
        loadDashboardStats();
        // Si estamos en integraciones, regenerar código
        if (document.getElementById('page-integrations').classList.contains('active')) {
            generateIntegrationCode();
        }
    };

    // --- Wizard Logic ---
    function initWizard() {
        const modal = document.getElementById('new-chatbot-modal');
        const closeBtn = modal.querySelector('.close-modal');
        const nextBtn = document.getElementById('btn-wizard-next');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        nextBtn.addEventListener('click', async () => {
            const name = document.getElementById('new-chatbot-name').value;
            const desc = document.getElementById('new-chatbot-description').value;

            if (!name) {
                alert('Por favor, asigna un nombre a tu chatbot.');
                return;
            }

            // Crear chatbot
            try {
                nextBtn.disabled = true;
                nextBtn.textContent = 'Creando...';

                const response = await fetch(`${API_URL}/chatbots`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        description: desc,
                        model: 'gpt-3.5-turbo',
                        systemPrompt: 'Eres un asistente útil.'
                    })
                });

                const data = await response.json();
                if (data.success) {
                    modal.classList.remove('active');
                    await loadChatbots();
                    selectChatbot(data.chatbotId);
                    switchPage('train'); // Ir a entrenamiento tras crear
                }
            } catch (error) {
                console.error('Error creating chatbot:', error);
                alert('Error al crear el chatbot');
            } finally {
                nextBtn.disabled = false;
                nextBtn.textContent = 'Crear y Continuar';
            }
        });
    }

    function openWizard() {
        const modal = document.getElementById('new-chatbot-modal');
        document.getElementById('new-chatbot-name').value = '';
        document.getElementById('new-chatbot-description').value = '';
        modal.classList.add('active');
    }

    // --- Integration Logic ---
    function initIntegration() {
        const copyBtn = document.getElementById('copy-integration-code');
        copyBtn?.addEventListener('click', () => {
            const code = document.getElementById('integration-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            });
        });
    }

    function generateIntegrationCode() {
        if (!currentChatbotId) return;

        // Obtener configuración actual (colores, etc) - Por ahora defaults
        const bot = allChatbots.find(b => b.id === currentChatbotId);
        const primaryColor = '#2563eb'; // Podríamos sacarlo de la config real

        const scriptCode = `<!-- SupportAI Chatbot Widget -->
<script 
  src="${window.location.origin}/chat-widget.js"
  data-api-url="${window.location.origin}/api"
  data-api-key="${currentChatbotId}"
  data-primary-color="${primaryColor}"
  data-title="${bot ? escapeHtml(bot.name) : 'Asistente'}"
  defer>
</script>`;

        document.getElementById('integration-code').textContent = scriptCode;
    }

    // --- Dashboard Stats ---
    async function loadDashboardStats() {
        if (!currentChatbotId) return;

        // Simulación de carga de stats (conectar con API real si existe endpoint)
        // Por ahora ponemos 0 o valores dummy
        document.getElementById('total-messages').textContent = '0';
        document.getElementById('total-conversations').textContent = '0';
        document.getElementById('training-count').textContent = '0';
        document.getElementById('total-leads').textContent = '0';
    }

    // Utilities
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
