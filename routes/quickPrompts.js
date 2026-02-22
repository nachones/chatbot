const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const { authMiddleware } = require('./auth');
const { verifyOwnership } = require('../services/planConfig');

// Get all quick prompts for a chatbot
router.get('/', async (req, res) => {
    try {
        const { chatbotId } = req.query;
        
        if (!chatbotId) {
            return res.status(400).json({ 
                success: false, 
                error: 'chatbotId is required' 
            });
        }

        const prompts = await db.getQuickPrompts(chatbotId);
        res.json({ success: true, prompts });
    } catch (error) {
        console.error('Error fetching quick prompts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo quick prompts' 
        });
    }
});

// Get a single quick prompt
router.get('/:id', async (req, res) => {
    try {
        const prompt = await db.getQuickPrompt(req.params.id);
        
        if (!prompt) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quick prompt not found' 
            });
        }

        res.json({ success: true, prompt });
    } catch (error) {
        console.error('Error fetching quick prompt:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo quick prompt' 
        });
    }
});

// Create a new quick prompt (requires auth)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { chatbotId, buttonTitle, title, link, prompt, prompt_text, display_order } = req.body;
        const finalTitle = buttonTitle || title; // Accept both field names
        const finalPrompt = prompt || prompt_text; // Accept both field names

        if (!chatbotId || !finalTitle) {
            return res.status(400).json({ 
                success: false, 
                error: 'chatbotId and buttonTitle are required' 
            });
        }

        const owns = await verifyOwnership(db, chatbotId, req.user.id);
        if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso a este chatbot' });

        // Validate: must have either link or prompt
        if (!link && !finalPrompt) {
            return res.status(400).json({ 
                success: false, 
                error: 'Either link or prompt must be provided' 
            });
        }

        const promptData = {
            chatbotId,
            buttonTitle: finalTitle,
            link: link || null,
            prompt: finalPrompt || null,
            display_order: display_order || 0
        };

        const newPrompt = await db.createQuickPrompt(promptData);
        res.status(201).json({ 
            success: true, 
            prompt: newPrompt 
        });
    } catch (error) {
        console.error('Error creating quick prompt:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error creando quick prompt' 
        });
    }
});

// Update a quick prompt (requires auth + ownership)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const existing = await db.getQuickPrompt(req.params.id);
        if (!existing) return res.status(404).json({ success: false, error: 'Quick prompt no encontrado' });
        if (existing.chatbot_id) {
            const owns = await verifyOwnership(db, existing.chatbot_id, req.user.id);
            if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso' });
        }

        const { buttonTitle, link, prompt } = req.body;

        // Validate: if updating, must have either link or prompt
        if ((link === '' || link === null) && (prompt === '' || prompt === null)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Either link or prompt must be provided' 
            });
        }

        const updatedPrompt = await db.updateQuickPrompt(req.params.id, req.body);
        res.json({ 
            success: true, 
            prompt: updatedPrompt 
        });
    } catch (error) {
        console.error('Error updating quick prompt:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error actualizando quick prompt' 
        });
    }
});

// Delete a quick prompt (requires auth + ownership)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const existing = await db.getQuickPrompt(req.params.id);
        if (!existing) return res.status(404).json({ success: false, error: 'Quick prompt no encontrado' });
        if (existing.chatbot_id) {
            const owns = await verifyOwnership(db, existing.chatbot_id, req.user.id);
            if (!owns) return res.status(403).json({ success: false, error: 'No tienes acceso' });
        }

        await db.deleteQuickPrompt(req.params.id);
        res.json({ 
            success: true, 
            message: 'Quick prompt deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting quick prompt:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error eliminando quick prompt' 
        });
    }
});

module.exports = router;
