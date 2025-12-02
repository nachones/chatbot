// Settings Page JavaScript
(function () {
    'use strict';

    const API_URL = '/api';
    let currentChatbotId = null;
    let modelsData = null;

    document.addEventListener('DOMContentLoaded', function () {
        initSettingsPage();
    });

    function initSettingsPage() {
        // Monitor for chatbot changes
        setInterval(() => {
            if (window.dashboardApp && window.dashboardApp.getCurrentChatbotId) {
                const chatbotId = window.dashboardApp.getCurrentChatbotId();
                if (chatbotId !== currentChatbotId) {
                    currentChatbotId = chatbotId;
                    loadSettings();
                }
            }
        }, 1000);

        // Temperature slider
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperature-value');
        if (tempSlider && tempValue) {
            tempSlider.addEventListener('input', (e) => {
                tempValue.textContent = e.target.value;
            });
        }

        // Save OpenAI settings button
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveOpenAISettings);
        }

        // Save chatbot settings button
        const saveChatbotBtn = document.getElementById('save-chatbot-settings');
        if (saveChatbotBtn) {
            saveChatbotBtn.addEventListener('click', saveChatbotSettings);
        }

        // Load available models
        loadModels();

        // Test API connection button (will add this to UI)
        addTestConnectionButton();
        
        // Add provider selector
        addProviderSelector();
    }

    async function loadModels() {
        try {
            const response = await fetch(`${API_URL}/models`);
            const data = await response.json();
            
            if (data.success) {
                modelsData = data.models;
            }
        } catch (error) {
            console.error('Error loading models:', error);
            // Default models
            modelsData = {
                openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
            };
        }
    }

    function addProviderSelector() {
        const modelSelect = document.getElementById('openai-model');
        if (!modelSelect || document.getElementById('llm-provider')) return;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.innerHTML = `
            <label for="llm-provider">Proveedor LLM</label>
            <select id="llm-provider" class="form-control">
                <option value="openai">OpenAI (Pago - Más avanzado)</option>
                <option value="groq">Groq (Gratis - Rápido)</option>
            </select>
            <small style="color: #888; font-size: 12px; margin-top: 4px; display: block;">
                Groq es gratuito y muy rápido, ideal para pruebas.
            </small>
        `;
        
        modelSelect.parentNode.insertBefore(formGroup, modelSelect.parentNode.firstChild);
        
        const providerSelect = document.getElementById('llm-provider');
        providerSelect.addEventListener('change', (e) => {
            updateModelOptions(e.target.value);
            updateApiKeyHelp(e.target.value);
        });
    }

    function updateModelOptions(provider) {
        const modelSelect = document.getElementById('openai-model');
        if (!modelSelect || !modelsData) return;
        
        const models = modelsData[provider] || [];
        const currentValue = modelSelect.value;
        
        modelSelect.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = formatModelName(model);
            modelSelect.appendChild(option);
        });
        
        // Try to keep current selection if valid
        if (models.includes(currentValue)) {
            modelSelect.value = currentValue;
        }
    }

    function formatModelName(model) {
        const names = {
            // OpenAI
            'gpt-4o': 'GPT-4o (Más potente)',
            'gpt-4o-mini': 'GPT-4o Mini (Económico)',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo (Rápido)',
            // Groq
            'llama-3.3-70b-versatile': 'Llama 3.3 70B (Potente)',
            'llama-3.1-8b-instant': 'Llama 3.1 8B (Ultra rápido)',
            'mixtral-8x7b-32768': 'Mixtral 8x7B',
            'gemma2-9b-it': 'Gemma 2 9B'
        };
        return names[model] || model;
    }

    function updateApiKeyHelp(provider) {
        const apiKeyInput = document.getElementById('openai-api-key');
        if (!apiKeyInput) return;
        
        const label = apiKeyInput.parentNode.querySelector('label');
        let helpText = apiKeyInput.parentNode.querySelector('.api-key-help');
        
        if (!helpText) {
            helpText = document.createElement('small');
            helpText.className = 'api-key-help';
            helpText.style.cssText = 'color: #888; font-size: 12px; margin-top: 4px; display: block;';
            apiKeyInput.parentNode.appendChild(helpText);
        }
        
        if (provider === 'groq') {
            if (label) label.textContent = 'Groq API Key';
            helpText.innerHTML = 'Obtén tu API key gratis en <a href="https://console.groq.com/keys" target="_blank" style="color: #6366f1;">console.groq.com</a>';
        } else {
            if (label) label.textContent = 'OpenAI API Key';
            helpText.innerHTML = 'Obtén tu API key en <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #6366f1;">platform.openai.com</a>';
        }
    }

    function detectProvider(model) {
        if (!model) return 'openai';
        const groqModels = ['llama', 'mixtral', 'gemma'];
        const modelLower = model.toLowerCase();
        
        for (const prefix of groqModels) {
            if (modelLower.includes(prefix)) {
                return 'groq';
            }
        }
        return 'openai';
    }

    function addTestConnectionButton() {
        const apiKeyInput = document.getElementById('openai-api-key');
        if (apiKeyInput && !document.getElementById('test-api-btn')) {
            const testBtn = document.createElement('button');
            testBtn.id = 'test-api-btn';
            testBtn.className = 'btn btn-secondary btn-sm';
            testBtn.innerHTML = '<i class="fas fa-plug"></i> Probar conexión';
            testBtn.style.marginTop = '8px';
            testBtn.addEventListener('click', testAPIConnection);
            apiKeyInput.parentNode.appendChild(testBtn);
        }
    }

    async function loadSettings() {
        if (!currentChatbotId) return;

        try {
            const response = await fetch(`${API_URL}/chatbots/${currentChatbotId}`);
            const data = await response.json();

            if (data.success && data.chatbot) {
                const bot = data.chatbot;

                // OpenAI settings
                setInputValue('openai-api-key', bot.api_key || '');
                
                // Detect provider from model
                const provider = detectProvider(bot.model);
                const providerSelect = document.getElementById('llm-provider');
                if (providerSelect) {
                    providerSelect.value = provider;
                    updateModelOptions(provider);
                    updateApiKeyHelp(provider);
                }
                
                setSelectValue('openai-model', bot.model || 'gpt-3.5-turbo');
                setInputValue('system-prompt', bot.system_prompt || '');
                
                const tempSlider = document.getElementById('temperature');
                const tempValue = document.getElementById('temperature-value');
                if (tempSlider) {
                    tempSlider.value = bot.temperature || 0.7;
                    if (tempValue) tempValue.textContent = bot.temperature || 0.7;
                }
                
                setInputValue('max-tokens', bot.max_tokens || 500);

                // Chatbot settings
                setInputValue('chatbot-name-input', bot.name || '');
                setInputValue('welcome-message', bot.welcome_message || '');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function saveOpenAISettings() {
        if (!currentChatbotId) {
            showError('No hay chatbot seleccionado');
            return;
        }

        const apiKey = document.getElementById('openai-api-key')?.value?.trim();
        const model = document.getElementById('openai-model')?.value;
        const systemPrompt = document.getElementById('system-prompt')?.value?.trim();
        const temperature = parseFloat(document.getElementById('temperature')?.value) || 0.7;
        const maxTokens = parseInt(document.getElementById('max-tokens')?.value) || 500;

        try {
            showLoading('Guardando configuración...');

            const response = await fetch(`${API_URL}/chatbots/${currentChatbotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    model: model,
                    system_prompt: systemPrompt,
                    temperature: temperature,
                    max_tokens: maxTokens
                })
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showSuccess('Configuración guardada');
            } else {
                showError(data.error || 'Error al guardar');
            }
        } catch (error) {
            hideLoading();
            console.error('Error saving settings:', error);
            showError('Error al guardar configuración');
        }
    }

    async function saveChatbotSettings() {
        if (!currentChatbotId) {
            showError('No hay chatbot seleccionado');
            return;
        }

        const name = document.getElementById('chatbot-name-input')?.value?.trim();
        const welcomeMessage = document.getElementById('welcome-message')?.value?.trim();

        if (!name) {
            showError('El nombre del chatbot es requerido');
            return;
        }

        try {
            showLoading('Guardando configuración...');

            const response = await fetch(`${API_URL}/chatbots/${currentChatbotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    welcome_message: welcomeMessage
                })
            });

            const data = await response.json();
            hideLoading();

            if (data.success) {
                showSuccess('Configuración del chatbot guardada');
                
                // Update the chatbot name in the selector
                const nameEl = document.getElementById('current-chatbot-name');
                if (nameEl) nameEl.textContent = name;
                
                // Reload chatbots list
                if (window.dashboardApp && window.dashboardApp.loadChatbots) {
                    window.dashboardApp.loadChatbots();
                }
            } else {
                showError(data.error || 'Error al guardar');
            }
        } catch (error) {
            hideLoading();
            console.error('Error saving chatbot settings:', error);
            showError('Error al guardar configuración');
        }
    }

    async function testAPIConnection() {
        const apiKey = document.getElementById('openai-api-key')?.value?.trim();
        const provider = document.getElementById('llm-provider')?.value || 'openai';
        
        if (!apiKey) {
            showError('Introduce una API key para probar');
            return;
        }

        const testBtn = document.getElementById('test-api-btn');
        const originalText = testBtn.innerHTML;
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';

        try {
            const response = await fetch(`${API_URL}/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, provider })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(`✅ ${data.message}`);
                testBtn.innerHTML = '<i class="fas fa-check"></i> Conexión OK';
                setTimeout(() => {
                    testBtn.innerHTML = originalText;
                }, 3000);
            } else {
                showError(data.error || 'Error de conexión');
                testBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            showError('Error al probar la conexión');
            testBtn.innerHTML = originalText;
        } finally {
            testBtn.disabled = false;
        }
    }

    // Utility functions
    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    function setSelectValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
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
            alert('Error: ' + message);
        }
    }

    function showLoading(message) {
        let loading = document.getElementById('settings-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'settings-loading';
            loading.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                z-index: 10000;
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
        const loading = document.getElementById('settings-loading');
        if (loading) loading.style.display = 'none';
    }

})();
