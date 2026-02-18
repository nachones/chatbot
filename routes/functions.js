const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { authMiddleware } = require('./auth');

const db = new DatabaseService();

// All function routes require authentication
router.use(authMiddleware);

// Get all functions for a chatbot
router.get('/', async (req, res) => {
  try {
    const { chatbotId } = req.query;
    
    if (!chatbotId) {
      return res.status(400).json({ error: 'chatbotId es requerido' });
    }
    
    const functions = await db.getFunctions(chatbotId);
    
    res.json({
      success: true,
      functions: functions
    });
  } catch (error) {
    console.error('Error getting functions:', error);
    res.status(500).json({ error: 'Error obteniendo funciones' });
  }
});

// Get single function
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const func = await db.getFunction(id);
    
    if (!func) {
      return res.status(404).json({ error: 'Función no encontrada' });
    }
    
    res.json({
      success: true,
      function: func
    });
  } catch (error) {
    console.error('Error getting function:', error);
    res.status(500).json({ error: 'Error obteniendo función' });
  }
});

// Create new function
router.post('/', async (req, res) => {
  try {
    const functionData = req.body;
    
    if (!functionData.name || !functionData.description || !functionData.endpoint || !functionData.chatbotId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Validate function name format
    if (!/^[a-zA-Z0-9_]+$/.test(functionData.name)) {
      return res.status(400).json({ error: 'El nombre de la función solo puede contener letras, números y guiones bajos' });
    }
    
    const newFunction = await db.createFunction(functionData);
    
    res.json({
      success: true,
      function: newFunction,
      message: 'Función creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating function:', error);
    res.status(500).json({ error: 'Error creando función' });
  }
});

// Update function
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const functionData = req.body;
    
    // Validate function name format if name is being updated
    if (functionData.name && !/^[a-zA-Z0-9_]+$/.test(functionData.name)) {
      return res.status(400).json({ error: 'El nombre de la función solo puede contener letras, números y guiones bajos' });
    }
    
    const updatedFunction = await db.updateFunction(id, functionData);
    
    res.json({
      success: true,
      function: updatedFunction,
      message: 'Función actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating function:', error);
    res.status(500).json({ error: 'Error actualizando función' });
  }
});

// Delete function
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteFunction(id);
    
    res.json({
      success: true,
      message: 'Función eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting function:', error);
    res.status(500).json({ error: 'Error eliminando función' });
  }
});

module.exports = router;
