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

// WordPress Plugin Download (global scope)
function downloadWordPressPlugin() {
    const token = localStorage.getItem('miabot_token');
    if (!token) {
        alert('Debes iniciar sesión para descargar el plugin');
        return;
    }

    const btn = document.getElementById('download-wp-plugin');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Descargando...';
    }

    fetch('/api/integrations/wordpress/download', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) throw new Error('Error descargando plugin');
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'miabot-chatbot.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Descargado!';
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fab fa-wordpress"></i> Descargar Plugin WordPress';
                btn.style.background = '';
            }, 3000);
        }
    })
    .catch(err => {
        console.error('Error:', err);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fab fa-wordpress"></i> Descargar Plugin WordPress';
        }
        alert('Error al descargar el plugin. Inténtalo de nuevo.');
    });
}
