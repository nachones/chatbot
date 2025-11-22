// Dashboard JavaScript
(function() {
    'use strict';

    // Configuration
    const API_URL = '/api';
    let currentPage = 'dashboard';
    let charts = {};
    
    // Multi-client variables
    let currentChatbotId = null;
    let allChatbots = [];

    // Initialize Dashboard
    document.addEventListener('DOMContentLoaded', function() {
        initNavigation();
        initModals();
        initChatbotSelector();
        initNewChatbotModal();
        initDashboard();
        initTraining();
        initTest();
        initSettings();
        initIntegrations();
        initAppearance();
        initQuickPrompts();
        initFunctions();
        loadChatbots();
    });

    // Initialize New Chatbot Modal
    function initNewChatbotModal() {
        const createBtn = document.getElementById('create-chatbot-btn');
        if (createBtn) {
            createBtn.addEventListener('click', createNewChatbot);
        }
    }

    // Initialize Dashboard
    function initDashboard() {
        // Token period selector
        const tokenPeriod = document.getElementById('token-period');
        if (tokenPeriod) {
            tokenPeriod.addEventListener('change', function() {
                loadTokenUsage();
            });
        }

        // Chart period tabs
        const chartTabs = document.querySelectorAll('.chart-tab');
        chartTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                chartTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const period = this.getAttribute('data-period');
                loadChatHistoryForPeriod(period);
            });
        });
    }

    async function loadChatHistoryForPeriod(period) {
        if (!currentChatbotId) return;

        try {
            const response = await fetch(`${API_URL}/dashboard/chat-history?period=${period}&chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.history) {
                updateChatHistoryChart(data.history);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function updateChatHistoryChart(historyData) {
        const ctx = document.getElementById('chat-history-chart');
        if (!ctx) return;

        const labels = historyData.map(d => d.date);
        const counts = historyData.map(d => d.count);

        if (charts.chatHistory) {
            charts.chatHistory.destroy();
        }

        charts.chatHistory = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mensajes',
                    data: counts,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // Navigation
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
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
        });
        document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`page-${pageName}`)?.classList.add('active');

        // Update title
        const titles = {
            'dashboard': 'Panel de Control',
            'conversations': 'Conversaciones',
            'train': 'Entrenar Chatbot',
            'test': 'Probar Chatbot',
            'leads': 'Contactos',
            'functions': 'Funciones',
            'prompts': 'Respuestas Rápidas',
            'appearance': 'Apariencia',
            'integrations': 'Integraciones',
            'settings': 'Configuración'
        };
        document.getElementById('page-title').textContent = titles[pageName] || pageName;

        currentPage = pageName;

        // Load page-specific data
        loadPageData(pageName);
    }

    // Chatbot Selector Functions
    function initChatbotSelector() {
        const chatbotCurrent = document.getElementById('chatbot-current');
        const chatbotDropdown = document.getElementById('chatbot-dropdown');
        const btnNewChatbot = document.getElementById('btn-new-chatbot');

        // Toggle dropdown
        chatbotCurrent?.addEventListener('click', function(e) {
            e.stopPropagation();
            chatbotDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.chatbot-selector')) {
                if (chatbotDropdown) {
                    chatbotDropdown.classList.add('hidden');
                }
            }
        });

        // New chatbot button
        btnNewChatbot?.addEventListener('click', function(e) {
            e.stopPropagation();
            openNewChatbotModal();
            chatbotDropdown.classList.add('hidden');
        });
    }

    async function loadChatbots() {
        try {
            const response = await fetch(`${API_URL}/chatbots`);
            const data = await response.json();

            if (data.success && data.chatbots) {
                allChatbots = data.chatbots;
                renderChatbotList();

                // Select first chatbot if none selected
                if (!currentChatbotId && allChatbots.length > 0) {
                    selectChatbot(allChatbots[0].id);
                } else if (currentChatbotId) {
                    // Reload data for current chatbot
                    loadDashboardData();
                }
            }
        } catch (error) {
            console.error('Error loading chatbots:', error);
            showToast('Error al cargar chatbots', 'error');
        }
    }

    function renderChatbotList() {
        const chatbotList = document.getElementById('chatbot-list');
        if (!chatbotList) return;

        if (allChatbots.length === 0) {
            chatbotList.innerHTML = '<div class="status-message">Aún no hay chatbots. ¡Crea uno!</div>';
            return;
        }

        chatbotList.innerHTML = allChatbots.map(chatbot => `
            <div class="chatbot-item ${chatbot.id === currentChatbotId ? 'active' : ''}" 
                 data-chatbot-id="${chatbot.id}"
                 onclick="selectChatbot('${chatbot.id}')">
                <div class="chatbot-info">
                    <div class="chatbot-name">${escapeHtml(chatbot.name)}</div>
                    <div class="chatbot-description">${escapeHtml(chatbot.description || 'No description')}</div>
                    ${chatbot.is_active ? '' : '<span class="chatbot-status-badge inactive">Suspended</span>'}
                </div>
                <div class="chatbot-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editChatbot('${chatbot.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${chatbot.is_active ? 'warning' : 'success'}" 
                            onclick="event.stopPropagation(); toggleChatbotStatus('${chatbot.id}', ${chatbot.is_active})"
                            title="${chatbot.is_active ? 'Suspend' : 'Activate'}">
                        <i class="fas fa-${chatbot.is_active ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn-icon danger" onclick="event.stopPropagation(); deleteChatbot('${chatbot.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.selectChatbot = async function(chatbotId) {
        currentChatbotId = chatbotId;
        
        // Update UI
        const chatbot = allChatbots.find(c => c.id === chatbotId);
        if (chatbot) {
            document.getElementById('current-chatbot-name').textContent = chatbot.name;
        }

        // Update active state in list
        renderChatbotList();

        // Close dropdown
        const dropdown = document.getElementById('chatbot-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }

        // Reload dashboard data
        await loadDashboardData();
        
        showToast(`Cambiado a ${chatbot.name}`, 'success');
    };

    function openNewChatbotModal() {
        const modal = document.getElementById('new-chatbot-modal');
        
        // Reset form
        document.getElementById('new-chatbot-name').value = '';
        document.getElementById('new-chatbot-description').value = '';
        document.getElementById('new-chatbot-model').value = 'gpt-3.5-turbo';
        document.getElementById('new-chatbot-prompt').value = 'Eres un asistente útil y amigable.';
        
        modal.classList.add('active');
    }

    async function createNewChatbot() {
        const name = document.getElementById('new-chatbot-name').value.trim();
        const description = document.getElementById('new-chatbot-description').value.trim();
        const model = document.getElementById('new-chatbot-model').value;
        const systemPrompt = document.getElementById('new-chatbot-prompt').value.trim();

        if (!name) {
            showToast('Por favor, introduce un nombre para el chatbot', 'error');
            return;
        }

        const btn = document.getElementById('create-chatbot-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        try {
            const response = await fetch(`${API_URL}/chatbots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    model,
                    system_prompt: systemPrompt
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Chatbot creado correctamente', 'success');
                document.getElementById('new-chatbot-modal').classList.remove('active');
                await loadChatbots();
                selectChatbot(data.chatbot.id);
            } else {
                throw new Error(data.error || 'Error al crear chatbot');
            }
        } catch (error) {
            console.error('Error creating chatbot:', error);
            showToast('Error al crear chatbot', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Crear Chatbot';
        }
    }

    window.editChatbot = function(chatbotId) {
        const chatbot = allChatbots.find(c => c.id === chatbotId);
        if (!chatbot) return;

        const modal = document.getElementById('edit-chatbot-modal');
        if (!modal) {
            createEditChatbotModal();
        }

        // Fill form with current data
        document.getElementById('edit-chatbot-id').value = chatbot.id;
        document.getElementById('edit-chatbot-name').value = chatbot.name;
        document.getElementById('edit-chatbot-description').value = chatbot.description || '';
        document.getElementById('edit-chatbot-model').value = chatbot.model;
        document.getElementById('edit-chatbot-prompt').value = chatbot.system_prompt || '';

        document.getElementById('edit-chatbot-modal').classList.add('active');
    };

    function createEditChatbotModal() {
        const modalHTML = `
            <div id="edit-chatbot-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Editar Chatbot</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="edit-chatbot-id">
                        <div class="form-group">
                            <label for="edit-chatbot-name">Chatbot Name *</label>
                            <input type="text" id="edit-chatbot-name" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-chatbot-description">Description</label>
                            <input type="text" id="edit-chatbot-description">
                        </div>
                        <div class="form-group">
                            <label for="edit-chatbot-model">AI Model</label>
                            <select id="edit-chatbot-model">
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-chatbot-prompt">System Prompt</label>
                            <textarea id="edit-chatbot-prompt" rows="4"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-close">Cancelar</button>
                        <button class="btn btn-primary" id="update-chatbot-btn">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('edit-chatbot-modal');
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => modal.classList.remove('active'));
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
        
        document.getElementById('update-chatbot-btn').addEventListener('click', updateChatbot);
    }

    async function updateChatbot() {
        const chatbotId = document.getElementById('edit-chatbot-id').value;
        const name = document.getElementById('edit-chatbot-name').value.trim();
        const description = document.getElementById('edit-chatbot-description').value.trim();
        const model = document.getElementById('edit-chatbot-model').value;
        const systemPrompt = document.getElementById('edit-chatbot-prompt').value.trim();

        if (!name) {
            showToast('Por favor, introduce un nombre para el chatbot', 'error');
            return;
        }

        const btn = document.getElementById('update-chatbot-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const response = await fetch(`${API_URL}/chatbots/${chatbotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    model,
                    system_prompt: systemPrompt
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Chatbot actualizado correctamente', 'success');
                document.getElementById('edit-chatbot-modal').classList.remove('active');
                await loadChatbots();
            } else {
                throw new Error(data.error || 'Error al actualizar chatbot');
            }
        } catch (error) {
            console.error('Error updating chatbot:', error);
            showToast('Error al actualizar chatbot', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        }
    }

    window.toggleChatbotStatus = async function(chatbotId, isActive) {
        const action = isActive ? 'suspend' : 'activate';
        const confirmMsg = isActive 
            ? '¿Estás seguro de que quieres suspender este chatbot? Dejará de responder mensajes.'
            : '¿Estás seguro de que quieres activar este chatbot?';

        if (!confirm(confirmMsg)) return;

        try {
            const response = await fetch(`${API_URL}/chatbots/${chatbotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive })
            });

            const data = await response.json();

            if (data.success) {
                showToast(`Chatbot ${action === 'suspend' ? 'suspendido' : 'activado'} correctamente`, 'success');
                await loadChatbots();
            } else {
                throw new Error(data.error || `Failed to ${action} chatbot`);
            }
        } catch (error) {
            console.error(`Error ${action}ing chatbot:`, error);
            showToast(`Error al ${action === 'suspend' ? 'suspender' : 'activar'} chatbot`, 'error');
        }
    };

    window.deleteChatbot = async function(chatbotId) {
        const chatbot = allChatbots.find(c => c.id === chatbotId);
        if (!chatbot) return;

        const confirmMsg = `¿Estás seguro de que quieres eliminar "${chatbot.name}"? Esta acción no se puede deshacer y eliminará todos los datos asociados (conversaciones, datos de entrenamiento, etc.).`;
        
        if (!confirm(confirmMsg)) return;

        // Double confirmation for safety
        const finalConfirm = prompt('Escribe "ELIMINAR" para confirmar la eliminación:', '');
        if (finalConfirm !== 'ELIMINAR') {
            showToast('Eliminación cancelada', 'info');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/chatbots/${chatbotId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showToast('Chatbot eliminado correctamente', 'success');
                
                // If deleted chatbot was selected, select another one
                if (currentChatbotId === chatbotId) {
                    currentChatbotId = null;
                }
                
                await loadChatbots();
            } else {
                throw new Error(data.error || 'Error al eliminar chatbot');
            }
        } catch (error) {
            console.error('Error deleting chatbot:', error);
            showToast('Error al eliminar chatbot', 'error');
        }
    };

    // Load Dashboard Data
    async function loadDashboardData() {
        if (!currentChatbotId) {
            console.log('No chatbot selected');
            return;
        }

        try {
            // Load usage indicator in header
            await loadUsageIndicator();
            
            // Load stats
            await loadStats();
            
            // Load chart
            await loadChatHistory();
            
            // Load recent conversations
            await loadRecentConversations();
            
            // Load token usage
            await loadTokenUsage();

            // Load quick prompts
            await loadQuickPrompts();

            // Load functions
            await loadFunctions();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showToast('Error al cargar datos del panel', 'error');
        }
    }

    async function loadStats() {
        try {
            if (!currentChatbotId) {
                console.log('No chatbot selected, showing zeros');
                document.getElementById('total-messages').textContent = '0';
                document.getElementById('total-conversations').textContent = '0';
                document.getElementById('total-training').textContent = '0';
                document.getElementById('total-leads').textContent = '0';
                return;
            }

            const url = `${API_URL}/dashboard/stats?chatbotId=${currentChatbotId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                document.getElementById('total-messages').textContent = data.stats.messages;
                document.getElementById('total-conversations').textContent = data.stats.conversations;
                document.getElementById('total-training').textContent = data.stats.training;
                document.getElementById('total-leads').textContent = data.stats.leads;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Show default values on error
            document.getElementById('total-messages').textContent = '0';
            document.getElementById('total-conversations').textContent = '0';
            document.getElementById('total-training').textContent = '0';
            document.getElementById('total-leads').textContent = '0';
        }
    }

    async function loadChatHistory() {
        if (!currentChatbotId) return;

        // Get active period from tabs
        const activeTab = document.querySelector('.chart-tab.active');
        const period = activeTab ? activeTab.getAttribute('data-period') : '1w';
        
        await loadChatHistoryForPeriod(period);
    }

    async function loadRecentConversations() {
        const container = document.getElementById('recent-conversations');
        if (!container) return;

        try {
            if (!currentChatbotId) {
                container.innerHTML = '<p class="status-message">Selecciona un chatbot para ver conversaciones</p>';
                return;
            }

            const url = `${API_URL}/dashboard/recent-conversations?limit=5&chatbotId=${currentChatbotId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.conversations && data.conversations.length > 0) {
                container.innerHTML = data.conversations.map(conv => {
                    const initials = conv.session_id.substring(0, 2).toUpperCase();
                    const timeAgo = getTimeAgo(new Date(conv.last_message_time));
                    const message = conv.last_message || 'No message';
                    
                    return `
                        <div class="conversation-item" onclick="viewConversation('${conv.session_id}')">
                            <div class="conversation-avatar">${initials}</div>
                            <div class="conversation-info">
                                <div class="conversation-name">Session ${conv.session_id.substring(0, 8)}</div>
                                <div class="conversation-message">${escapeHtml(message.substring(0, 50))}...</div>
                            </div>
                            <div class="conversation-time">${timeAgo}</div>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = '<p class="status-message">Aún no hay conversaciones</p>';
            }
        } catch (error) {
            console.error('Error loading recent conversations:', error);
            container.innerHTML = '<p class="status-message error">Error al cargar conversaciones</p>';
        }
    }

    async function loadTokenUsage() {
        try {
            if (!currentChatbotId) {
                document.getElementById('total-tokens').textContent = '0';
                document.getElementById('input-tokens').textContent = '0';
                document.getElementById('output-tokens').textContent = '0';
                document.getElementById('estimated-cost').textContent = '$0.0000';
                return;
            }

            const period = document.getElementById('token-period')?.value || 'month';
            const url = `${API_URL}/dashboard/token-usage?period=${period}&chatbotId=${currentChatbotId}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                document.getElementById('total-tokens').textContent = data.usage.total.toLocaleString();
                document.getElementById('input-tokens').textContent = data.usage.input.toLocaleString();
                document.getElementById('output-tokens').textContent = data.usage.output.toLocaleString();
                document.getElementById('estimated-cost').textContent = `$${data.usage.cost}`;
            }

            // Load token usage chart
            loadTokenChart();
        } catch (error) {
            console.error('Error loading token usage:', error);
            document.getElementById('total-tokens').textContent = '0';
            document.getElementById('input-tokens').textContent = '0';
            document.getElementById('output-tokens').textContent = '0';
            document.getElementById('estimated-cost').textContent = '$0.0000';
        }
    }

    function loadTokenChart() {
        const ctx = document.getElementById('token-usage-chart');
        if (!ctx) return;

        const data = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
                {
                    label: 'Input Tokens',
                    data: [2100, 2300, 1900, 1930],
                    backgroundColor: 'rgba(0, 123, 255, 0.7)'
                },
                {
                    label: 'Output Tokens',
                    data: [1800, 2000, 1700, 1690],
                    backgroundColor: 'rgba(40, 167, 69, 0.7)'
                }
            ]
        };

        if (charts.tokenUsage) {
            charts.tokenUsage.destroy();
        }

        charts.tokenUsage = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Load Page Data
    async function loadPageData(pageName) {
        switch(pageName) {
            case 'conversations':
                await loadAllConversations();
                break;
            case 'train':
                await loadTrainingData();
                break;
            case 'leads':
                await loadLeads();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    }

    async function loadAllConversations() {
        const container = document.getElementById('all-conversations');
        if (!container) return;

        try {
            if (!currentChatbotId) {
                container.innerHTML = '<p class="status-message large">Selecciona un chatbot para ver conversaciones</p>';
                return;
            }

            const response = await fetch(`${API_URL}/dashboard/conversations?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.conversations && data.conversations.length > 0) {
                const rows = data.conversations.map(conv => {
                    const sessionShort = conv.session_id.substring(0, 8);
                    const lastMessage = (conv.last_message || '').substring(0, 50);
                    const date = new Date(conv.last_message_time).toLocaleString();
                    
                    return `
                        <tr>
                            <td>Sesión ${sessionShort}</td>
                            <td>${escapeHtml(lastMessage)}${lastMessage.length >= 50 ? '...' : ''}</td>
                            <td>${date}</td>
                            <td>${conv.message_count}</td>
                            <td>
                                <button class="btn-icon" onclick="viewConversation('${conv.session_id}')" title="Ver conversación">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Último Mensaje</th>
                                <th>Fecha</th>
                                <th>Mensajes</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                `;
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Último Mensaje</th>
                                <th>Fecha</th>
                                <th>Mensajes</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="5">Aún no hay conversaciones</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            container.innerHTML = '<p class="status-message error large">Error al cargar conversaciones</p>';
        }
    }

    async function loadTrainingData() {
        const container = document.getElementById('training-data-list');
        if (!container) return;

        try {
            if (!currentChatbotId) {
                container.innerHTML = '<p class="status-message large">Selecciona un chatbot para ver datos de entrenamiento</p>';
                return;
            }

            const response = await fetch(`${API_URL}/training/data?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                container.innerHTML = data.data.map(item => `
                    <div class="training-data-item">
                        <div class="training-data-info">
                            <div class="training-data-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="training-data-details">
                                <h4>Training Data ${item.training_id}</h4>
                                <div class="training-data-meta">${item.chunks} chunks • Created ${new Date(item.created_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div class="training-data-actions">
                            <button class="btn-icon" onclick="viewTrainingData('${item.training_id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteTrainingData('${item.training_id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="status-message large">No hay datos de entrenamiento disponibles. Sube archivos o añade texto para comenzar el entrenamiento.</p>';
            }
        } catch (error) {
            console.error('Error loading training data:', error);
            container.innerHTML = '<p class="status-message error large">Error al cargar datos de entrenamiento</p>';
        }
    }

    async function loadLeads() {
        const container = document.getElementById('leads-table');
        if (!container) return;

        try {
            if (!currentChatbotId) {
                container.innerHTML = '<p class="status-message large">Selecciona un chatbot para ver contactos</p>';
                return;
            }

            const response = await fetch(`${API_URL}/dashboard/leads?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.leads && data.leads.length > 0) {
                const rows = data.leads.map(lead => `
                    <tr>
                        <td>${escapeHtml(lead.name || 'N/A')}</td>
                        <td>${escapeHtml(lead.email || 'N/A')}</td>
                        <td>${escapeHtml(lead.phone || 'N/A')}</td>
                        <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                        <td>${escapeHtml(lead.source || 'Chat')}</td>
                    </tr>
                `).join('');

                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Fecha</th>
                                <th>Origen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                `;
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Fecha</th>
                                <th>Origen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="5">Aún no se han capturado contactos</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }
        } catch (error) {
            console.error('Error loading leads:', error);
            container.innerHTML = '<p class="status-message error large">Error al cargar contactos</p>';
        }

        // Initialize export button
        const exportBtn = document.getElementById('export-leads');
        if (exportBtn) {
            exportBtn.onclick = exportLeadsToCSV;
        }
    }

    async function exportLeadsToCSV() {
        if (!currentChatbotId) {
            showToast('Por favor, selecciona un chatbot primero', 'error');
            return;
        }

        try {
            window.location.href = `${API_URL}/dashboard/leads/export?chatbotId=${currentChatbotId}`;
            showToast('Exportando contactos...', 'success');
        } catch (error) {
            console.error('Error exporting leads:', error);
            showToast('Error al exportar contactos', 'error');
        }
    }

    async function loadSettings() {
        try {
            const response = await fetch(`${API_URL}/config`);
            const data = await response.json();

            if (data.success && data.config) {
                document.getElementById('openai-model').value = data.config.model || 'gpt-3.5-turbo';
                document.getElementById('system-prompt').value = data.config.systemPrompt || '';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Modals
    function initModals() {
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.remove('active');
            });
        });

        // Close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });
    }

    // Training
    function initTraining() {
        // Upload Files
        document.getElementById('train-files')?.addEventListener('click', function() {
            document.getElementById('upload-modal').classList.add('active');
        });

        // Upload Area
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');

        uploadArea?.addEventListener('click', () => fileInput.click());

        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#007bff';
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#e9ecef';
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#e9ecef';
            const files = e.dataTransfer.files;
            handleFileUpload(files);
        });

        fileInput?.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });

        // Train from URL
        document.getElementById('train-url')?.addEventListener('click', function() {
            document.getElementById('url-modal').classList.add('active');
        });

        document.getElementById('start-url-training')?.addEventListener('click', async function() {
            const url = document.getElementById('training-url').value;
            const crawl = document.getElementById('crawl-subpages').checked;

            if (!url) {
                showToast('Por favor, introduce una URL', 'error');
                return;
            }

            if (!currentChatbotId) {
                showToast('Por favor, selecciona un chatbot primero', 'error');
                return;
            }

            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrenando...';

                const response = await fetch(`${API_URL}/training/url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, crawl, chatbotId: currentChatbotId })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Entrenamiento iniciado correctamente', 'success');
                    document.getElementById('url-modal').classList.remove('active');
                    loadTrainingData();
                } else {
                    showToast(data.error || 'Error en el entrenamiento', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error al iniciar entrenamiento', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-play"></i> Iniciar Entrenamiento';
            }
        });

        // Train from Text
        document.getElementById('train-text')?.addEventListener('click', function() {
            document.getElementById('text-modal').classList.add('active');
        });

        document.getElementById('save-training-text')?.addEventListener('click', async function() {
            const text = document.getElementById('training-text').value;

            if (!text) {
                showToast('Por favor, introduce texto de entrenamiento', 'error');
                return;
            }

            if (!currentChatbotId) {
                showToast('Por favor, selecciona un chatbot primero', 'error');
                return;
            }

            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                const response = await fetch(`${API_URL}/training/text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, chatbotId: currentChatbotId })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Datos de entrenamiento guardados correctamente', 'success');
                    document.getElementById('text-modal').classList.remove('active');
                    document.getElementById('training-text').value = '';
                    loadTrainingData();
                } else {
                    showToast(data.error || 'Error al guardar datos de entrenamiento', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error al guardar datos de entrenamiento', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save"></i> Guardar Datos de Entrenamiento';
            }
        });

        // Refresh Training Data
        document.getElementById('refresh-training')?.addEventListener('click', loadTrainingData);
    }

    async function handleFileUpload(files) {
        if (!files || files.length === 0) return;

        if (!currentChatbotId) {
            showToast('Por favor, selecciona un chatbot primero', 'error');
            return;
        }

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        formData.append('chatbotId', currentChatbotId);

        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const uploadStatus = document.getElementById('upload-status');

        try {
            progressContainer.classList.remove('hidden');
            uploadStatus.textContent = 'Subiendo...';

            const response = await fetch(`${API_URL}/training/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                progressFill.style.width = '100%';
                uploadStatus.textContent = 'Subida completa!';
                showToast('Archivos subidos correctamente', 'success');
                
                setTimeout(() => {
                    document.getElementById('upload-modal').classList.remove('active');
                    progressContainer.classList.add('hidden');
                    progressFill.style.width = '0%';
                    loadTrainingData();
                }, 1500);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error:', error);
            uploadStatus.textContent = 'Subida fallida';
            showToast('Error al subir archivos', 'error');
        }
    }

    // Test Chatbot
    function initTest() {
        const testInput = document.getElementById('test-input');
        const testSend = document.getElementById('test-send');
        const testMessages = document.getElementById('test-messages');

        testSend?.addEventListener('click', sendTestMessage);
        testInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendTestMessage();
        });

        document.getElementById('clear-test-chat')?.addEventListener('click', () => {
            testMessages.innerHTML = `
                <div class="test-message bot">
                    <div class="message-content">¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?</div>
                </div>
            `;
        });
    }

    async function sendTestMessage() {
        const input = document.getElementById('test-input');
        const messagesContainer = document.getElementById('test-messages');
        const message = input.value.trim();

        if (!message) return;

        if (!currentChatbotId) {
            showToast('Por favor, selecciona un chatbot primero', 'error');
            return;
        }

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'test-message user';
        userMsg.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
        messagesContainer.appendChild(userMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        input.value = '';
        input.disabled = true;

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message,
                    chatbotId: currentChatbotId
                })
            });

            const data = await response.json();

            if (data.success) {
                const botMsg = document.createElement('div');
                botMsg.className = 'test-message bot';
                botMsg.innerHTML = `<div class="message-content">${escapeHtml(data.response)}</div>`;
                messagesContainer.appendChild(botMsg);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'test-message bot';
            errorMsg.innerHTML = `<div class="message-content">Lo siento, ocurrió un error al procesar tu mensaje.</div>`;
            messagesContainer.appendChild(errorMsg);
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    // Settings
    function initSettings() {
        // Temperature slider
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperature-value');

        tempSlider?.addEventListener('input', function() {
            tempValue.textContent = this.value;
        });

        // Save Settings
        document.getElementById('save-settings')?.addEventListener('click', async function() {
            const apiKey = document.getElementById('openai-api-key').value;
            const model = document.getElementById('openai-model').value;
            const systemPrompt = document.getElementById('system-prompt').value;
            const temperature = parseFloat(document.getElementById('temperature').value);
            const maxTokens = parseInt(document.getElementById('max-tokens').value);

            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                const response = await fetch(`${API_URL}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey,
                        model,
                        systemPrompt,
                        temperature,
                        maxTokens
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Configuración guardada correctamente', 'success');
                } else {
                    throw new Error(data.error || 'Error al guardar configuración');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error al guardar configuración', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración';
            }
        });

        // Save Chatbot Settings
        document.getElementById('save-chatbot-settings')?.addEventListener('click', function() {
            const name = document.getElementById('chatbot-name-input').value;
            const welcome = document.getElementById('welcome-message').value;

            if (name) {
                document.getElementById('chatbot-name').textContent = name;
            }

            showToast('Configuración del chatbot guardada', 'success');
        });
    }

    // Integrations
    function initIntegrations() {
        document.getElementById('integrate-btn')?.addEventListener('click', function() {
            switchPage('integrations');
        });

        document.getElementById('copy-integration-code')?.addEventListener('click', function() {
            const code = document.getElementById('integration-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Código copiado al portapapeles', 'success');
                this.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                }, 2000);
            });
        });
    }

    // Appearance Settings
    function initAppearance() {
        // Tab switching
        const tabs = document.querySelectorAll('.appearance-tab');
        const tabContents = document.querySelectorAll('.appearance-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Update active content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.dataset.content === targetTab) {
                        content.classList.add('active');
                    }
                });
            });
        });

        // Color palette buttons
        const colorGroups = document.querySelectorAll('.color-group');
        colorGroups.forEach(group => {
            const colorBtns = group.querySelectorAll('.color-btn:not(.color-picker-btn)');
            colorBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    colorBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            // Color picker button
            const pickerBtn = group.querySelector('.color-picker-btn');
            if (pickerBtn) {
                const pickerInput = pickerBtn.parentElement.querySelector('.color-picker-input');
                if (pickerInput) {
                    // Click en el botón abre el selector
                    pickerBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        pickerInput.click();
                    });
                    
                    // Cuando cambia el color
                    pickerInput.addEventListener('change', function() {
                        pickerBtn.style.background = this.value;
                        colorBtns.forEach(b => b.classList.remove('active'));
                        pickerBtn.classList.add('active');
                    });
                }
            }
        });

        // Icon selector
        const iconBtns = document.querySelectorAll('.icon-btn');
        iconBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                iconBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // File upload buttons
        const uploadBoxes = document.querySelectorAll('.file-upload-box');
        uploadBoxes.forEach(box => {
            const uploadBtn = box.querySelector('.btn-upload');
            const fileInput = box.querySelector('input[type="file"]');
            const fileName = box.querySelector('.file-name');
            
            if (uploadBtn && fileInput) {
                uploadBtn.addEventListener('click', function() {
                    fileInput.click();
                });
                
                fileInput.addEventListener('change', function() {
                    if (this.files && this.files[0]) {
                        fileName.textContent = this.files[0].name;
                    } else {
                        fileName.textContent = 'Ningún archivo seleccionado';
                    }
                });
            }
        });

        // Save appearance button
        const saveBtn = document.getElementById('save-appearance');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAppearanceSettings);
        }

        // Load current appearance settings
        loadAppearanceSettings();
    }

    function loadAppearanceSettings() {
        if (!currentChatbotId) return;

        fetch(`${API_URL}/chatbots/${currentChatbotId}/appearance`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.appearance) {
                    applyAppearanceSettings(data.appearance);
                }
            })
            .catch(error => {
                console.error('Error loading appearance:', error);
            });
    }

    function applyAppearanceSettings(settings) {
        // Apply content settings
        if (settings.chatbotName) {
            document.getElementById('chatbot-name').value = settings.chatbotName;
        }
        if (settings.welcomeMessage) {
            document.getElementById('welcome-message').value = settings.welcomeMessage;
        }
        if (settings.inputPlaceholder) {
            document.getElementById('input-placeholder').value = settings.inputPlaceholder;
        }
        
        // Apply toggles
        document.getElementById('display-prompts-vertical').checked = settings.displayPromptsVertical || false;
        document.getElementById('hide-bot-avatar').checked = settings.hideBotAvatar || false;
        document.getElementById('hide-sources').checked = settings.hideSources || false;
        document.getElementById('hide-branding').checked = settings.hideBranding || false;

        // Apply chat bubble settings
        if (settings.chatIconSize) {
            document.getElementById('chat-icon-size').value = settings.chatIconSize;
        }
        if (settings.positionScreen) {
            document.getElementById('position-screen').value = settings.positionScreen;
        }
        if (settings.distanceBottom) {
            document.getElementById('distance-bottom').value = settings.distanceBottom;
        }
        if (settings.distanceSide) {
            document.getElementById('distance-side').value = settings.distanceSide;
        }
        if (settings.bubbleMessage) {
            document.getElementById('bubble-message').value = settings.bubbleMessage;
        }
        if (settings.customBubbleCSS) {
            document.getElementById('custom-bubble-css').value = settings.customBubbleCSS;
        }
    }

    function saveAppearanceSettings() {
        if (!currentChatbotId) {
            showToast('Por favor selecciona un chatbot primero', 'error');
            return;
        }

        const settings = {
            // Content
            chatbotName: document.getElementById('chatbot-name').value,
            welcomeMessage: document.getElementById('welcome-message').value,
            inputPlaceholder: document.getElementById('input-placeholder').value,
            displayPromptsVertical: document.getElementById('display-prompts-vertical').checked,
            hideBotAvatar: document.getElementById('hide-bot-avatar').checked,
            hideSources: document.getElementById('hide-sources').checked,
            hideBranding: document.getElementById('hide-branding').checked,
            
            // Colors
            primaryColor: getActiveColor('.color-group:nth-of-type(1)'),
            headerBg: getActiveColor('.color-group:nth-of-type(2)'),
            headerFont: getActiveColor('.color-group:nth-of-type(3)'),
            userBubbleBg: getActiveColor('.color-group:nth-of-type(4)'),
            promptsBg: getActiveColor('.color-group:nth-of-type(5)'),
            promptsBorder: getActiveColor('.color-group:nth-of-type(6)'),
            promptsFont: getActiveColor('.color-group:nth-of-type(7)'),
            promptsBgHover: getActiveColor('.color-group:nth-of-type(8)'),
            promptsBorderHover: getActiveColor('.color-group:nth-of-type(9)'),
            promptsFontHover: getActiveColor('.color-group:nth-of-type(10)'),
            
            // Chat Bubble
            chatIconSize: document.getElementById('chat-icon-size').value,
            positionScreen: document.getElementById('position-screen').value,
            distanceBottom: document.getElementById('distance-bottom').value,
            distanceSide: document.getElementById('distance-side').value,
            bubbleIcon: getActiveIcon(),
            bubbleBg: getActiveColor('.appearance-tab-content[data-content="chat-bubble"] .color-group:nth-of-type(1)'),
            bubbleIconColor: getActiveColor('.appearance-tab-content[data-content="chat-bubble"] .color-group:nth-of-type(2)'),
            bubbleMessage: document.getElementById('bubble-message').value,
            bubbleMsgBg: getActiveColor('.appearance-tab-content[data-content="chat-bubble"] .color-group:nth-of-type(3)'),
            bubbleMsgColor: getActiveColor('.appearance-tab-content[data-content="chat-bubble"] .color-group:nth-of-type(4)'),
            customBubbleCSS: document.getElementById('custom-bubble-css').value
        };

        fetch(`${API_URL}/chatbots/${currentChatbotId}/appearance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Configuración de apariencia guardada', 'success');
            } else {
                showToast('Error al guardar la configuración', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error al guardar la configuración', 'error');
        });
    }

    function getActiveColor(selector) {
        const group = document.querySelector(selector);
        if (!group) return null;
        
        const activeBtn = group.querySelector('.color-btn.active');
        if (!activeBtn) return null;
        
        if (activeBtn.classList.contains('color-picker-btn')) {
            const input = activeBtn.parentElement.querySelector('.color-picker-input');
            return input ? input.value : null;
        }
        
        return activeBtn.dataset.color;
    }

    function getActiveIcon() {
        const activeIcon = document.querySelector('.icon-btn.active');
        return activeIcon ? activeIcon.dataset.icon : null;
    }

    // Utility Functions
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' days ago';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';
        
        return Math.floor(seconds) + ' seconds ago';
    }

    // Export functions for global use
    window.viewConversation = async function(sessionId) {
        try {
            const response = await fetch(`${API_URL}/dashboard/conversations/${sessionId}`);
            const data = await response.json();

            if (data.success && data.conversation) {
                showConversationModal(sessionId, data.conversation);
            } else {
                showToast('Error al cargar conversación', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al cargar conversación', 'error');
        }
    };

    function showConversationModal(sessionId, messages) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('conversation-modal');
        if (!modal) {
            const modalHTML = `
                <div id="conversation-modal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Conversación: <span id="conv-session-id"></span></h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body scrollable">
                            <div id="conversation-messages"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('conversation-modal');
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('active');
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }

        // Fill modal with conversation
        document.getElementById('conv-session-id').textContent = sessionId.substring(0, 8);
        const messagesContainer = document.getElementById('conversation-messages');
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="conversation-message ${msg.role}">
                <div class="conversation-message-header">
                    ${msg.role === 'user' ? 'Usuario' : 'Asistente'} - ${new Date(msg.timestamp).toLocaleString()}
                </div>
                <div>${escapeHtml(msg.content)}</div>
            </div>
        `).join('');

        modal.classList.add('active');
    }

    window.viewTrainingData = function(id) {
        console.log('View training data:', id);
        showToast('Visor de datos de entrenamiento próximamente', 'info');
    };

    window.deleteTrainingData = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar estos datos de entrenamiento?')) return;
        
        try {
            // Implement delete API call
            showToast('Datos de entrenamiento eliminados', 'success');
            loadTrainingData();
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al eliminar datos de entrenamiento', 'error');
        }
    };

    // Quick Prompts Management
    let currentPrompts = [];
    let currentEditingPromptId = null;

    function initQuickPrompts() {
        // Add prompt button
        const addPromptBtn = document.getElementById('add-prompt-btn');
        if (addPromptBtn) {
            addPromptBtn.addEventListener('click', () => {
                currentEditingPromptId = null;
                document.getElementById('prompt-modal-title').textContent = 'Añadir Respuesta Rápida';
                document.getElementById('prompt-button-title').value = '';
                document.getElementById('prompt-link').value = '';
                document.getElementById('prompt-text').value = '';
                document.getElementById('prompt-modal').classList.add('active');
            });
        }

        // Modal buttons
        const cancelBtn = document.getElementById('cancel-prompt-btn');
        const saveBtn = document.getElementById('save-prompt-btn');
        const modal = document.getElementById('prompt-modal');

        cancelBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        saveBtn?.addEventListener('click', saveQuickPrompt);

        // Close modal on backdrop click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // Close button
        const closeBtn = modal?.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Load prompts when chatbot changes
        loadQuickPrompts();
    }

    async function loadQuickPrompts() {
        if (!currentChatbotId) {
            document.getElementById('prompts-list').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bolt"></i>
                    <h3>Selecciona un chatbot</h3>
                    <p>Selecciona un chatbot para ver y gestionar sus respuestas rápidas.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/quick-prompts?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success) {
                currentPrompts = data.prompts;
                renderQuickPrompts();
            }
        } catch (error) {
            console.error('Error loading quick prompts:', error);
            showToast('Error al cargar respuestas rápidas', 'error');
        }
    }

    function renderQuickPrompts() {
        const container = document.getElementById('prompts-list');
        
        if (currentPrompts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bolt"></i>
                    <h3>No hay respuestas rápidas configuradas</h3>
                    <p>Crea botones rápidos para que tus usuarios puedan acceder fácilmente a información o iniciar conversaciones específicas.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentPrompts.map(prompt => `
            <div class="prompt-card">
                <div class="prompt-card-content">
                    <div class="prompt-icon">
                        <i class="fas ${prompt.link ? 'fa-external-link-alt' : 'fa-comment-dots'}"></i>
                    </div>
                    <div class="prompt-details">
                        <div class="prompt-title">
                            ${escapeHtml(prompt.button_title)}
                            ${prompt.link ? '<span class="prompt-badge link-badge"><i class="fas fa-link"></i> Link</span>' : ''}
                            ${prompt.prompt ? '<span class="prompt-badge prompt-badge-type"><i class="fas fa-message"></i> Prompt</span>' : ''}
                        </div>
                        <div class="prompt-info">
                            ${prompt.link ? `
                                <a href="${escapeHtml(prompt.link)}" target="_blank" class="prompt-link">
                                    <i class="fas fa-external-link-alt"></i>
                                    ${escapeHtml(prompt.link)}
                                </a>
                            ` : ''}
                            ${prompt.prompt ? `
                                <div class="prompt-text">${escapeHtml(prompt.prompt)}</div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="prompt-actions">
                        <button class="btn-prompt-action btn-update" onclick="editQuickPrompt('${prompt.id}')" title="Editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-prompt-action btn-delete" onclick="deleteQuickPrompt('${prompt.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function saveQuickPrompt() {
        const buttonTitle = document.getElementById('prompt-button-title').value.trim();
        const link = document.getElementById('prompt-link').value.trim();
        const prompt = document.getElementById('prompt-text').value.trim();

        // Validations
        if (!buttonTitle) {
            showToast('El título del botón es obligatorio', 'error');
            return;
        }

        if (!link && !prompt) {
            showToast('Debes proporcionar un link o un prompt', 'error');
            return;
        }

        const promptData = {
            chatbotId: currentChatbotId,
            buttonTitle,
            link: link || null,
            prompt: prompt || null
        };

        try {
            const url = currentEditingPromptId 
                ? `${API_URL}/quick-prompts/${currentEditingPromptId}`
                : `${API_URL}/quick-prompts`;
            
            const method = currentEditingPromptId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promptData)
            });

            const data = await response.json();

            if (data.success) {
                showToast(
                    currentEditingPromptId ? 'Respuesta rápida actualizada' : 'Respuesta rápida creada',
                    'success'
                );
                document.getElementById('prompt-modal').classList.remove('active');
                loadQuickPrompts();
            } else {
                showToast(data.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('Error saving quick prompt:', error);
            showToast('Error al guardar la respuesta rápida', 'error');
        }
    }

    window.editQuickPrompt = async function(promptId) {
        currentEditingPromptId = promptId;
        const prompt = currentPrompts.find(p => p.id === promptId);
        
        if (!prompt) return;

        document.getElementById('prompt-modal-title').textContent = 'Editar Respuesta Rápida';
        document.getElementById('prompt-button-title').value = prompt.button_title;
        document.getElementById('prompt-link').value = prompt.link || '';
        document.getElementById('prompt-text').value = prompt.prompt || '';
        document.getElementById('prompt-modal').classList.add('active');
    };

    window.deleteQuickPrompt = async function(promptId) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta respuesta rápida?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/quick-prompts/${promptId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showToast('Respuesta rápida eliminada', 'success');
                loadQuickPrompts();
            } else {
                showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Error deleting quick prompt:', error);
            showToast('Error al eliminar la respuesta rápida', 'error');
        }
    };

    // Functions Management
    let currentFunctions = [];
    let currentEditingFunctionId = null;

    function initFunctions() {
        // Add function button
        const addFunctionBtn = document.getElementById('add-function-btn');
        if (addFunctionBtn) {
            addFunctionBtn.addEventListener('click', () => {
                currentEditingFunctionId = null;
                openFunctionModal();
            });
        }

        // Save function button
        const saveFunctionBtn = document.getElementById('save-function-btn');
        if (saveFunctionBtn) {
            saveFunctionBtn.addEventListener('click', saveFunction);
        }

        // Add parameter button
        const addParamBtn = document.getElementById('add-parameter-btn');
        if (addParamBtn) {
            addParamBtn.addEventListener('click', addParameterField);
        }

        // Load functions when page is active
        const functionsNavItem = document.querySelector('[data-page="functions"]');
        if (functionsNavItem) {
            functionsNavItem.addEventListener('click', loadFunctions);
        }
    }

    function openFunctionModal(functionData = null) {
        const modal = document.getElementById('function-modal');
        const title = document.getElementById('function-modal-title');
        
        if (functionData) {
            title.textContent = 'Editar Función';
            currentEditingFunctionId = functionData.id;
            
            document.getElementById('function-name').value = functionData.name;
            document.getElementById('function-description').value = functionData.description;
            document.getElementById('function-endpoint').value = functionData.endpoint;
            document.getElementById('function-method').value = functionData.method;
            document.getElementById('function-headers').value = functionData.headers || '';
            document.getElementById('function-enabled').checked = functionData.enabled;
            
            // Load parameters
            const paramsList = document.getElementById('parameters-list');
            paramsList.innerHTML = '';
            if (functionData.parameters) {
                functionData.parameters.forEach(param => {
                    addParameterField(param);
                });
            }
        } else {
            title.textContent = 'Crear Función';
            currentEditingFunctionId = null;
            
            document.getElementById('function-name').value = '';
            document.getElementById('function-description').value = '';
            document.getElementById('function-endpoint').value = '';
            document.getElementById('function-method').value = 'POST';
            document.getElementById('function-headers').value = '';
            document.getElementById('function-enabled').checked = true;
            
            document.getElementById('parameters-list').innerHTML = '';
        }
        
        modal.classList.add('active');
    }

    function addParameterField(paramData = null) {
        const paramsList = document.getElementById('parameters-list');
        const paramId = Date.now();
        
        const paramHTML = `
            <div class="parameter-item" data-param-id="${paramId}">
                <div class="parameter-field">
                    <label>Nombre *</label>
                    <input type="text" class="param-name" placeholder="nombre_parametro" value="${paramData?.name || ''}" required>
                </div>
                <div class="parameter-field">
                    <label>Tipo *</label>
                    <select class="param-type">
                        <option value="string" ${paramData?.type === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${paramData?.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${paramData?.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="array" ${paramData?.type === 'array' ? 'selected' : ''}>Array</option>
                        <option value="object" ${paramData?.type === 'object' ? 'selected' : ''}>Object</option>
                    </select>
                </div>
                <div class="parameter-field">
                    <label>Descripción</label>
                    <input type="text" class="param-description" placeholder="Descripción del parámetro" value="${paramData?.description || ''}">
                    <div class="param-required">
                        <input type="checkbox" class="param-required-check" ${paramData?.required ? 'checked' : ''}>
                        <span>Requerido</span>
                    </div>
                </div>
                <button type="button" class="btn-remove-param" onclick="removeParameter(${paramId})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        paramsList.insertAdjacentHTML('beforeend', paramHTML);
    }

    window.removeParameter = function(paramId) {
        const paramItem = document.querySelector(`[data-param-id="${paramId}"]`);
        if (paramItem) {
            paramItem.remove();
        }
    };

    async function saveFunction() {
        if (!currentChatbotId) {
            showToast('Por favor selecciona un chatbot primero', 'error');
            return;
        }

        const name = document.getElementById('function-name').value.trim();
        const description = document.getElementById('function-description').value.trim();
        const endpoint = document.getElementById('function-endpoint').value.trim();
        const method = document.getElementById('function-method').value;
        const headers = document.getElementById('function-headers').value.trim();
        const enabled = document.getElementById('function-enabled').checked;

        if (!name || !description || !endpoint) {
            showToast('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        // Validate function name format
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            showToast('El nombre de la función solo puede contener letras, números y guiones bajos', 'error');
            return;
        }

        // Get parameters
        const parameters = [];
        document.querySelectorAll('.parameter-item').forEach(item => {
            const paramName = item.querySelector('.param-name').value.trim();
            const paramType = item.querySelector('.param-type').value;
            const paramDescription = item.querySelector('.param-description').value.trim();
            const paramRequired = item.querySelector('.param-required-check').checked;

            if (paramName) {
                parameters.push({
                    name: paramName,
                    type: paramType,
                    description: paramDescription,
                    required: paramRequired
                });
            }
        });

        // Validate headers JSON
        let parsedHeaders = null;
        if (headers) {
            try {
                parsedHeaders = JSON.parse(headers);
            } catch (e) {
                showToast('Los headers deben ser un JSON válido', 'error');
                return;
            }
        }

        const functionData = {
            name,
            description,
            endpoint,
            method,
            headers: headers || null,
            parameters,
            enabled,
            chatbotId: currentChatbotId
        };

        try {
            const url = currentEditingFunctionId 
                ? `${API_URL}/functions/${currentEditingFunctionId}`
                : `${API_URL}/functions`;
            
            const response = await fetch(url, {
                method: currentEditingFunctionId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(functionData)
            });

            const data = await response.json();

            if (data.success) {
                showToast(`Función ${currentEditingFunctionId ? 'actualizada' : 'creada'} exitosamente`, 'success');
                document.getElementById('function-modal').classList.remove('active');
                loadFunctions();
            } else {
                showToast(data.error || 'Error al guardar la función', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al guardar la función', 'error');
        }
    }

    async function loadFunctions() {
        if (!currentChatbotId) {
            document.getElementById('functions-list').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-code"></i>
                    <h3>Selecciona un chatbot</h3>
                    <p>Por favor selecciona un chatbot para ver y gestionar sus funciones.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/functions?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success) {
                currentFunctions = data.functions || [];
                renderFunctions(currentFunctions);
            }
        } catch (error) {
            console.error('Error loading functions:', error);
            showToast('Error al cargar las funciones', 'error');
        }
    }

    function renderFunctions(functions) {
        const functionsListEl = document.getElementById('functions-list');

        if (!functions || functions.length === 0) {
            functionsListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-code"></i>
                    <h3>No hay funciones configuradas</h3>
                    <p>Las funciones permiten que tu chatbot realice acciones específicas como buscar información, realizar cálculos o conectarse con APIs externas.</p>
                </div>
            `;
            return;
        }

        functionsListEl.innerHTML = functions.map(func => `
            <div class="function-card">
                <div class="function-card-header">
                    <div class="function-info">
                        <h3 class="function-name">${escapeHtml(func.name)}</h3>
                        <p class="function-description-text">${escapeHtml(func.description)}</p>
                        <div>
                            <span class="function-method ${func.method.toLowerCase()}">${func.method}</span>
                            <span class="function-endpoint">${escapeHtml(func.endpoint)}</span>
                        </div>
                        ${func.parameters && func.parameters.length > 0 ? `
                            <div class="function-parameters">
                                <div class="function-parameters-title">Parámetros</div>
                                <div>
                                    ${func.parameters.map(param => `
                                        <span class="parameter-badge">
                                            <span class="param-name">${escapeHtml(param.name)}</span>
                                            <span class="param-type">(${param.type})</span>
                                            ${param.required ? '<span class="param-required">*</span>' : ''}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="function-actions">
                        <div class="function-status">
                            <div class="status-indicator ${func.enabled ? 'enabled' : 'disabled'}"></div>
                            <span class="status-text">${func.enabled ? 'Habilitada' : 'Deshabilitada'}</span>
                        </div>
                        <button class="btn-icon" onclick="editFunction('${func.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteFunction('${func.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.editFunction = function(functionId) {
        const func = currentFunctions.find(f => f.id === functionId);
        if (func) {
            openFunctionModal(func);
        }
    };

    window.deleteFunction = async function(functionId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta función?')) return;

        try {
            const response = await fetch(`${API_URL}/functions/${functionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showToast('Función eliminada exitosamente', 'success');
                loadFunctions();
            } else {
                showToast(data.error || 'Error al eliminar la función', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al eliminar la función', 'error');
        }
    };

    // Load Usage Indicator
    async function loadUsageIndicator() {
        if (!currentChatbotId) return;

        try {
            const response = await fetch(`${API_URL}/usage/${currentChatbotId}`);
            const data = await response.json();

            if (data.success) {
                const { messagesUsed, messagesLimit, usagePercentage } = data.usage;
                
                // Update counter
                const usageCount = document.getElementById('usage-count');
                if (usageCount) {
                    usageCount.textContent = `${messagesUsed.toLocaleString()}/${messagesLimit.toLocaleString()}`;
                }

                // Update progress bar
                const usageBarFill = document.getElementById('usage-bar-fill');
                if (usageBarFill) {
                    usageBarFill.style.width = `${usagePercentage}%`;
                    
                    // Change color based on usage
                    if (usagePercentage >= 90) {
                        usageBarFill.setAttribute('data-critical', 'true');
                        usageBarFill.removeAttribute('data-warning');
                    } else if (usagePercentage >= 75) {
                        usageBarFill.setAttribute('data-warning', 'true');
                        usageBarFill.removeAttribute('data-critical');
                    } else {
                        usageBarFill.removeAttribute('data-warning');
                        usageBarFill.removeAttribute('data-critical');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading usage indicator:', error);
        }
    }

})();
