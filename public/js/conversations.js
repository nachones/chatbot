// Conversations Page JavaScript
(function () {
    'use strict';

    const API_URL = '/api';
    let currentChatbotId = null;
    let currentSessionId = null;
    let allConversations = [];
    let currentPage = 1;
    const pageSize = 20;

    document.addEventListener('DOMContentLoaded', function () {
        initConversationsPage();
    });

    function initConversationsPage() {
        // Monitor for chatbot changes
        setInterval(() => {
            if (window.dashboardApp && window.dashboardApp.getCurrentChatbotId) {
                const chatbotId = window.dashboardApp.getCurrentChatbotId();
                if (chatbotId !== currentChatbotId) {
                    currentChatbotId = chatbotId;
                    loadConversations();
                }
            }
        }, 1000);

        // Search functionality
        const searchInput = document.getElementById('conversation-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    filterConversations(e.target.value);
                }, 300);
            });
        }

        // Filter chips
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const filter = chip.getAttribute('data-filter');
                applyFilter(filter);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-conversations');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadConversations());
        }

        // Export chat button
        const exportBtn = document.getElementById('export-chat');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => exportCurrentChat());
        }

        // Delete chat button
        const deleteBtn = document.getElementById('delete-chat');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteCurrentChat());
        }
    }

    async function loadConversations() {
        if (!currentChatbotId) return;

        const listContainer = document.getElementById('conversations-list');
        if (!listContainer) return;

        try {
            // Show loading
            listContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando conversaciones...</p>
                </div>
            `;

            const response = await authFetch(
                `${API_URL}/dashboard/conversations?chatbotId=${currentChatbotId}&page=${currentPage}&limit=${pageSize}`
            );
            const data = await response.json();

            if (data.success) {
                allConversations = data.conversations || [];
                renderConversationsList(allConversations);
                updateCounts(allConversations);
            } else {
                showEmptyState(listContainer);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            showEmptyState(listContainer);
        }
    }

    function renderConversationsList(conversations) {
        const listContainer = document.getElementById('conversations-list');
        if (!listContainer) return;

        if (!conversations || conversations.length === 0) {
            showEmptyState(listContainer);
            return;
        }

        listContainer.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${currentSessionId === conv.session_id ? 'active' : ''}" 
                 data-session="${conv.session_id}"
                 onclick="window.selectConversation('${conv.session_id}')">
                <div class="conversation-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="conversation-info">
                    <div class="conversation-name">
                        Usuario ${conv.session_id.slice(-6)}
                    </div>
                    <div class="conversation-preview">
                        ${escapeHtml(truncateText(conv.last_message || 'Sin mensajes', 50))}
                    </div>
                </div>
                <div class="conversation-meta">
                    <div class="conversation-time">${formatRelativeTime(conv.last_message_time)}</div>
                    <div class="conversation-count">${conv.message_count} msgs</div>
                </div>
            </div>
        `).join('');
    }

    function showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-comments"></i>
                <p>No hay conversaciones aún</p>
            </div>
        `;
    }

    window.selectConversation = async function(sessionId) {
        currentSessionId = sessionId;

        // Update active state in list
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-session') === sessionId) {
                item.classList.add('active');
            }
        });

        // Show chat content, hide empty state
        const emptyState = document.getElementById('chat-empty-state');
        const chatContent = document.getElementById('chat-content');

        if (emptyState) emptyState.classList.add('hidden');
        if (chatContent) chatContent.classList.remove('hidden');

        // Update header
        const userNameEl = document.getElementById('chat-user-name');
        const sessionIdEl = document.getElementById('chat-session-id');
        if (userNameEl) userNameEl.textContent = `Usuario ${sessionId.slice(-6)}`;
        if (sessionIdEl) sessionIdEl.textContent = sessionId;

        // Load messages
        await loadChatMessages(sessionId);
    };

    async function loadChatMessages(sessionId) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        try {
            messagesContainer.innerHTML = `
                <div class="loading-messages">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
            `;

            const response = await authFetch(`${API_URL}/dashboard/conversations/${sessionId}`);
            const data = await response.json();

            if (data.success && data.conversation) {
                renderMessages(data.conversation);
            } else {
                messagesContainer.innerHTML = '<p class="no-messages">No hay mensajes</p>';
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = '<p class="error-message">Error al cargar mensajes</p>';
        }
    }

    function renderMessages(messages) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = '<p class="no-messages">No hay mensajes en esta conversación</p>';
            return;
        }

        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message-wrapper ${msg.role}">
                <div class="message-avatar">
                    <i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${formatMessageContent(msg.content)}</div>
                    <div class="message-time">${formatTime(msg.timestamp)}</div>
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function filterConversations(searchTerm) {
        if (!searchTerm) {
            renderConversationsList(allConversations);
            return;
        }

        const filtered = allConversations.filter(conv => 
            conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.session_id.toLowerCase().includes(searchTerm.toLowerCase())
        );

        renderConversationsList(filtered);
    }

    function applyFilter(filter) {
        const now = new Date();
        let filtered = allConversations;

        switch (filter) {
            case 'today':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                filtered = allConversations.filter(conv => 
                    new Date(conv.last_message_time) >= today
                );
                break;
            case 'week':
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                filtered = allConversations.filter(conv => 
                    new Date(conv.last_message_time) >= weekAgo
                );
                break;
            case 'all':
            default:
                filtered = allConversations;
        }

        renderConversationsList(filtered);
    }

    function updateCounts(conversations) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const countAll = document.getElementById('count-all');
        const countToday = document.getElementById('count-today');

        if (countAll) countAll.textContent = conversations.length;
        if (countToday) {
            const todayCount = conversations.filter(conv => 
                new Date(conv.last_message_time) >= today
            ).length;
            countToday.textContent = todayCount;
        }
    }

    async function exportCurrentChat() {
        if (!currentSessionId) {
            showError('Selecciona una conversación primero');
            return;
        }

        try {
            const response = await authFetch(`${API_URL}/dashboard/conversations/${currentSessionId}`);
            const data = await response.json();

            if (data.success && data.conversation) {
                // Create text content
                let textContent = `Conversación: ${currentSessionId}\n`;
                textContent += `Exportada: ${new Date().toLocaleString('es-ES')}\n`;
                textContent += '='.repeat(50) + '\n\n';

                data.conversation.forEach(msg => {
                    const time = formatTime(msg.timestamp);
                    const role = msg.role === 'user' ? 'Usuario' : 'Bot';
                    textContent += `[${time}] ${role}:\n${msg.content}\n\n`;
                });

                // Download file
                const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `conversacion-${currentSessionId.slice(-8)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showSuccess('Conversación exportada');
            }
        } catch (error) {
            console.error('Error exporting chat:', error);
            showError('Error al exportar la conversación');
        }
    }

    async function deleteCurrentChat() {
        if (!currentSessionId) {
            showError('Selecciona una conversación primero');
            return;
        }

        if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await authFetch(`${API_URL}/dashboard/conversations/${currentSessionId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                showSuccess('Conversación eliminada');
                currentSessionId = null;
                
                // Hide chat content
                const emptyState = document.getElementById('chat-empty-state');
                const chatContent = document.getElementById('chat-content');
                if (emptyState) emptyState.classList.remove('hidden');
                if (chatContent) chatContent.classList.add('hidden');

                // Reload conversations
                loadConversations();
            } else {
                showError('Error al eliminar la conversación');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            showError('Error al eliminar la conversación');
        }
    }

    // Utility functions (escapeHtml, showSuccess, showError → utils.js)

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    function formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatMessageContent(content) {
        // Basic markdown-like formatting
        let formatted = escapeHtml(content);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    // Expose function for global access
    window.conversationsApp = {
        loadConversations,
        selectConversation: window.selectConversation
    };

})();
