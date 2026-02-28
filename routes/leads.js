const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const { authMiddleware } = require('./auth');
const { verifyOwnership } = require('../services/planConfig');
const logger = require('../services/logger');

// POST /api/leads - Guardar nuevo lead (público - desde el widget)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, chatbotId } = req.body;

    // Validación básica
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y email son requeridos'
      });
    }

    // Validar longitudes (prevenir spam/abuse)
    if (name.length > 200 || email.length > 320 || (phone && phone.length > 30)) {
      return res.status(400).json({
        success: false,
        error: 'Datos demasiado largos'
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

    res.json({
      success: true,
      message: 'Lead guardado correctamente',
      leadId: leadId
    });

  } catch (error) {
    logger.error('Error guardando lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el lead'
    });
  }
});

// GET /api/leads - Obtener todos los leads (requires auth + ownership)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { chatbotId } = req.query;

    if (chatbotId) {
      const owns = await verifyOwnership(db, chatbotId, req.user.id);
      if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso a este chatbot' });
    }

    const leads = await db.getLeads(chatbotId);

    res.json({
      success: true,
      leads: leads,
      count: leads.length
    });

  } catch (error) {
    logger.error('Error obteniendo leads:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener leads'
    });
  }
});

// GET /api/leads/:id - Obtener un lead específico (requires auth)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await db.getLead(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead no encontrado'
      });
    }

    // Verify ownership via chatbot_id
    if (lead.chatbot_id) {
      const owns = await verifyOwnership(db, lead.chatbot_id, req.user.id);
      if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso a este lead' });
    }

    res.json({
      success: true,
      lead: lead
    });

  } catch (error) {
    logger.error('Error obteniendo lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el lead'
    });
  }
});

// DELETE /api/leads/:id - Eliminar un lead (requires auth + ownership)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await db.getLead(id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });

    if (lead.chatbot_id) {
      const owns = await verifyOwnership(db, lead.chatbot_id, req.user.id);
      if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso a este lead' });
    }

    await db.deleteLead(id);

    res.json({
      success: true,
      message: 'Lead eliminado correctamente'
    });

  } catch (error) {
    logger.error('Error eliminando lead:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el lead'
    });
  }
});

module.exports = router;
