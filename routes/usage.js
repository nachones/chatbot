const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const { authMiddleware } = require('./auth');
const { verifyOwnership, PLANS, getPlan } = require('../services/planConfig');
const logger = require('../services/logger');

// All usage routes require authentication
router.use(authMiddleware);

// Helper: verify ownership
async function checkOwnership(req, res) {
  const { chatbotId } = req.params;
  const owns = await verifyOwnership(db, chatbotId, req.user.id);
  if (!owns) {
    res.status(403).json({ success: false, error: 'No tienes acceso a este chatbot' });
    return false;
  }
  return true;
}

// Obtener estadísticas de uso de un chatbot
router.get('/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    if (!(await checkOwnership(req, res))) return;
    
    const stats = await db.getUsageStats(chatbotId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot no encontrado'
      });
    }

    const currentPlan = getPlan(stats.plan);
    const tokensLimit = currentPlan.tokensLimit >= 999999999 ? null : currentPlan.tokensLimit;
    const tokensPercentage = tokensLimit ? Math.min(100, Math.round((stats.tokens_used / tokensLimit) * 100)) : 0;
    const messagesPercentage = stats.messages_limit ? Math.min(100, Math.round((stats.messages_used / stats.messages_limit) * 100)) : 0;

    res.json({
      success: true,
      usage: {
        plan: stats.plan,
        planName: currentPlan.name,
        isCustomApi: stats.plan === 'empresas' || stats.plan === 'custom',
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
    logger.error('Error obteniendo estadísticas de uso:', error);
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
    if (!(await checkOwnership(req, res))) return;
    
    await db.resetMonthlyUsage(chatbotId);
    
    res.json({
      success: true,
      message: 'Uso reseteado correctamente'
    });
  } catch (error) {
    logger.error('Error reseteando uso:', error);
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
    if (!(await checkOwnership(req, res))) return;

    const { plan } = req.body;
    
    const validPlans = ['starter', 'pro', 'empresas'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Plan inválido. Debe ser: starter, pro o empresas'
      });
    }
    
    await db.updatePlan(chatbotId, plan);
    
    res.json({
      success: true,
      message: 'Plan actualizado correctamente',
      plan: plan
    });
  } catch (error) {
    logger.error('Error actualizando plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando plan'
    });
  }
});

module.exports = router;
