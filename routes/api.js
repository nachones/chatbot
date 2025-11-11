const express = require('express');
const router = express.Router();
const ChatbotService = require('../services/chatbotService');
const DocumentProcessor = require('../services/documentProcessor');

// Instanciar servicios
const chatbotService = new ChatbotService();
const documentProcessor = new DocumentProcessor();

// Endpoint para enviar mensajes al chatbot
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, context, chatbotId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    const response = await chatbotService.processMessage(message, sessionId, context, chatbotId);
    
    res.json({
      success: true,
      response: response.text,
      sessionId: response.sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en el chat:', error);
    res.status(500).json({ error: 'Error procesando el mensaje' });
  }
});

// Endpoint para obtener historial de conversación
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await chatbotService.getConversationHistory(sessionId);
    
    res.json({
      success: true,
      history: history || []
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// Endpoint para configurar el chatbot
router.post('/config', async (req, res) => {
  try {
    const { apiKey, model, systemPrompt } = req.body;
    
    await chatbotService.updateConfig({
      apiKey,
      model: model || 'gpt-3.5-turbo',
      systemPrompt: systemPrompt || 'Eres un asistente útil y amigable.'
    });
    
    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// Endpoint para obtener configuración actual
router.get('/config', async (req, res) => {
  try {
    const config = await chatbotService.getConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

module.exports = router;
