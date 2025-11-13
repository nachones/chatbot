const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');

const db = new DatabaseService();

// POST /api/leads - Guardar nuevo lead
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, chatbotId, metadata } = req.body;

    // Validación básica
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y email son requeridos'
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Guardar lead en la base de datos
    const leadId = await db.saveLead({
      chatbot_id: chatbotId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      created_at: new Date().toISOString()
    });

    console.log(`✓ Lead guardado: ${name} (${email}) - ID: ${leadId}`);

    res.json({
      success: true,
      message: 'Lead guardado correctamente',
      leadId: leadId
    });

  } catch (error) {
    console.error('Error guardando lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el lead',
      message: error.message
    });
  }
});

// GET /api/leads - Obtener todos los leads
router.get('/', async (req, res) => {
  try {
    const { chatbotId } = req.query;

    const leads = await db.getLeads(chatbotId);

    res.json({
      success: true,
      leads: leads,
      count: leads.length
    });

  } catch (error) {
    console.error('Error obteniendo leads:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener leads',
      message: error.message
    });
  }
});

// GET /api/leads/:id - Obtener un lead específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await db.getLead(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead no encontrado'
      });
    }

    res.json({
      success: true,
      lead: lead
    });

  } catch (error) {
    console.error('Error obteniendo lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el lead',
      message: error.message
    });
  }
});

// DELETE /api/leads/:id - Eliminar un lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.deleteLead(id);

    res.json({
      success: true,
      message: 'Lead eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el lead',
      message: error.message
    });
  }
});

module.exports = router;
