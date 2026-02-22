const db = require('./databaseService');
const llmService = require('./llmService');

class TrainingService {
  constructor() {
    this.db = db;
  }

  async generateEmbedding(text) {
    try {
      const embedding = await llmService.generateEmbedding(text);
      return embedding; // Can be null if no API key available
    } catch (error) {
      console.warn('Embeddings no disponibles (sin API key configurada):', error.message);
      return null;
    }
  }

  async storeTrainingData(chunks, chatbotId = null) {
    const trainingId = 'training_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    try {
      // Generar embeddings para cada chunk
      console.log(`Generando embeddings para ${chunks.length} chunks...`);

      // Procesar en paralelo pero con límite si fueran muchos (aquí simple Promise.all)
      const chunksWithEmbeddings = await Promise.all(chunks.map(async (chunk) => {
        try {
          const embedding = await this.generateEmbedding(chunk.content);
          return { ...chunk, embedding };
        } catch (error) {
          console.error(`Error generando embedding para chunk: ${chunk.content.substring(0, 50)}...`, error);
          return { ...chunk, embedding: null }; // Guardar sin embedding si falla
        }
      }));

      await this.db.storeTrainingData(trainingId, chunksWithEmbeddings, chatbotId);
      return trainingId;
    } catch (error) {
      console.error('Error almacenando datos de entrenamiento:', error);
      throw error;
    }
  }

  async startTraining(trainingId, modelType = 'fine-tune') {

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

  // Cálculo de similitud coseno entre dos vectores
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async searchRelevantContent(query, limit = 5, chatbotId = null) {
    try {
      // 1. Generar embedding de la consulta
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        console.log('Embeddings no disponibles, usando búsqueda por palabras clave');
        return this.searchRelevantContentSimple(query, limit, chatbotId);
      }

      // 2. Obtener todos los chunks del chatbot (esto no escala bien para millones de registros,
      // para producción real se necesitaría una base de datos vectorial como Pinecone o pgvector)
      const allTrainingIds = await this.db.getAvailableTrainingData(chatbotId);

      if (!allTrainingIds || allTrainingIds.length === 0) {
        return [];
      }

      let allChunks = [];
      for (const training of allTrainingIds) {
        const data = await this.db.getTrainingData(training.training_id);
        allChunks.push(...data);
      }

      // 3. Calcular similitud y filtrar
      const scoredChunks = allChunks
        .filter(chunk => chunk.embedding) // Solo chunks con embedding
        .map(chunk => ({
          ...chunk,
          similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Si no hay chunks con embeddings (datos antiguos), usar fallback
      if (scoredChunks.length === 0 && allChunks.length > 0) {
        return this.searchRelevantContentSimple(query, limit, chatbotId);
      }

      console.log(`Búsqueda semántica: "${query}" - Encontrados ${scoredChunks.length} chunks. Top score: ${scoredChunks[0]?.similarity.toFixed(4)}`);

      // Filtrar por un umbral mínimo de relevancia (ej. 0.3)
      return scoredChunks.filter(chunk => chunk.similarity > 0.3);

    } catch (error) {
      console.error('Error buscando contenido relevante:', error);
      return [];
    }
  }

  // Fallback a búsqueda por palabras clave antigua
  async searchRelevantContentSimple(query, limit = 5, chatbotId = null) {
    const allData = await this.db.getAvailableTrainingData(chatbotId);

    if (!allData || allData.length === 0) {
      return [];
    }

    const relevantContent = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);

    for (const training of allData) {
      const data = await this.db.getTrainingData(training.training_id);

      const scoredChunks = data.map(chunk => {
        const contentLower = chunk.content.toLowerCase();
        let score = 0;

        if (contentLower.includes(queryLower)) score += 10;

        queryWords.forEach(word => {
          if (contentLower.includes(word)) score += 2;
        });

        return { ...chunk, relevanceScore: score };
      });

      relevantContent.push(...scoredChunks.filter(c => c.relevanceScore > 0));
    }

    return relevantContent
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
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
