// Integrations Page JavaScript
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initCopyButtons();
    });

    function initCopyButtons() {
        // Copy integration code
        addCopyHandler('copy-integration-code', 'integration-code');
        addCopyHandler('copy-api-code', 'api-example-code');
        addCopyHandler('copy-direct-link', 'direct-link-code');
    }

    function addCopyHandler(buttonId, sourceId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const source = document.getElementById(sourceId);
            if (!source) return;

            const text = source.textContent;
            try {
                await navigator.clipboard.writeText(text);
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 2000);
            } catch (err) {
                // Fallback para navegadores que no soportan clipboard API
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
            }
        });
    }

})();
