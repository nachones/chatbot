const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

const db = new DatabaseService();

// Obtener estadísticas de uso de un chatbot
router.get('/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    const stats = await db.getUsageStats(chatbotId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot no encontrado'
      });
    }

    // Info de planes
    const planInfo = {
      starter: { name: 'Starter', price: '9,95€/mes', tokensLimit: 100000 },
      pro: { name: 'Pro', price: '25€/mes', tokensLimit: 500000 },
      custom: { name: 'Custom', price: '150€/año', tokensLimit: null }
    };

    const currentPlan = planInfo[stats.plan] || planInfo.starter;
    const tokensLimit = stats.plan === 'custom' ? null : (currentPlan.tokensLimit || 100000);
    const tokensPercentage = tokensLimit ? Math.min(100, Math.round((stats.tokens_used / tokensLimit) * 100)) : 0;
    const messagesPercentage = stats.messages_limit ? Math.min(100, Math.round((stats.messages_used / stats.messages_limit) * 100)) : 0;

    res.json({
      success: true,
      usage: {
        plan: stats.plan,
        planName: currentPlan.name,
        planPrice: currentPlan.price,
        isCustomApi: stats.plan === 'custom',
        messagesUsed: stats.messages_used,
        messagesLimit: stats.messages_limit,
        messagesRemaining: Math.max(0, stats.messages_limit - stats.messages_used),
        messagesPercentage,
        tokensUsed: stats.tokens_used,
        tokensLimit: tokensLimit,
        tokensRemaining: tokensLimit ? Math.max(0, tokensLimit - stats.tokens_used) : null,
        tokensPercentage,
        resetDate: stats.reset_date
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de uso:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// Resetear uso mensual (para testing o fin de mes)
router.post('/:chatbotId/reset', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    
    await db.resetMonthlyUsage(chatbotId);
    
    res.json({
      success: true,
      message: 'Uso reseteado correctamente'
    });
  } catch (error) {
    console.error('Error reseteando uso:', error);
    res.status(500).json({
      success: false,
      error: 'Error reseteando uso'
    });
  }
});

// Actualizar plan de un chatbot
router.put('/:chatbotId/plan', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { plan } = req.body;
    
    const validPlans = ['starter', 'pro', 'custom'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Plan inválido. Debe ser: starter, pro o custom'
      });
    }
    
    await db.updatePlan(chatbotId, plan);
    
    res.json({
      success: true,
      message: 'Plan actualizado correctamente',
      plan: plan
    });
  } catch (error) {
    console.error('Error actualizando plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando plan'
    });
  }
});

module.exports = router;
