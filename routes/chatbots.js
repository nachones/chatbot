const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

const db = new DatabaseService();

// Get all chatbots
router.get('/', async (req, res) => {
  try {
    const chatbots = await db.getAllChatbots();
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
    const chatbot = await db.getChatbot(id);
    
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot no encontrado' });
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
