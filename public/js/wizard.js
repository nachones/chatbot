// Wizard for Creating New Chatbots
(function () {
    'use strict';

    let currentStep = 1;
    let wizardData = {
        name: '',
        description: '',
        trainingType: null, // 'file' or 'url'
        trainingFile: null,
        trainingUrl: '',
        color: '#2563eb',
        welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
        model: 'gpt-3.5-turbo'
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
    });

    function resetWizard() {
        currentStep = 1;
        wizardData = {
            name: '',
            description: '',
            trainingType: null,
            trainingFile: null,
            trainingUrl: '',
            color: '#2563eb',
            welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
            model: 'gpt-3.5-turbo'
        };
        showStep(1);
    }

    function initWizardNavigation() {
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');
        const finishBtn = document.getElementById('wizard-finish');

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
                    }
                }
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', createChatbot);
        }
    }

    function initTrainingOptions() {
        const uploadOption = document.getElementById('wizard-upload-option');
        const urlOption = document.getElementById('wizard-url-option');

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

    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');

        // Show current step
        const currentStepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
        if (currentStepEl) currentStepEl.style.display = 'block';

        // Update progress indicators
        document.querySelectorAll('.wizard-step-indicator').forEach((indicator, index) => {
            if (index + 1 <= step) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');
        const finishBtn = document.getElementById('wizard-finish');

        if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = step < 3 ? 'block' : 'none';
        if (finishBtn) finishBtn.style.display = step === 3 ? 'block' : 'none';

        // Update title
        const titles = ['Información Básica', 'Entrenamiento', 'Personalización'];
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
            wizardData.description = document.getElementById('new-chatbot-description')?.value || '';
        } else if (step === 2) {
            if (wizardData.trainingType === 'file') {
                const fileInput = document.getElementById('wizard-file-input');
                wizardData.trainingFile = fileInput?.files[0] || null;
            } else if (wizardData.trainingType === 'url') {
                wizardData.trainingUrl = document.getElementById('wizard-url-input')?.value || '';
            }
        } else if (step === 3) {
            wizardData.color = document.getElementById('wizard-color')?.value || '#2563eb';
            wizardData.welcomeMessage = document.getElementById('wizard-welcome')?.value || '';
            wizardData.model = document.getElementById('wizard-model')?.value || 'gpt-3.5-turbo';
        }
    }

    async function createChatbot() {
        saveStepData(3);

        const finishBtn = document.getElementById('wizard-finish');
        if (finishBtn) {
            finishBtn.disabled = true;
            finishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        }

        try {
            // Create chatbot
            const response = await fetch('/api/chatbots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: wizardData.name,
                    description: wizardData.description,
                    widget_color: wizardData.color,
                    welcome_message: wizardData.welcomeMessage,
                    model: wizardData.model
                })
            });

            const data = await response.json();

            if (data.success && data.chatbot) {
                const chatbotId = data.chatbot.id;

                // Upload training data if provided
                if (wizardData.trainingType === 'file' && wizardData.trainingFile) {
                    await uploadTrainingFile(chatbotId, wizardData.trainingFile);
                } else if (wizardData.trainingType === 'url' && wizardData.trainingUrl) {
                    await trainFromUrl(chatbotId, wizardData.trainingUrl);
                }

                // Close modal and reload
                document.getElementById('new-chatbot-modal')?.classList.remove('active');
                alert('¡Chatbot creado exitosamente!');
                window.location.reload();
            } else {
                throw new Error(data.error || 'Error al crear el chatbot');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear el chatbot: ' + error.message);
        } finally {
            if (finishBtn) {
                finishBtn.disabled = false;
                finishBtn.innerHTML = '<i class="fas fa-check"></i> Crear y Desplegar';
            }
        }
    }

    async function uploadTrainingFile(chatbotId, file) {
        const formData = new FormData();
        formData.append('file', file);
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

})();
