const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentProcessor = require('../services/documentProcessor');
const DatabaseService = require('../services/databaseService');

const db = new DatabaseService();
const documentProcessor = new DocumentProcessor();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload training files
router.post('/upload', upload.array('files', 5), async (req, res) => {
  try {
    const { chatbotId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se han subido archivos' });
    }

    if (!chatbotId) {
      return res.status(400).json({ error: 'ID del chatbot requerido' });
    }

    const results = await documentProcessor.processMultipleFiles(files);

    // Save processed data to database
    for (const result of results) {
      if (result.data) {
        for (const chunk of result.data) {
          await db.addTrainingData(chatbotId, chunk.content, 'file', result.filename);
        }
      }
    }

    // Clean up uploaded files
    for (const file of files) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.json({
      success: true,
      message: 'Archivos procesados correctamente',
      results: results
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Error procesando archivos' });
  }
});

// Train from URL
router.post('/url', async (req, res) => {
  try {
    const { url, chatbotId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requerida' });
    }

    if (!chatbotId) {
      return res.status(400).json({ error: 'ID del chatbot requerido' });
    }

    const chunks = await documentProcessor.processWebPage(url);

    // Save to database
    for (const chunk of chunks) {
      await db.addTrainingData(chatbotId, chunk.content, 'url', url);
    }

    res.json({
      success: true,
      message: 'URL procesada correctamente',
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Error processing URL:', error);
    res.status(500).json({ error: 'Error procesando URL' });
  }
});

module.exports = router;
