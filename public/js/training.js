// Training Page JavaScript
(function () {
    'use strict';

    const API_URL = '/api';
    let currentChatbotId = null;

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        initTrainingPage();
    });

    function initTrainingPage() {
        // Get current chatbot ID from main dashboard
        setInterval(() => {
            if (window.dashboardApp && window.dashboardApp.getCurrentChatbotId) {
                const chatbotId = window.dashboardApp.getCurrentChatbotId();
                if (chatbotId !== currentChatbotId) {
                    currentChatbotId = chatbotId;
                    loadTrainingData();
                }
            }
        }, 1000);

        // File upload
        const uploadBtn = document.getElementById('btn-upload-files');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => openFileUpload());
        }

        // URL training
        const urlBtn = document.getElementById('btn-add-url');
        if (urlBtn) {
            urlBtn.addEventListener('click', () => openUrlDialog());
        }

        // Text training
        const textBtn = document.getElementById('btn-add-text');
        if (textBtn) {
            textBtn.addEventListener('click', () => openTextDialog());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-training');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadTrainingData());
        }

        // Load initial data
        loadTrainingData();
    }

    // File Upload
    function openFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.pdf,.docx,.txt,.md';

        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                await uploadFiles(files);
            }
        });

        input.click();
    }

    async function uploadFiles(files) {
        if (!currentChatbotId) {
            showError('Por favor selecciona un chatbot primero');
            return;
        }

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('chatbotId', currentChatbotId);

        try {
            showLoading('Subiendo archivos...');

            const response = await fetch(`${API_URL}/training/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            hideLoading();

            if (data.success) {
                showSuccess(`${files.length} archivo(s) subido(s) exitosamente`);
                loadTrainingData();
            } else {
                showError(data.error || 'Error al subir archivos');
            }
        } catch (error) {
            hideLoading();
            console.error('Error uploading files:', error);
            showError('Error al subir archivos');
        }
    }

    // URL Training
    function openUrlDialog() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('url-training-modal');
        if (!modal) {
            modal = createUrlModal();
        }

        // Show modal
        modal.classList.add('active');

        // Focus on input
        const input = document.getElementById('training-url-input');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    }

    function createUrlModal() {
        const modal = document.createElement('div');
        modal.id = 'url-training-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-globe"></i> Entrenar desde URL</h2>
                    <button class="close-modal" aria-label="Cerrar modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="training-url-input">URL del sitio web</label>
                        <input type="url" id="training-url-input" class="form-control" 
                               placeholder="https://ejemplo.com" 
                               aria-label="URL del sitio web">
                        <small class="form-text">Introduce la URL de la página web que quieres que tu chatbot aprenda</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-url-modal">Cancelar</button>
                    <button class="btn btn-primary" id="submit-url-training">
                        <i class="fas fa-check"></i> Procesar URL
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => closeUrlModal());
        modal.querySelector('.close-url-modal').addEventListener('click', () => closeUrlModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeUrlModal();
        });

        // Submit handler
        modal.querySelector('#submit-url-training').addEventListener('click', () => {
            const input = document.getElementById('training-url-input');
            const url = input.value.trim();
            if (url) {
                trainFromUrl(url);
                closeUrlModal();
            } else {
                showError('Por favor ingresa una URL válida');
            }
        });

        // Enter key handler
        modal.querySelector('#training-url-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('#submit-url-training').click();
            }
        });

        return modal;
    }

    function closeUrlModal() {
        const modal = document.getElementById('url-training-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async function trainFromUrl(url) {
        if (!currentChatbotId) {
            showError('Por favor selecciona un chatbot primero');
            return;
        }

        try {
            showLoading('Procesando URL...');

            const response = await fetch(`${API_URL}/training/url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    chatbotId: currentChatbotId
                })
            });

            const data = await response.json();

            hideLoading();

            if (data.success) {
                showSuccess('URL procesada exitosamente');
                loadTrainingData();
            } else {
                showError(data.error || 'Error al procesar URL');
            }
        } catch (error) {
            hideLoading();
            console.error('Error training from URL:', error);
            showError('Error al procesar URL');
        }
    }

    // Text Training
    function openTextDialog() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('text-training-modal');
        if (!modal) {
            modal = createTextModal();
        }

        // Show modal
        modal.classList.add('active');

        // Focus on textarea
        const textarea = document.getElementById('training-text-input');
        if (textarea) {
            textarea.value = '';
            setTimeout(() => textarea.focus(), 100);
        }
    }

    function createTextModal() {
        const modal = document.createElement('div');
        modal.id = 'text-training-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Entrenar con Texto</h2>
                    <button class="close-modal" aria-label="Cerrar modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="training-text-input">Contenido de entrenamiento</label>
                        <textarea id="training-text-input" class="form-control" rows="8" 
                                  placeholder="Escribe aquí el contenido que quieres que tu chatbot aprenda...

Por ejemplo:
- Preguntas frecuentes
- Información de productos
- Políticas de la empresa" 
                                  aria-label="Contenido de entrenamiento"></textarea>
                        <small class="form-text">Escribe la información que quieres que tu chatbot conozca</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-text-modal">Cancelar</button>
                    <button class="btn btn-primary" id="submit-text-training">
                        <i class="fas fa-check"></i> Añadir Contenido
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => closeTextModal());
        modal.querySelector('.close-text-modal').addEventListener('click', () => closeTextModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTextModal();
        });

        // Submit handler
        modal.querySelector('#submit-text-training').addEventListener('click', () => {
            const textarea = document.getElementById('training-text-input');
            const text = textarea.value.trim();
            if (text) {
                trainFromText(text);
                closeTextModal();
            } else {
                showError('Por favor ingresa algún contenido');
            }
        });

        return modal;
    }

    function closeTextModal() {
        const modal = document.getElementById('text-training-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async function trainFromText(text) {
        if (!currentChatbotId) {
            showError('Por favor selecciona un chatbot primero');
            return;
        }

        try {
            showLoading('Procesando texto...');

            const response = await fetch(`${API_URL}/training/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    chatbotId: currentChatbotId
                })
            });

            const data = await response.json();

            hideLoading();

            if (data.success) {
                showSuccess('Texto agregado exitosamente');
                loadTrainingData();
            } else {
                showError(data.error || 'Error al procesar texto');
            }
        } catch (error) {
            hideLoading();
            console.error('Error training from text:', error);
            showError('Error al procesar texto');
        }
    }

    // Load Training Data
    async function loadTrainingData() {
        if (!currentChatbotId) return;

        const container = document.getElementById('training-data-list');
        if (!container) return;

        try {
            const response = await fetch(`${API_URL}/training/data/${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.trainingData && data.trainingData.length > 0) {
                renderTrainingData(data.trainingData);
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading training data:', error);
            showEmptyState();
        }
    }

    function renderTrainingData(trainingData) {
        const container = document.getElementById('training-data-list');
        if (!container) return;

        container.innerHTML = trainingData.map(item => `
            <div class="training-item">
                <div class="training-item-header">
                    <div class="training-item-icon">
                        <i class="fas ${getIconForType(item.type)}"></i>
                    </div>
                    <div class="training-item-info">
                        <div class="training-item-title">${escapeHtml(item.title || item.source)}</div>
                        <div class="training-item-meta">
                            <span><i class="fas fa-layer-group"></i> ${item.chunks || 1} fragmentos</span>
                            <span><i class="fas fa-calendar"></i> ${formatDate(item.created_at)}</span>
                            <span><i class="fas fa-file-alt"></i> ${formatSize(item.totalChars || item.content?.length || 0)}</span>
                            ${item.withEmbeddings > 0 
                                ? `<span style="color:#10b981"><i class="fas fa-brain"></i> Embeddings</span>` 
                                : `<span style="color:#f59e0b"><i class="fas fa-search"></i> Palabras clave</span>`}
                        </div>
                    </div>
                    <button class="btn-delete" onclick="window.deleteTrainingItem('${item.id}')" aria-label="Eliminar dato de entrenamiento">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function showEmptyState() {
        const container = document.getElementById('training-data-list');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <div class="empty-state-title">No hay datos de entrenamiento</div>
                <div class="empty-state-description">
                    Comienza subiendo archivos, añadiendo URLs o ingresando texto
                </div>
            </div>
        `;
    }

    window.deleteTrainingItem = async function (id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este dato de entrenamiento?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/training/data/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Dato de entrenamiento eliminado');
                loadTrainingData();
            } else {
                showError('Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting training data:', error);
            showError('Error al eliminar');
        }
    };

    // Utilities
    function getIconForType(type) {
        const icons = {
            'file': 'fa-file',
            'url': 'fa-link',
            'text': 'fa-keyboard',
            'pdf': 'fa-file-pdf',
            'docx': 'fa-file-word',
            'txt': 'fa-file-alt'
        };
        return icons[type] || 'fa-file';
    }

    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showSuccess(message) {
        if (window.dashboardApp && window.dashboardApp.showSuccess) {
            window.dashboardApp.showSuccess(message);
        } else {
            alert(message);
        }
    }

    function showError(message) {
        if (window.dashboardApp && window.dashboardApp.showError) {
            window.dashboardApp.showError(message);
        } else {
            alert(message);
        }
    }

    function showLoading(message) {
        // Simple loading indicator
        const loading = document.createElement('div');
        loading.id = 'training-loading';
        loading.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px 32px;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
        `;
        loading.innerHTML = `
            <i class="fas fa-spin fa-spinner" style="font-size: 20px; color: #6366f1;"></i>
            <span style="font-weight: 600;">${message}</span>
        `;
        document.body.appendChild(loading);
    }

    function hideLoading() {
        const loading = document.getElementById('training-loading');
        if (loading) {
            loading.remove();
        }
    }

})();
