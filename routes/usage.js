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

    // Calcular porcentaje de uso
    const usagePercentage = (stats.messages_used / stats.messages_limit) * 100;

    res.json({
      success: true,
      usage: {
        plan: stats.plan,
        messagesUsed: stats.messages_used,
        messagesLimit: stats.messages_limit,
        messagesRemaining: stats.messages_limit - stats.messages_used,
        usagePercentage: Math.min(100, Math.round(usagePercentage)),
        tokensUsed: stats.tokens_used,
        tokensLimit: stats.tokens_limit,
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
    
    const validPlans = ['free', 'starter', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Plan inválido. Debe ser: free, starter, pro o enterprise'
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
