const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { authMiddleware } = require('./auth');

const db = new DatabaseService();

// All chatbot routes require authentication
router.use(authMiddleware);

// Helper: verify chatbot belongs to authenticated user
async function verifyOwnership(chatbotId, userId) {
  const chatbot = await db.getChatbot(chatbotId);
  if (!chatbot) return null;
  if (chatbot.user_id && chatbot.user_id !== userId) return false;
  return chatbot;
}

// Get all chatbots (filtered by user)
router.get('/', async (req, res) => {
  try {
    const chatbots = await db.getChatbotsByUser(req.user.id);
    res.json({
      success: true,
      chatbots: chatbots
    });
  } catch (error) {
    console.error('Error getting chatbots:', error);
    res.status(500).json({ error: 'Error obteniendo chatbots' });
  }
});

// Get single chatbot
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chatbot = await verifyOwnership(id, req.user.id);
    
    if (chatbot === null) {
      return res.status(404).json({ error: 'Chatbot no encontrado' });
    }
    if (chatbot === false) {
      return res.status(403).json({ error: 'No tienes acceso a este chatbot' });
    }
    
    res.json({
      success: true,
      chatbot: chatbot
    });
  } catch (error) {
    console.error('Error getting chatbot:', error);
    res.status(500).json({ error: 'Error obteniendo chatbot' });
  }
});

// Create new chatbot
router.post('/', async (req, res) => {
  try {
    const chatbotData = req.body;
    
    if (!chatbotData.name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Associate with user if authenticated
    if (req.user && req.user.id) {
      chatbotData.user_id = req.user.id;
    }
    
    const newChatbot = await db.createChatbot(chatbotData);
    
    res.json({
      success: true,
      chatbot: newChatbot,
      message: 'Chatbot creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating chatbot:', error);
    res.status(500).json({ error: 'Error creando chatbot' });
  }
});

// Update chatbot
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ownership = await verifyOwnership(id, req.user.id);
    if (ownership === null) return res.status(404).json({ error: 'Chatbot no encontrado' });
    if (ownership === false) return res.status(403).json({ error: 'No tienes acceso a este chatbot' });

    const chatbotData = req.body;
    const updatedChatbot = await db.updateChatbot(id, chatbotData);
    
    res.json({
      success: true,
      chatbot: updatedChatbot,
      message: 'Chatbot actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating chatbot:', error);
    res.status(500).json({ error: 'Error actualizando chatbot' });
  }
});

// Delete chatbot (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ownership = await verifyOwnership(id, req.user.id);
    if (ownership === null) return res.status(404).json({ error: 'Chatbot no encontrado' });
    if (ownership === false) return res.status(403).json({ error: 'No tienes acceso a este chatbot' });

    await db.deleteChatbot(id);
    
    res.json({
      success: true,
      message: 'Chatbot eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting chatbot:', error);
    res.status(500).json({ error: 'Error eliminando chatbot' });
  }
});

// Get chatbot statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const messages = await db.getStats('messages', id);
    const conversations = await db.getStats('conversations', id);
    const training = await db.getStats('training', id);
    const leads = await db.getStats('leads', id);
    
    res.json({
      success: true,
      stats: {
        messages,
        conversations,
        training,
        leads
      }
    });
  } catch (error) {
    console.error('Error getting chatbot stats:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Get chatbot appearance settings
router.get('/:id/appearance', async (req, res) => {
  try {
    const { id } = req.params;
    const appearance = await db.getAppearanceSettings(id);
    
    res.json({
      success: true,
      appearance: appearance || {}
    });
  } catch (error) {
    console.error('Error getting appearance:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de apariencia' });
  }
});

// Update chatbot appearance settings
router.put('/:id/appearance', async (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body;
    
    await db.saveAppearanceSettings(id, settings);
    
    res.json({
      success: true,
      message: 'Configuración de apariencia guardada exitosamente'
    });
  } catch (error) {
    console.error('Error saving appearance:', error);
    res.status(500).json({ error: 'Error guardando configuración de apariencia' });
  }
});

module.exports = router;
