const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { authMiddleware } = require('./auth');

const db = new DatabaseService();

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
            error: error.message 
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
            error: error.message 
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
            error: error.message 
        });
    }
});

// Update a quick prompt (requires auth)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
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
            error: error.message 
        });
    }
});

// Delete a quick prompt (requires auth)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await db.deleteQuickPrompt(req.params.id);
        res.json({ 
            success: true, 
            message: 'Quick prompt deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting quick prompt:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
