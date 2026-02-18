const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DocumentProcessor = require('../services/documentProcessor');
const DatabaseService = require('../services/databaseService');
const TrainingService = require('../services/trainingService');
const { authMiddleware } = require('./auth');

const db = new DatabaseService();
const documentProcessor = new DocumentProcessor();
const trainingService = new TrainingService();

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedMimes = [
      'application/pdf', 'text/plain', 'text/markdown', 'text/html',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Use PDF, DOCX, TXT, MD o HTML.'), false);
    }
  }
});

// All training routes require authentication
router.use(authMiddleware);

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

    let totalChunks = 0;
    // Save processed data using trainingService (generates embeddings)
    for (const result of results) {
      if (result.data && result.data.length > 0) {
        // Add source metadata to chunks
        const chunksWithMeta = result.data.map(chunk => ({
          content: chunk.content,
          metadata: { type: 'file', source: result.filename, ...chunk.metadata }
        }));
        await trainingService.storeTrainingData(chunksWithMeta, chatbotId);
        totalChunks += chunksWithMeta.length;
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
      message: `${files.length} archivo(s) procesado(s): ${totalChunks} fragmentos guardados con embeddings`,
      results: results,
      totalChunks
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

    // Save using trainingService (generates embeddings)
    const chunksWithMeta = chunks.map(chunk => ({
      content: chunk.content,
      metadata: { type: 'url', source: url, ...chunk.metadata }
    }));
    await trainingService.storeTrainingData(chunksWithMeta, chatbotId);

    res.json({
      success: true,
      message: `URL procesada: ${chunks.length} fragmentos guardados con embeddings`,
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Error processing URL:', error);
    res.status(500).json({ error: 'Error procesando URL' });
  }
});

// Train from text
router.post('/text', async (req, res) => {
  try {
    const { text, content, chatbotId, title } = req.body;
    const textContent = text || content; // Accept both field names

    if (!textContent) {
      return res.status(400).json({ error: 'Texto requerido' });
    }

    if (!chatbotId) {
      return res.status(400).json({ error: 'ID del chatbot requerido' });
    }

    // Process text into chunks
    const chunks = await documentProcessor.processText(textContent);

    // Save using trainingService (generates embeddings)
    const chunksWithMeta = chunks.map(chunk => ({
      content: chunk.content,
      metadata: { type: 'text', source: title || 'Texto manual', ...chunk.metadata }
    }));
    await trainingService.storeTrainingData(chunksWithMeta, chatbotId);

    res.json({
      success: true,
      message: `Texto procesado: ${chunks.length} fragmentos guardados con embeddings`,
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Error procesando texto' });
  }
});

// Get training data for a chatbot
router.get('/data/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const trainingData = await db.getTrainingDataByChatbot(chatbotId);

    res.json({
      success: true,
      trainingData: trainingData || []
    });
  } catch (error) {
    console.error('Error getting training data:', error);
    res.status(500).json({ error: 'Error obteniendo datos de entrenamiento' });
  }
});

// Delete training data item
router.delete('/data/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.deleteTrainingData(id);

    res.json({
      success: true,
      message: 'Dato de entrenamiento eliminado'
    });
  } catch (error) {
    console.error('Error deleting training data:', error);
    res.status(500).json({ error: 'Error eliminando dato de entrenamiento' });
  }
});

// Get training statistics for a chatbot
router.get('/stats/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const stats = await db.getTrainingStats(chatbotId);

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting training stats:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
