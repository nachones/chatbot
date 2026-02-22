/**
 * MIABOT - Utilidades compartidas del frontend
 * Funciones comunes usadas por múltiples módulos del dashboard
 */

// ============================================
// AUTH FETCH - Fetch con token de autenticación
// ============================================
function authFetch(url, options = {}) {
    const token = localStorage.getItem('miabot_token');
    if (!options.headers) options.headers = {};
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, options).then(response => {
        if (response.status === 401) {
            localStorage.removeItem('miabot_token');
            window.location.href = '/';
            throw new Error('Sesión expirada');
        }
        return response;
    });
}

// ============================================
// ESCAPE HTML - Prevenir XSS
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// NOTIFICACIONES
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 300);
    }, 3000);
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

// ============================================
// LOADING STATES
// ============================================
function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'flex';
}

function hideLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'none';
}

// ============================================
// DATE FORMATTING
// ============================================
function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatAbsoluteDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Alias para compatibilidad
function formatDate(dateString) {
    return formatRelativeDate(dateString);
}

// ============================================
// MESSAGE FORMATTING
// ============================================
function formatMessageContent(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

// ============================================
// FORM HELPERS
// ============================================
function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? el.options[0]?.value ?? '';
}

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// ============================================
// INJECT CSS ANIMATIONS (once)
// ============================================
(function injectAnimations() {
    if (document.getElementById('miabot-utils-css')) return;
    const style = document.createElement('style');
    style.id = 'miabot-utils-css';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// Expose globally for all modules
window.miabot = {
    authFetch,
    escapeHtml,
    showNotification,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
    formatRelativeDate,
    formatAbsoluteDate,
    formatDate,
    formatMessageContent,
    setInputValue,
    setSelectValue,
    getInputValue
};
