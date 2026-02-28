/**
 * Middleware de seguridad para MIABOT
 * Incluye validación de inputs, sanitización y protección básica
 */
const logger = require('./logger');

// Sanitizar strings para prevenir XSS
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// Sanitizar objeto recursivamente
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
}

// Validar que el chatbotId sea válido
function validateChatbotId(req, res, next) {
    const chatbotId = req.params.chatbotId || req.body.chatbotId || req.query.chatbotId;
    
    if (chatbotId) {
        // Formato esperado: chatbot_TIMESTAMP_RANDOMSTRING
        const validFormat = /^chatbot_\d+_[a-z0-9]+$/i;
        if (!validFormat.test(chatbotId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID de chatbot inválido' 
            });
        }
    }
    next();
}

// Validar mensaje de chat
function validateChatMessage(req, res, next) {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: 'El mensaje es requerido' 
        });
    }
    
    if (message.length > 10000) {
        return res.status(400).json({ 
            success: false, 
            error: 'El mensaje es demasiado largo (máximo 10000 caracteres)' 
        });
    }
    
    next();
}

// Validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validar URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Middleware de logging para producción
function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
        
        // Solo loguear en producción
        if (process.env.NODE_ENV === 'production' || process.env.LOG_LEVEL === 'debug') {
            logger.info(
                `[${logLevel}] ${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms | ${req.ip}`
            );
        }
    });
    
    next();
}

// Middleware para manejar errores async
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Middleware de verificación de API key para rutas protegidas (opcional)
function verifyApiKey(req, res, next) {
    // Sólo verificar si está configurada la protección
    if (!process.env.REQUIRE_API_KEY) {
        return next();
    }
    
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey || apiKey !== validKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'API key inválida o no proporcionada' 
        });
    }
    
    next();
}

module.exports = {
    sanitizeString,
    sanitizeObject,
    validateChatbotId,
    validateChatMessage,
    isValidEmail,
    isValidUrl,
    requestLogger,
    asyncHandler,
    verifyApiKey
};
