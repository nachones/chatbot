const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const { authMiddleware } = require('./auth');
const { verifyOwnership } = require('../services/planConfig');

// All dashboard routes require authentication
router.use(authMiddleware);

// Helper: validate chatbotId belongs to user
async function requireOwnership(req, res) {
  const chatbotId = req.query.chatbotId || req.params.chatbotId || null;
  if (chatbotId) {
    const owns = await verifyOwnership(db, chatbotId, req.user.id);
    if (!owns) {
      res.status(403).json({ error: 'No tienes acceso a este chatbot' });
      return null;
    }
  }
  return chatbotId;
}

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    
    // Get total messages
    const messages = await db.getStats('messages', chatbotId);
    
    // Get total conversations
    const conversations = await db.getStats('conversations', chatbotId);
    
    // Get total training items
    const training = await db.getStats('training', chatbotId);
    
    // Get total leads
    const leads = await db.getStats('leads', chatbotId);
    
    res.json({
      success: true,
      stats: {
        messages: messages || 0,
        conversations: conversations || 0,
        training: training || 0,
        leads: leads || 0
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Get chat history for charts
router.get('/chat-history', async (req, res) => {
  try {
    const period = req.query.period || '1w';
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    const history = await db.getChatHistory(period, chatbotId);
    
    res.json({
      success: true,
      history: history || []
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// Get recent conversations
router.get('/recent-conversations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    const conversations = await db.getRecentConversations(limit, chatbotId);
    
    res.json({
      success: true,
      conversations: conversations || []
    });
  } catch (error) {
    console.error('Error getting recent conversations:', error);
    res.status(500).json({ error: 'Error obteniendo conversaciones' });
  }
});

// Get token usage statistics
router.get('/token-usage', async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    const usage = await db.getTokenUsage(period, chatbotId);
    
    // Calculate costs (example rates for GPT-3.5-turbo)
    const inputCostPer1k = 0.0015;
    const outputCostPer1k = 0.002;
    
    const totalCost = (
      (usage.inputTokens / 1000) * inputCostPer1k +
      (usage.outputTokens / 1000) * outputCostPer1k
    );
    
    res.json({
      success: true,
      usage: {
        total: usage.inputTokens + usage.outputTokens,
        input: usage.inputTokens,
        output: usage.outputTokens,
        cost: totalCost.toFixed(4)
      }
    });
  } catch (error) {
    console.error('Error getting token usage:', error);
    res.status(500).json({ 
      success: false,
      usage: {
        total: 0,
        input: 0,
        output: 0,
        cost: '0.0000'
      }
    });
  }
});

// Get all conversations with pagination
router.get('/conversations', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    
    const conversations = await db.getAllConversations(page, limit, search, chatbotId);
    
    res.json({
      success: true,
      conversations: conversations.data || [],
      total: conversations.total || 0,
      page: page,
      pages: Math.ceil((conversations.total || 0) / limit)
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Error obteniendo conversaciones' });
  }
});

// Get conversation details
router.get('/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = await db.getConversationHistory(sessionId);
    
    res.json({
      success: true,
      conversation: conversation || []
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Error obteniendo conversación' });
  }
});

// Delete conversation
router.delete('/conversations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await db.deleteConversation(sessionId);
    
    res.json({
      success: true,
      message: 'Conversación eliminada'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Error eliminando conversación' });
  }
});

// Get leads
router.get('/leads', async (req, res) => {
  try {
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    const leads = await db.getLeads(chatbotId);
    
    res.json({
      success: true,
      leads: leads || []
    });
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({ error: 'Error obteniendo leads' });
  }
});

// Export leads as CSV
router.get('/leads/export', async (req, res) => {
  try {
    const chatbotId = await requireOwnership(req, res);
    if (chatbotId === null && req.query.chatbotId) return;
    const leads = await db.getLeads(chatbotId);
    
    // Create CSV - escape values to prevent CSV injection
    const escCsv = (val) => '"' + String(val || 'N/A').replace(/"/g, '""') + '"';
    let csv = 'Nombre,Email,Teléfono,Fecha,Origen\n';
    leads.forEach(lead => {
      csv += `${escCsv(lead.name)},${escCsv(lead.email)},${escCsv(lead.phone)},${escCsv(lead.created_at || lead.date)},${escCsv(lead.source || 'Chat')}\n`;
    });
    
    const filename = chatbotId ? `leads-${chatbotId}-${Date.now()}.csv` : `leads-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Error exportando leads' });
  }
});

module.exports = router;
