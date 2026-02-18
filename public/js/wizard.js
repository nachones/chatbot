// Wizard for Creating New Chatbots
(function () {
    'use strict';

    let currentStep = 1;
    let wizardData = {
        name: '',
        objective: 'support',
        welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
        trainingType: 'file', // 'file' or 'url'
        trainingFiles: [],
        trainingUrl: '',
        color: '#3B82F6',
        position: 'bottom-right',
        theme: 'light'
    };

    // Initialize wizard when modal opens
    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('new-chatbot-modal');
        if (!modal) return;

        // Reset wizard when modal opens
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.attributeName === 'class') {
                    if (modal.classList.contains('active')) {
                        resetWizard();
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });

        initWizardNavigation();
        initTrainingOptions();
        initCustomization();
        initCopyCode();
    });

    // Expose resetWizard to global scope
    window.resetWizard = function () {
        currentStep = 1;
        wizardData = {
            name: document.getElementById('wizard-chatbot-name') ? document.getElementById('wizard-chatbot-name').value : '',
            objective: 'support',
            welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
            trainingType: 'file',
            trainingFiles: [],
            trainingUrl: '',
            color: '#3B82F6',
            position: 'bottom-right',
            theme: 'light'
        };

        // Reset inputs
        if (document.getElementById('new-chatbot-name')) document.getElementById('new-chatbot-name').value = '';
        if (document.getElementById('new-chatbot-objective')) document.getElementById('new-chatbot-objective').value = 'support';
        if (document.getElementById('new-chatbot-welcome')) document.getElementById('new-chatbot-welcome').value = '¡Hola! ¿En qué puedo ayudarte hoy?';
        if (document.getElementById('wizard-file-input')) document.getElementById('wizard-file-input').value = '';
        if (document.getElementById('wizard-url-input')) document.getElementById('wizard-url-input').value = '';
        if (document.getElementById('wizard-files-list')) document.getElementById('wizard-files-list').innerHTML = '';

        showStep(1);
    }

    function initWizardNavigation() {
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');
        const createBtn = document.getElementById('wizard-create');
        const finishBtn = document.getElementById('wizard-finish-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStep > 1) {
                    currentStep--;
                    showStep(currentStep);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    saveStepData(currentStep);
                    if (currentStep < 3) {
                        currentStep++;
                        showStep(currentStep);
                    } else if (currentStep === 3) {
                        // Create chatbot before showing step 4 (deploy)
                        createChatbot();
                    }
                }
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                document.getElementById('new-chatbot-modal').classList.remove('active');
                window.location.reload();
            });
        }
    }

    function initTrainingOptions() {
        const uploadOption = document.getElementById('wizard-upload-option');
        const urlOption = document.getElementById('wizard-url-option');
        const fileInput = document.getElementById('wizard-file-input');

        if (uploadOption) {
            uploadOption.addEventListener('click', () => {
                selectTrainingOption('file');
            });
        }

        if (urlOption) {
            urlOption.addEventListener('click', () => {
                selectTrainingOption('url');
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                wizardData.trainingFiles = files;
                renderFilesList(files);
            });
        }
    }

    function renderFilesList(files) {
        const list = document.getElementById('wizard-files-list');
        if (!list) return;

        list.innerHTML = files.map(file => `
            <div class="file-item">
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
                <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
            </div>
        `).join('');
    }

    function selectTrainingOption(type) {
        wizardData.trainingType = type;

        // Update UI
        const uploadOption = document.getElementById('wizard-upload-option');
        const urlOption = document.getElementById('wizard-url-option');
        const uploadArea = document.getElementById('wizard-upload-area');
        const urlArea = document.getElementById('wizard-url-area');

        if (type === 'file') {
            uploadOption?.classList.add('active');
            urlOption?.classList.remove('active');
            if (uploadArea) uploadArea.style.display = 'block';
            if (urlArea) urlArea.style.display = 'none';
        } else {
            urlOption?.classList.add('active');
            uploadOption?.classList.remove('active');
            if (urlArea) urlArea.style.display = 'block';
            if (uploadArea) uploadArea.style.display = 'none';
        }
    }

    function initCustomization() {
        const colorInput = document.getElementById('wizard-color');
        const welcomeInput = document.getElementById('new-chatbot-welcome');
        const nameInput = document.getElementById('new-chatbot-name');

        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                wizardData.color = e.target.value;
                updatePreview();
            });
        }

        if (welcomeInput) {
            welcomeInput.addEventListener('input', (e) => {
                wizardData.welcomeMessage = e.target.value;
                updatePreview();
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                wizardData.name = e.target.value;
                updatePreview();
            });
        }
    }

    function updatePreview() {
        const header = document.querySelector('.preview-header');
        const sendBtn = document.querySelector('.preview-send');
        const bubble = document.querySelector('.preview-bubble');
        const nameEl = document.getElementById('preview-name');

        if (header) header.style.backgroundColor = wizardData.color;
        if (sendBtn) sendBtn.style.color = wizardData.color;
        if (bubble) bubble.textContent = wizardData.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte hoy?';
        if (nameEl) nameEl.textContent = wizardData.name || 'Mi Chatbot';
    }

    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');

        // Show current step
        const currentStepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
        if (currentStepEl) currentStepEl.style.display = 'block';

        // Update progress indicators
        document.querySelectorAll('.wizard-step-indicator').forEach((indicator, index) => {
            const indicatorStep = parseInt(indicator.getAttribute('data-step'));
            if (indicatorStep <= step) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');
        const createBtn = document.getElementById('wizard-create');

        if (prevBtn) prevBtn.style.display = step > 1 && step < 4 ? 'block' : 'none';

        if (nextBtn) {
            if (step < 3) {
                nextBtn.style.display = 'block';
                nextBtn.textContent = 'Siguiente';
                nextBtn.onclick = null; // Reset click handler if needed
            } else if (step === 3) {
                nextBtn.style.display = 'block';
                nextBtn.textContent = 'Crear y Desplegar';
            } else {
                nextBtn.style.display = 'none';
            }
        }

        // Update title
        const titles = ['Información Básica', 'Fuentes de Datos', 'Personalización Visual', 'Integración'];
        const titleEl = document.getElementById('wizard-title');
        if (titleEl) titleEl.textContent = `Crear Nuevo Chatbot - ${titles[step - 1]}`;
    }

    function validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('new-chatbot-name')?.value.trim();
            if (!name) {
                alert('Por favor, ingresa un nombre para el chatbot');
                return false;
            }
        }
        return true;
    }

    function saveStepData(step) {
        if (step === 1) {
            wizardData.name = document.getElementById('new-chatbot-name')?.value || '';
            wizardData.objective = document.getElementById('new-chatbot-objective')?.value || 'support';
            wizardData.welcomeMessage = document.getElementById('new-chatbot-welcome')?.value || '';
        } else if (step === 2) {
            if (wizardData.trainingType === 'url') {
                wizardData.trainingUrl = document.getElementById('wizard-url-input')?.value || '';
            }
        } else if (step === 3) {
            wizardData.color = document.getElementById('wizard-color')?.value || '#3B82F6';
            wizardData.position = document.getElementById('wizard-position')?.value || 'bottom-right';
            wizardData.theme = document.getElementById('wizard-theme')?.value || 'light';
        }
    }

    async function createChatbot() {
        const nextBtn = document.getElementById('wizard-next');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        }

        try {
            // Create chatbot
            const response = await fetch('/api/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: wizardData.name,
                    description: `Chatbot de ${wizardData.objective}`,
                    widget_color: wizardData.color,
                    welcome_message: wizardData.welcomeMessage,
                    model: 'gemini-2.0-flash',
                    widget_position: wizardData.position,
                    theme: wizardData.theme
                })
            });

            const data = await response.json();

            if (data.success && data.chatbot) {
                const chatbotId = data.chatbot.id;

                // Upload training data if provided
                if (wizardData.trainingType === 'file' && wizardData.trainingFiles.length > 0) {
                    await uploadTrainingFiles(chatbotId, wizardData.trainingFiles);
                } else if (wizardData.trainingType === 'url' && wizardData.trainingUrl) {
                    await trainFromUrl(chatbotId, wizardData.trainingUrl);
                }

                // Generate deploy code
                const deployCode = generateDeployCode(chatbotId, wizardData);
                document.getElementById('wizard-deploy-code').textContent = deployCode;

                // Move to step 4
                currentStep = 4;
                showStep(4);
            } else {
                throw new Error(data.error || 'Error al crear el chatbot');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear el chatbot: ' + error.message);
        } finally {
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Crear y Desplegar';
            }
        }
    }

    async function uploadTrainingFiles(chatbotId, files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        formData.append('chatbotId', chatbotId);

        const response = await fetch('/api/training/upload', {
            method: 'POST',
            body: formData
        });

        return response.json();
    }

    async function trainFromUrl(chatbotId, url) {
        const response = await fetch('/api/training/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, chatbotId })
        });

        return response.json();
    }

    function generateDeployCode(chatbotId, data) {
        const host = window.location.origin;
        return `<script src="${host}/chat-widget.js"
    data-api-key="${chatbotId}"
    data-api-url="${host}/api"
    data-primary-color="${data.color}"
    data-position="${data.position}"
    data-title="${data.name || 'Asistente Virtual'}"
    data-welcome="${data.welcomeMessage}"></script>`;
    }

    function initCopyCode() {
        const copyBtn = document.getElementById('wizard-copy-code');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const code = document.getElementById('wizard-deploy-code').textContent;
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                    }, 2000);
                });
            });
        }
    }

})();
