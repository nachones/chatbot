const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

const db = new DatabaseService();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const chatbotId = req.query.chatbotId || null;
    
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
    const chatbotId = req.query.chatbotId || null;
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
    const chatbotId = req.query.chatbotId || null;
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
    const chatbotId = req.query.chatbotId || null;
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
      success: true,
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
    const chatbotId = req.query.chatbotId || null;
    
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
    const chatbotId = req.query.chatbotId || null;
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
    const chatbotId = req.query.chatbotId || null;
    const leads = await db.getLeads(chatbotId);
    
    // Create CSV
    let csv = 'Nombre,Email,Teléfono,Fecha,Origen\n';
    leads.forEach(lead => {
      const name = lead.name || 'N/A';
      const email = lead.email || 'N/A';
      const phone = lead.phone || 'N/A';
      const date = lead.created_at || lead.date || '';
      const source = lead.source || 'Chat';
      csv += `"${name}","${email}","${phone}","${date}","${source}"\n`;
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
