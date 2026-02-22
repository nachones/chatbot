// Quick Prompts Page JavaScript
(function () {
    'use strict';

    const API_URL = '/api';
    let currentChatbotId = null;
    let editingPromptId = null;

    document.addEventListener('DOMContentLoaded', function () {
        initPromptsPage();
    });

    function initPromptsPage() {
        // Monitor for chatbot changes
        setInterval(() => {
            if (window.dashboardApp && window.dashboardApp.getCurrentChatbotId) {
                const chatbotId = window.dashboardApp.getCurrentChatbotId();
                if (chatbotId !== currentChatbotId) {
                    currentChatbotId = chatbotId;
                    loadPrompts();
                }
            }
        }, 1000);

        // Add prompt button
        const addBtn = document.getElementById('add-prompt-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openPromptModal());
        }

        // Modal buttons
        const saveBtn = document.getElementById('save-prompt-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', savePrompt);
        }

        const cancelBtn = document.getElementById('cancel-prompt-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closePromptModal);
        }

        // Modal close handlers
        const modal = document.getElementById('prompt-modal');
        if (modal) {
            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', closePromptModal);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closePromptModal();
            });
        }
    }

    async function loadPrompts() {
        if (!currentChatbotId) return;

        const container = document.getElementById('prompts-list');
        if (!container) return;

        try {
            const response = await authFetch(`${API_URL}/quick-prompts?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.prompts && data.prompts.length > 0) {
                renderPrompts(data.prompts);
            } else {
                showEmptyState(container);
            }
        } catch (error) {
            console.error('Error loading prompts:', error);
            showEmptyState(container);
        }
    }

    function renderPrompts(prompts) {
        const container = document.getElementById('prompts-list');
        if (!container) return;

        container.innerHTML = prompts.map((prompt, index) => `
            <div class="prompt-card" data-id="${prompt.id}">
                <div class="prompt-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="prompt-content">
                    <div class="prompt-header">
                        <span class="prompt-title">
                            <i class="fas fa-bolt"></i> ${escapeHtml(prompt.button_title)}
                        </span>
                        <span class="prompt-type ${prompt.link ? 'type-link' : 'type-prompt'}">
                            ${prompt.link ? '<i class="fas fa-external-link-alt"></i> Enlace' : '<i class="fas fa-comment"></i> Mensaje'}
                        </span>
                    </div>
                    <p class="prompt-preview">
                        ${prompt.link ? escapeHtml(prompt.link) : escapeHtml(prompt.prompt || '')}
                    </p>
                </div>
                <div class="prompt-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.editPrompt('${prompt.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.deletePrompt('${prompt.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bolt"></i>
                <h3>No hay respuestas rápidas configuradas</h3>
                <p>Crea botones rápidos para que tus usuarios puedan acceder fácilmente a información o iniciar conversaciones específicas.</p>
            </div>
        `;
    }

    function openPromptModal(promptId = null) {
        editingPromptId = promptId;
        
        // Reset form
        document.getElementById('prompt-button-title').value = '';
        document.getElementById('prompt-link').value = '';
        document.getElementById('prompt-text').value = '';

        // Update modal title
        const title = document.getElementById('prompt-modal-title');
        if (title) {
            title.textContent = promptId ? 'Editar Respuesta Rápida' : 'Añadir Respuesta Rápida';
        }

        // If editing, load prompt data
        if (promptId) {
            loadPromptData(promptId);
        }

        // Show modal
        const modal = document.getElementById('prompt-modal');
        if (modal) modal.classList.add('active');
    }

    async function loadPromptData(promptId) {
        try {
            const response = await authFetch(`${API_URL}/quick-prompts/${promptId}`);
            const data = await response.json();

            if (data.success && data.prompt) {
                const prompt = data.prompt;
                document.getElementById('prompt-button-title').value = prompt.button_title || '';
                document.getElementById('prompt-link').value = prompt.link || '';
                document.getElementById('prompt-text').value = prompt.prompt || '';
            }
        } catch (error) {
            console.error('Error loading prompt:', error);
            showError('Error al cargar la respuesta rápida');
        }
    }

    function closePromptModal() {
        const modal = document.getElementById('prompt-modal');
        if (modal) modal.classList.remove('active');
        editingPromptId = null;
    }

    async function savePrompt() {
        const buttonTitle = document.getElementById('prompt-button-title')?.value?.trim();
        const link = document.getElementById('prompt-link')?.value?.trim();
        const prompt = document.getElementById('prompt-text')?.value?.trim();

        // Validation
        if (!buttonTitle) {
            showError('El título del botón es requerido');
            return;
        }

        if (!link && !prompt) {
            showError('Debes proporcionar un enlace o un mensaje');
            return;
        }

        // Validate URL if provided
        if (link && !isValidUrl(link)) {
            showError('El enlace debe ser una URL válida');
            return;
        }

        const promptData = {
            chatbotId: currentChatbotId,
            buttonTitle: buttonTitle,
            link: link || null,
            prompt: prompt || null
        };

        try {
            showLoading('Guardando...');

            const url = editingPromptId 
                ? `${API_URL}/quick-prompts/${editingPromptId}`
                : `${API_URL}/quick-prompts`;
            
            const response = await authFetch(url, {
                method: editingPromptId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promptData)
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showSuccess(editingPromptId ? 'Respuesta rápida actualizada' : 'Respuesta rápida creada');
                closePromptModal();
                loadPrompts();
            } else {
                showError(data.error || 'Error al guardar');
            }
        } catch (error) {
            hideLoading();
            console.error('Error saving prompt:', error);
            showError('Error al guardar la respuesta rápida');
        }
    }

    window.editPrompt = function(id) {
        openPromptModal(id);
    };

    window.deletePrompt = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta rápida?')) {
            return;
        }

        try {
            const response = await authFetch(`${API_URL}/quick-prompts/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Respuesta rápida eliminada');
                loadPrompts();
            } else {
                showError('Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting prompt:', error);
            showError('Error al eliminar la respuesta rápida');
        }
    };

    // Utility functions (escapeHtml, showSuccess, showError → utils.js)

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function showLoading(message) {
        let loading = document.getElementById('prompts-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'prompts-loading';
            loading.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            document.body.appendChild(loading);
        }
        loading.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="color: #6366f1;"></i>
            <span>${message}</span>
        `;
        loading.style.display = 'flex';
    }

    function hideLoading() {
        const loading = document.getElementById('prompts-loading');
        if (loading) loading.style.display = 'none';
    }

})();
