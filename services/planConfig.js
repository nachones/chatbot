/**
 * Configuración centralizada de planes MIABOT
 * Única fuente de verdad para límites, precios y nombres de planes
 */

const PLANS = {
  starter: {
    name: 'Starter',
    displayName: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    tokensLimit: 100000,
    messagesLimit: 500,
    chatbotsLimit: 1,
    features: ['1 chatbot', '500 mensajes/mes', 'Modelo básico']
  },
  pro: {
    name: 'Pro',
    displayName: 'Profesional',
    monthlyPrice: 3995, // céntimos (39,95€)
    yearlyPrice: 39950, // céntimos (399,50€)
    tokensLimit: 500000,
    messagesLimit: 5000,
    chatbotsLimit: 5,
    features: ['5 chatbots', '5.000 mensajes/mes', 'Todos los modelos', 'Funciones personalizadas']
  },
  empresas: {
    name: 'Empresas',
    displayName: 'Empresas',
    monthlyPrice: 9900, // céntimos (99€)
    yearlyPrice: 85000, // céntimos (850€)
    tokensLimit: 999999999,
    messagesLimit: 999999999,
    chatbotsLimit: 999,
    features: ['Chatbots ilimitados', 'Mensajes ilimitados', 'Todos los modelos', 'API access', 'Soporte prioritario']
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
