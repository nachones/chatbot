const OpenAI = require('openai');
const DatabaseService = require('./databaseService');
const TrainingService = require('./trainingService');
const llmService = require('./llmService');

class ChatbotService {
  constructor() {
    this.openai = null;
    this.db = new DatabaseService();
    this.trainingService = new TrainingService();
    this.systemPrompt = 'Eres un asistente inteligente y útil. Responde de manera clara y concisa.';
  }

  async initialize(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  async processMessage(message, sessionId = null, context = {}, chatbotId = null) {
    try {
      // Obtener configuración del chatbot específico si se proporciona
      let chatbotConfig = null;
      if (chatbotId) {
        chatbotConfig = await this.db.getChatbot(chatbotId);
        if (!chatbotConfig) {
          throw new Error('Chatbot no encontrado');
        }
        if (!chatbotConfig.is_active) {
          throw new Error('El chatbot está suspendido');
        }
      }

      // Configuración del modelo
      const model = chatbotConfig?.model || process.env.DEFAULT_OPENAI_MODEL || 'gpt-3.5-turbo';
      const apiKey = chatbotConfig?.api_key || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
      const temperature = chatbotConfig?.temperature || 0.7;
      const maxTokens = chatbotConfig?.max_tokens || 500;
      
      // Detectar proveedor basado en el modelo
      const provider = llmService.detectProvider(model);

      // Generar sessionId si no se proporciona
      if (!sessionId) {
        sessionId = this.generateSessionId();
      }

      // Obtener historial de conversación
      const history = await this.db.getConversationHistory(sessionId);
      
      // Usar el system prompt del chatbot o el por defecto
      let systemPrompt = chatbotConfig?.system_prompt || this.systemPrompt;
      
      // 🔥 BUSCAR CONTENIDO RELEVANTE EN TRAINING DATA
      let contextText = '';
      if (chatbotId) {
        try {
          const relevantChunks = await this.trainingService.searchRelevantContent(
            message, 
            5, 
            chatbotId
          );
          
          if (relevantChunks && relevantChunks.length > 0) {
            contextText = relevantChunks
              .map(chunk => chunk.content)
              .join('\n\n---\n\n');
            
            // Enriquecer el system prompt con el contexto
            systemPrompt = `${systemPrompt}

CONTEXTO RELEVANTE DE LA BASE DE CONOCIMIENTOS:
${contextText}

Usa esta información para responder de manera precisa y detallada. Si la pregunta del usuario está relacionada con este contexto, úsalo en tu respuesta. Si no está relacionado, responde normalmente basándote en tu conocimiento general.`;
            
            console.log(`✓ Encontrados ${relevantChunks.length} chunks relevantes para la consulta`);
          }
        } catch (error) {
          console.error('Error buscando contenido relevante:', error);
          // Continuar sin contexto si hay error
        }
      }
      
      // Construir mensajes para el LLM
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      // Obtener funciones habilitadas del chatbot
      let tools = null;
      let availableFunctions = [];
      if (chatbotId) {
        const functions = await this.db.getFunctions(chatbotId);
        availableFunctions = functions.filter(f => f.enabled);
        
        if (availableFunctions.length > 0) {
          tools = availableFunctions.map(func => ({
            type: 'function',
            function: {
              name: func.name,
              description: func.description,
              parameters: {
                type: 'object',
                properties: func.parameters.reduce((acc, param) => {
                  acc[param.name] = {
                    type: param.type,
                    description: param.description
                  };
                  return acc;
                }, {}),
                required: func.parameters
                  .filter(p => p.required)
                  .map(p => p.name)
              }
            }
          }));
        }
      }

      // Usar el servicio LLM unificado
      let result = await llmService.chat({
        messages,
        model,
        temperature,
        maxTokens,
        apiKey,
        provider,
        tools
      });

      let responseMessage = result.message;

      // Procesar function calling si el LLM solicita ejecutar una función
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Guardar el mensaje del usuario
        await this.db.saveMessage(sessionId, 'user', message, chatbotId);
        
        // Añadir la respuesta del asistente con tool_calls al historial
        messages.push(responseMessage);

        // Ejecutar cada función solicitada
        for (const toolCall of result.toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          // Buscar la función en las disponibles
          const functionDef = availableFunctions.find(f => f.name === functionName);
          
          if (functionDef) {
            try {
              // Ejecutar la función
              const functionResult = await this.executeFunction(functionDef, functionArgs);
              
              // Añadir el resultado al historial de mensajes
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
              });
            } catch (error) {
              console.error(`Error ejecutando función ${functionName}:`, error);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: error.message })
              });
            }
          }
        }

        // Obtener la respuesta final del LLM con los resultados de las funciones
        result = await llmService.chat({
          messages,
          model,
          temperature,
          maxTokens,
          apiKey,
          provider
        });
        
        responseMessage = result.message;
      } else {
        // Si no hay function calling, guardar el mensaje del usuario
        await this.db.saveMessage(sessionId, 'user', message, chatbotId);
      }

      const response = responseMessage.content;

      // Guardar respuesta final del asistente
      await this.db.saveMessage(sessionId, 'assistant', response, chatbotId);

      // Actualizar uso de tokens si hay chatbotId
      if (chatbotId && result.usage) {
        const totalTokens = result.usage.total_tokens;
        await this.db.updateTokenUsage(chatbotId, totalTokens);
      }

      return {
        text: response,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        provider: result.provider,
        model: result.model,
        responseTime: result.responseTime
      };
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      throw new Error(error.message || 'Error al procesar el mensaje');
    }
  }

  async executeFunction(functionDef, args) {
    try {
      const axios = require('axios');
      
      // Preparar headers
      let headers = {
        'Content-Type': 'application/json'
      };
      
      if (functionDef.headers) {
        try {
          const customHeaders = typeof functionDef.headers === 'string' 
            ? JSON.parse(functionDef.headers) 
            : functionDef.headers;
          headers = { ...headers, ...customHeaders };
        } catch (e) {
          console.warn('Headers inválidos para función:', functionDef.name);
        }
      }

      // Ejecutar la función según el método HTTP
      let response;
      const method = functionDef.method.toUpperCase();
      
      switch (method) {
        case 'GET':
          // Para GET, pasar argumentos como query params
          response = await axios.get(functionDef.endpoint, {
            params: args,
            headers: headers,
            timeout: 10000
          });
          break;
          
        case 'POST':
          response = await axios.post(functionDef.endpoint, args, {
            headers: headers,
            timeout: 10000
          });
          break;
          
        case 'PUT':
          response = await axios.put(functionDef.endpoint, args, {
            headers: headers,
            timeout: 10000
          });
          break;
          
        case 'DELETE':
          response = await axios.delete(functionDef.endpoint, {
            data: args,
            headers: headers,
            timeout: 10000
          });
          break;
          
        default:
          throw new Error(`Método HTTP no soportado: ${method}`);
      }

      return response.data;
    } catch (error) {
      console.error('Error ejecutando función externa:', error);
      return {
        error: true,
        message: error.message || 'Error ejecutando la función',
        details: error.response?.data || null
      };
    }
  }

  async getConversationHistory(sessionId) {
    try {
      return await this.db.getConversationHistory(sessionId);
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  async updateConfig(config) {
    try {
      if (config.apiKey) {
        await this.initialize(config.apiKey);
      }
      if (config.systemPrompt) {
        this.systemPrompt = config.systemPrompt;
      }
      
      await this.db.saveConfig(config);
      return true;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      throw error;
    }
  }

  async getConfig() {
    try {
      return await this.db.getConfig();
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return {
        model: 'gpt-3.5-turbo',
        systemPrompt: this.systemPrompt
      };
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = ChatbotService;
