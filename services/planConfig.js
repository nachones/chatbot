/**
 * Configuración centralizada de planes MIABOT
 * Única fuente de verdad para límites, precios y nombres de planes
 */

const PLANS = {
  starter: {
    name: 'Starter',
    displayName: 'Starter',
    monthlyPrice: 995,     // céntimos (9,95€)
    yearlyPrice: 9900,     // céntimos (99€/año = 8,25€/mes)
    tokensLimit: 100000,
    messagesLimit: 1000,
    chatbotsLimit: 1,
    features: ['1 chatbot', '1.000 mensajes/mes', '100.000 tokens', 'Gemini 2.0 Flash', 'Entrenamiento con archivos y URLs', 'Captura de leads', 'Widget personalizable'],
    calendarEnabled: false,
    functionCallingEnabled: false,
    removeBranding: false,
    customApiKey: false
  },
  pro: {
    name: 'Pro',
    displayName: 'Profesional',
    monthlyPrice: 3995,    // céntimos (39,95€)
    yearlyPrice: 39950,    // céntimos (399,50€/año = 33,29€/mes)
    tokensLimit: 500000,
    messagesLimit: 10000,
    chatbotsLimit: 3,
    features: ['3 chatbots', '10.000 mensajes/mes', '500.000 tokens', 'Todos los modelos IA', 'Entrenamiento ilimitado', 'Function calling', 'API completo', 'Sin marca de agua', 'Soporte prioritario', 'Google Calendar'],
    calendarEnabled: true,
    functionCallingEnabled: true,
    removeBranding: true,
    customApiKey: false
  },
  empresas: {
    name: 'Empresas',
    displayName: 'Empresas',
    monthlyPrice: null,     // Solo anual
    yearlyPrice: 85000,     // céntimos (850€/año)
    tokensLimit: 999999999,
    messagesLimit: 999999999,
    chatbotsLimit: 999,
    features: ['Chatbots ilimitados', 'Mensajes ilimitados', 'Tokens ilimitados', 'Tu propia API key', 'Todos los modelos (GPT-4, Gemini, etc.)', 'Function calling avanzado', 'API empresarial', 'Entrenamiento ilimitado', 'Soporte dedicado', 'Google Calendar', 'Revende chatbots a tus clientes'],
    calendarEnabled: true,
    functionCallingEnabled: true,
    removeBranding: true,
    customApiKey: true
  }
};

// Alias para compatibilidad con datos legacy en DB
PLANS.custom = PLANS.empresas;

/**
 * Obtiene los límites de un plan
 */
function getPlanLimits(planName) {
  const plan = PLANS[planName] || PLANS.starter;
  return {
    tokensLimit: plan.tokensLimit,
    messagesLimit: plan.messagesLimit,
    chatbotsLimit: plan.chatbotsLimit
  };
}

/**
 * Obtiene información completa de un plan
 */
function getPlan(planName) {
  return PLANS[planName] || PLANS.starter;
}

/**
 * Verifica que un chatbot pertenezca a un usuario (ownership check)
 * @param {Object} db - Instancia de DatabaseService
 * @param {string} chatbotId - ID del chatbot
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function verifyOwnership(db, chatbotId, userId) {
  return new Promise((resolve, reject) => {
    db.db.get(
      'SELECT id FROM chatbots WHERE id = ? AND user_id = ?',
      [chatbotId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

module.exports = { PLANS, getPlanLimits, getPlan, verifyOwnership };
