const express = require('express');
const router = express.Router();
const ChatbotService = require('../services/chatbotService');
const DocumentProcessor = require('../services/documentProcessor');
const llmService = require('../services/llmService');

// Instanciar servicios
const chatbotService = new ChatbotService();
const documentProcessor = new DocumentProcessor();

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

// Test API connection
router.post('/test-connection', async (req, res) => {
  try {
    const { apiKey, provider } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key requerida' });
    }

    // Test OpenAI connection
    if (!provider || provider === 'openai') {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey });
      
      // Make a simple API call to verify the key
      const response = await openai.models.list();
      
      if (response.data) {
        return res.json({ 
          success: true, 
          message: 'Conexión exitosa con OpenAI',
          models: response.data.slice(0, 5).map(m => m.id)
        });
      }
    }

    // Test Groq connection
    if (provider === 'groq') {
      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey });
      
      const response = await groq.models.list();
      
      if (response.data) {
        return res.json({ 
          success: true, 
          message: 'Conexión exitosa con Groq',
          models: response.data.map(m => m.id)
        });
      }
    }

    res.status(400).json({ error: 'Proveedor no soportado' });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(400).json({ 
      error: 'Error de conexión: ' + (error.message || 'API key inválida')
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
