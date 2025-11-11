const express = require('express');
const router = express.Router();
const multer = require('multer');
const TrainingService = require('../services/trainingService');
const DocumentProcessor = require('../services/documentProcessor');

// Configuración de multer para archivos de entrenamiento
const trainingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const trainingDir = 'training-data/';
    if (!require('fs').existsSync(trainingDir)) {
      require('fs').mkdirSync(trainingDir);
    }
    cb(null, trainingDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const trainingUpload = multer({ storage: trainingStorage });

// Instanciar servicios
const trainingService = new TrainingService();
const documentProcessor = new DocumentProcessor();

// Endpoint para subir documentos para entrenamiento (soporte múltiple)
router.post('/upload', trainingUpload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron archivos' });
    }

    const chatbotId = req.body.chatbotId || null;
    const results = [];
    let totalChunks = 0;
    
    // Procesar cada archivo
    for (const file of req.files) {
      try {
        const processedData = await documentProcessor.processFile(file.path, file.mimetype);
        const trainingId = await trainingService.storeTrainingData(processedData, chatbotId);
        
        results.push({
          filename: file.originalname,
          trainingId,
          chunks: processedData.length,
          success: true
        });
        
        totalChunks += processedData.length;
      } catch (error) {
        console.error(`Error procesando ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          error: error.message,
          success: false
        });
      }
    }
    
    res.json({
      success: true,
      message: `${results.filter(r => r.success).length} de ${req.files.length} archivos procesados correctamente`,
      results,
      totalChunks
    });
  } catch (error) {
    console.error('Error procesando documentos:', error);
    res.status(500).json({ error: 'Error procesando los documentos' });
  }
});

// Endpoint para entrenar desde URL
router.post('/url', async (req, res) => {
  try {
    const { url, depth = 1, chatbotId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'La URL es requerida' });
    }

    // Procesar la página web
    const processedData = await documentProcessor.processWebPage(url, depth);
    
    // Almacenar los datos procesados
    const trainingId = await trainingService.storeTrainingData(processedData, chatbotId);
    
    res.json({
      success: true,
      trainingId,
      message: 'Página web procesada y almacenada para entrenamiento',
      chunks: processedData.length
    });
  } catch (error) {
    console.error('Error procesando URL:', error);
    res.status(500).json({ error: 'Error procesando la página web' });
  }
});

// Endpoint para entrenar con texto directo
router.post('/text', async (req, res) => {
  try {
    const { text, chatbotId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'El texto es requerido' });
    }

    // Procesar el texto
    const processedData = await documentProcessor.processText(text);
    
    // Almacenar los datos procesados
    const trainingId = await trainingService.storeTrainingData(processedData, chatbotId);
    
    res.json({
      success: true,
      trainingId,
      message: 'Texto procesado y almacenado para entrenamiento',
      chunks: processedData.length
    });
  } catch (error) {
    console.error('Error procesando texto:', error);
    res.status(500).json({ error: 'Error procesando el texto' });
  }
});

// Endpoint para iniciar entrenamiento del modelo
router.post('/train', async (req, res) => {
  try {
    const { trainingId, modelType = 'fine-tune' } = req.body;
    
    if (!trainingId) {
      return res.status(400).json({ error: 'El ID de entrenamiento es requerido' });
    }

    // Iniciar proceso de entrenamiento
    const trainingJob = await trainingService.startTraining(trainingId, modelType);
    
    res.json({
      success: true,
      jobId: trainingJob.id,
      status: 'iniciado',
      message: 'Entrenamiento iniciado'
    });
  } catch (error) {
    console.error('Error iniciando entrenamiento:', error);
    res.status(500).json({ error: 'Error iniciando el entrenamiento' });
  }
});

// Endpoint para verificar estado del entrenamiento
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await trainingService.getTrainingStatus(jobId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ error: 'Error obteniendo estado del entrenamiento' });
  }
});

// Endpoint para obtener lista de datos de entrenamiento disponibles
router.get('/data', async (req, res) => {
  try {
    const chatbotId = req.query.chatbotId || null;
    const trainingData = await trainingService.getAvailableTrainingData(chatbotId);
    
    res.json({
      success: true,
      data: trainingData
    });
  } catch (error) {
    console.error('Error obteniendo datos de entrenamiento:', error);
    res.status(500).json({ error: 'Error obteniendo datos de entrenamiento' });
  }
});

module.exports = router;
