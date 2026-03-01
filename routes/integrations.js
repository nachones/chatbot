const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { authMiddleware } = require('./auth');
const logger = require('../services/logger');

// GET /api/integrations/wordpress/download
// Genera y descarga el plugin de WordPress como ZIP
router.get('/wordpress/download', authMiddleware, async (req, res) => {
    try {
        const pluginDir = path.join(__dirname, '..', 'public', 'downloads', 'miabot-chatbot');

        // Verificar que el directorio del plugin existe
        if (!fs.existsSync(pluginDir)) {
            return res.status(404).json({ error: 'Plugin de WordPress no disponible' });
        }

        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=miabot-chatbot.zip');

        // Crear el archivo ZIP
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            logger.error('Error creando ZIP del plugin WordPress:', err);
            res.status(500).json({ error: 'Error generando el archivo ZIP' });
        });

        // Pipe al response
        archive.pipe(res);

        // Añadir el directorio del plugin al ZIP
        archive.directory(pluginDir, 'miabot-chatbot');

        // Finalizar
        await archive.finalize();

        logger.info(`Plugin WordPress descargado por usuario ${req.user?.id || 'unknown'}`);
    } catch (error) {
        logger.error('Error en descarga del plugin WordPress:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
