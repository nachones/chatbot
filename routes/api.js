const express = require('express');
const router = express.Router();
const ChatbotService = require('../services/chatbotService');
const llmService = require('../services/llmService');
const { authMiddleware } = require('./auth');

// Instanciar servicios
const chatbotService = new ChatbotService();

// Endpoint para enviar mensajes al chatbot
router.post('/chat', async (req, res) => {
  try {
    let { message, sessionId, context, chatbotId } = req.body;

    // Extract chatbotId from Authorization header if not in body
    if (!chatbotId && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        chatbotId = authHeader.substring(7);
      }
    }

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

// Endpoint para obtener historial de conversación (requires auth)
router.get('/history/:sessionId', authMiddleware, async (req, res) => {
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

// Endpoint para configurar el chatbot (requires auth)
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { apiKey, model, systemPrompt } = req.body;

    await chatbotService.updateConfig({
      apiKey,
      model: model || 'gemini-2.0-flash',
      systemPrompt: systemPrompt || 'Eres un asistente útil y amigable.'
    });

    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// Endpoint para obtener configuración actual (requires auth)
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const config = await chatbotService.getConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

// Test API connection (requires auth to prevent abuse)
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key requerida' });
    }

    const validProviders = ['openai', 'groq', 'gemini'];
    const selectedProvider = provider || 'gemini';

    if (!validProviders.includes(selectedProvider)) {
      return res.status(400).json({ error: 'Proveedor no soportado' });
    }

    const result = await llmService.testConnection(selectedProvider, apiKey);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(400).json({ 
      error: 'Error de conexión. Verifica tu API key e inténtalo de nuevo.'
    });
  }
});

// Get available models
router.get('/models', async (req, res) => {
  try {
    const models = llmService.getAvailableModels();
    const pricing = llmService.getPricing();
    
    res.json({
      success: true,
      models,
      pricing
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Error obteniendo modelos' });
  }
});

module.exports = router;
