const DatabaseService = require('./databaseService');
const OpenAI = require('openai');

class TrainingService {
  constructor() {
    this.db = new DatabaseService();
    this.openai = null;
  }

  async initializeOpenAI(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  async storeTrainingData(chunks, chatbotId = null) {
    const trainingId = 'training_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
      await this.db.storeTrainingData(trainingId, chunks, chatbotId);
      return trainingId;
    } catch (error) {
      console.error('Error almacenando datos de entrenamiento:', error);
      throw error;
    }
  }

  async startTraining(trainingId, modelType = 'fine-tune') {
    if (!this.openai) {
      await this.initializeOpenAI();
    }

    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
      // Crear registro del trabajo
      await this.db.createTrainingJob(jobId, trainingId, modelType);

      // Obtener datos de entrenamiento
      const trainingData = await this.db.getTrainingData(trainingId);
      
      if (trainingData.length === 0) {
        throw new Error('No hay datos de entrenamiento disponibles');
      }

      // Simular proceso de entrenamiento (en producción usaría OpenAI fine-tuning)
      setTimeout(async () => {
        try {
          // Aquí iría el código real de fine-tuning con OpenAI
          // Por ahora simulamos éxito
          await this.db.updateTrainingJob(jobId, 'completed');
          console.log(`Entrenamiento ${jobId} completado exitosamente`);
        } catch (error) {
          await this.db.updateTrainingJob(jobId, 'failed', error.message);
          console.error(`Error en entrenamiento ${jobId}:`, error);
        }
      }, 5000); // Simular 5 segundos de entrenamiento

      return {
        id: jobId,
        status: 'pending',
        trainingId: trainingId,
        modelType: modelType
      };
    } catch (error) {
      console.error('Error iniciando entrenamiento:', error);
      throw error;
    }
  }

  async getTrainingStatus(jobId) {
    try {
      return await this.db.getTrainingStatus(jobId);
    } catch (error) {
      console.error('Error obteniendo estado del entrenamiento:', error);
      throw error;
    }
  }

  async getAvailableTrainingData(chatbotId = null) {
    try {
      return await this.db.getAvailableTrainingData(chatbotId);
    } catch (error) {
      console.error('Error obteniendo datos de entrenamiento disponibles:', error);
      throw error;
    }
  }

  async searchRelevantContent(query, limit = 5) {
    try {
      // Obtener todos los datos de entrenamiento
      const allData = await this.db.getAvailableTrainingData();
      
      // Implementar búsqueda básica por similitud
      // En producción usaría embeddings y búsqueda vectorial
      const relevantContent = [];
      
      for (const training of allData) {
        const data = await this.db.getTrainingData(training.training_id);
        const relevantChunks = data.filter(chunk => 
          chunk.content.toLowerCase().includes(query.toLowerCase())
        ).slice(0, limit);
        
        relevantContent.push(...relevantChunks);
      }
      
      return relevantContent.slice(0, limit);
    } catch (error) {
      console.error('Error buscando contenido relevante:', error);
      return [];
    }
  }

  async prepareTrainingFile(trainingId) {
    const trainingData = await this.db.getTrainingData(trainingId);
    
    // Preparar archivo JSONL para fine-tuning de OpenAI
    const trainingExamples = trainingData.map(chunk => ({
      messages: [
        { role: 'system', content: 'Eres un asistente experto basado en la información proporcionada.' },
        { role: 'user', content: `¿Qué información hay sobre: ${chunk.content.substring(0, 100)}...` },
        { role: 'assistant', content: chunk.content }
      ]
    }));

    return trainingExamples;
  }
}

module.exports = TrainingService;
