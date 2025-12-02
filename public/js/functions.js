// Functions Page JavaScript
(function () {
    'use strict';

    const API_URL = '/api';
    let currentChatbotId = null;
    let editingFunctionId = null;
    let parameters = [];

    document.addEventListener('DOMContentLoaded', function () {
        initFunctionsPage();
    });

    function initFunctionsPage() {
        // Monitor for chatbot changes
        setInterval(() => {
            if (window.dashboardApp && window.dashboardApp.getCurrentChatbotId) {
                const chatbotId = window.dashboardApp.getCurrentChatbotId();
                if (chatbotId !== currentChatbotId) {
                    currentChatbotId = chatbotId;
                    loadFunctions();
                }
            }
        }, 1000);

        // Add function button
        const addBtn = document.getElementById('add-function-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => openFunctionModal());
        }

        // Add parameter button
        const addParamBtn = document.getElementById('add-parameter-btn');
        if (addParamBtn) {
            addParamBtn.addEventListener('click', addParameter);
        }

        // Save function button
        const saveBtn = document.getElementById('save-function-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveFunction);
        }

        // Modal close handlers
        const modal = document.getElementById('function-modal');
        if (modal) {
            modal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', closeFunctionModal);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeFunctionModal();
            });
        }

        // Function enabled checkbox default
        const enabledCheckbox = document.getElementById('function-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.checked = true;
        }
    }

    async function loadFunctions() {
        if (!currentChatbotId) return;

        const container = document.getElementById('functions-list');
        if (!container) return;

        try {
            const response = await fetch(`${API_URL}/functions?chatbotId=${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.functions && data.functions.length > 0) {
                renderFunctions(data.functions);
            } else {
                showEmptyState(container);
            }
        } catch (error) {
            console.error('Error loading functions:', error);
            showEmptyState(container);
        }
    }

    function renderFunctions(functions) {
        const container = document.getElementById('functions-list');
        if (!container) return;

        container.innerHTML = functions.map(func => `
            <div class="function-card ${!func.enabled ? 'disabled' : ''}">
                <div class="function-header">
                    <div class="function-info">
                        <h4 class="function-name">
                            <i class="fas fa-code"></i> ${escapeHtml(func.name)}
                        </h4>
                        <span class="function-method method-${func.method?.toLowerCase() || 'post'}">
                            ${func.method || 'POST'}
                        </span>
                        <span class="function-status ${func.enabled ? 'active' : 'inactive'}">
                            ${func.enabled ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                    <div class="function-actions">
                        <button class="btn btn-secondary btn-sm" onclick="window.editFunction('${func.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.toggleFunction('${func.id}', ${!func.enabled})" title="${func.enabled ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${func.enabled ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="window.deleteFunction('${func.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="function-description">${escapeHtml(func.description)}</p>
                <div class="function-endpoint">
                    <i class="fas fa-link"></i> ${escapeHtml(func.endpoint)}
                </div>
                ${func.parameters && func.parameters.length > 0 ? `
                    <div class="function-params">
                        <span class="params-label">Parámetros:</span>
                        ${func.parameters.map(p => `<span class="param-badge">${escapeHtml(p.name)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    function showEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-code"></i>
                <h3>No hay funciones configuradas</h3>
                <p>Las funciones permiten que tu chatbot realice acciones específicas como buscar información, realizar cálculos o conectarse con APIs externas.</p>
            </div>
        `;
    }

    function openFunctionModal(functionId = null) {
        editingFunctionId = functionId;
        parameters = [];
        
        // Reset form
        document.getElementById('function-name').value = '';
        document.getElementById('function-description').value = '';
        document.getElementById('function-endpoint').value = '';
        document.getElementById('function-method').value = 'POST';
        document.getElementById('function-headers').value = '';
        document.getElementById('function-enabled').checked = true;
        document.getElementById('parameters-list').innerHTML = '';

        // Update modal title
        const title = document.getElementById('function-modal-title');
        if (title) {
            title.textContent = functionId ? 'Editar Función' : 'Crear Función';
        }

        // If editing, load function data
        if (functionId) {
            loadFunctionData(functionId);
        }

        // Show modal
        const modal = document.getElementById('function-modal');
        if (modal) modal.classList.add('active');
    }

    async function loadFunctionData(functionId) {
        try {
            const response = await fetch(`${API_URL}/functions/${functionId}`);
            const data = await response.json();

            if (data.success && data.function) {
                const func = data.function;
                document.getElementById('function-name').value = func.name || '';
                document.getElementById('function-description').value = func.description || '';
                document.getElementById('function-endpoint').value = func.endpoint || '';
                document.getElementById('function-method').value = func.method || 'POST';
                document.getElementById('function-headers').value = func.headers || '';
                document.getElementById('function-enabled').checked = func.enabled !== false;

                // Load parameters
                if (func.parameters && Array.isArray(func.parameters)) {
                    parameters = func.parameters;
                    renderParameters();
                }
            }
        } catch (error) {
            console.error('Error loading function:', error);
            showError('Error al cargar la función');
        }
    }

    function closeFunctionModal() {
        const modal = document.getElementById('function-modal');
        if (modal) modal.classList.remove('active');
        editingFunctionId = null;
    }

    function addParameter() {
        const param = {
            id: Date.now(),
            name: '',
            type: 'string',
            description: '',
            required: false
        };
        parameters.push(param);
        renderParameters();
    }

    function renderParameters() {
        const container = document.getElementById('parameters-list');
        if (!container) return;

        container.innerHTML = parameters.map((param, index) => `
            <div class="parameter-item" data-id="${param.id}">
                <div class="parameter-row">
                    <input type="text" class="form-control param-name" placeholder="Nombre" 
                           value="${escapeHtml(param.name)}" onchange="window.updateParam(${param.id}, 'name', this.value)">
                    <select class="form-control param-type" onchange="window.updateParam(${param.id}, 'type', this.value)">
                        <option value="string" ${param.type === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${param.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${param.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="array" ${param.type === 'array' ? 'selected' : ''}>Array</option>
                        <option value="object" ${param.type === 'object' ? 'selected' : ''}>Object</option>
                    </select>
                    <label class="param-required">
                        <input type="checkbox" ${param.required ? 'checked' : ''} 
                               onchange="window.updateParam(${param.id}, 'required', this.checked)"> Req.
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.removeParam(${param.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <input type="text" class="form-control param-description" placeholder="Descripción del parámetro"
                       value="${escapeHtml(param.description)}" onchange="window.updateParam(${param.id}, 'description', this.value)">
            </div>
        `).join('');
    }

    window.updateParam = function(id, field, value) {
        const param = parameters.find(p => p.id === id);
        if (param) param[field] = value;
    };

    window.removeParam = function(id) {
        parameters = parameters.filter(p => p.id !== id);
        renderParameters();
    };

    async function saveFunction() {
        const name = document.getElementById('function-name')?.value?.trim();
        const description = document.getElementById('function-description')?.value?.trim();
        const endpoint = document.getElementById('function-endpoint')?.value?.trim();
        const method = document.getElementById('function-method')?.value;
        const headers = document.getElementById('function-headers')?.value?.trim();
        const enabled = document.getElementById('function-enabled')?.checked;

        // Validation
        if (!name) {
            showError('El nombre de la función es requerido');
            return;
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            showError('El nombre solo puede contener letras, números y guiones bajos');
            return;
        }
        if (!description) {
            showError('La descripción es requerida');
            return;
        }
        if (!endpoint) {
            showError('El endpoint es requerido');
            return;
        }

        // Validate headers JSON if provided
        if (headers) {
            try {
                JSON.parse(headers);
            } catch (e) {
                showError('Los headers deben ser JSON válido');
                return;
            }
        }

        // Clean parameters
        const cleanParams = parameters
            .filter(p => p.name && p.name.trim())
            .map(p => ({
                name: p.name.trim(),
                type: p.type,
                description: p.description || '',
                required: p.required || false
            }));

        const functionData = {
            chatbotId: currentChatbotId,
            name,
            description,
            endpoint,
            method,
            headers: headers || null,
            parameters: cleanParams,
            enabled
        };

        try {
            showLoading('Guardando función...');

            const url = editingFunctionId 
                ? `${API_URL}/functions/${editingFunctionId}`
                : `${API_URL}/functions`;
            
            const response = await fetch(url, {
                method: editingFunctionId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(functionData)
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showSuccess(editingFunctionId ? 'Función actualizada' : 'Función creada');
                closeFunctionModal();
                loadFunctions();
            } else {
                showError(data.error || 'Error al guardar');
            }
        } catch (error) {
            hideLoading();
            console.error('Error saving function:', error);
            showError('Error al guardar la función');
        }
    }

    window.editFunction = function(id) {
        openFunctionModal(id);
    };

    window.toggleFunction = async function(id, enabled) {
        try {
            const response = await fetch(`${API_URL}/functions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(enabled ? 'Función activada' : 'Función desactivada');
                loadFunctions();
            } else {
                showError('Error al cambiar estado');
            }
        } catch (error) {
            console.error('Error toggling function:', error);
            showError('Error al cambiar estado');
        }
    };

    window.deleteFunction = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta función?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/functions/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Función eliminada');
                loadFunctions();
            } else {
                showError('Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting function:', error);
            showError('Error al eliminar la función');
        }
    };

    // Utility functions
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showSuccess(message) {
        if (window.dashboardApp && window.dashboardApp.showSuccess) {
            window.dashboardApp.showSuccess(message);
        }
    }

    function showError(message) {
        if (window.dashboardApp && window.dashboardApp.showError) {
            window.dashboardApp.showError(message);
        }
    }

    function showLoading(message) {
        let loading = document.getElementById('functions-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'functions-loading';
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
        const loading = document.getElementById('functions-loading');
        if (loading) loading.style.display = 'none';
    }

})();
