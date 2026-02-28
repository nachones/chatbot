const db = require('./databaseService');
const TrainingService = require('./trainingService');
const llmService = require('./llmService');
const CalendarService = require('./calendarService');
const { getPlanLimits } = require('./planConfig');
const logger = require('./logger');

class ChatbotService {
  constructor() {
    this.db = db;
    this.trainingService = new TrainingService();
    this.calendarService = new CalendarService();
    this.systemPrompt = 'Eres un asistente inteligente y útil. Responde de manera clara y concisa.';
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
      let model = chatbotConfig?.model || process.env.DEFAULT_GEMINI_MODEL || 'gemini-2.0-flash';
      const temperature = chatbotConfig?.temperature || 0.7;
      const maxTokens = chatbotConfig?.max_tokens || 1000;
      
      // Detectar proveedor basado en el modelo
      let provider = llmService.detectProvider(model);

      // Buscar API key: primero la del chatbot, luego la del proveedor detectado, luego cualquier disponible
      let apiKey = chatbotConfig?.api_key;
      if (!apiKey) {
        // Intentar con la key del proveedor detectado
        const providerKeyMap = {
          gemini: process.env.GEMINI_API_KEY,
          openai: process.env.OPENAI_API_KEY,
          groq: process.env.GROQ_API_KEY
        };
        apiKey = providerKeyMap[provider];

        // Si no hay key para ese proveedor, buscar otro que sí tenga
        if (!apiKey) {
          const fallbackOrder = ['gemini', 'groq', 'openai'];
          const defaultModels = {
            gemini: process.env.DEFAULT_GEMINI_MODEL || 'gemini-2.0-flash',
            groq: process.env.DEFAULT_GROQ_MODEL || 'llama-3.3-70b-versatile',
            openai: process.env.DEFAULT_OPENAI_MODEL || 'gpt-4o-mini'
          };
          for (const p of fallbackOrder) {
            if (providerKeyMap[p]) {
              apiKey = providerKeyMap[p];
              provider = p;
              model = defaultModels[p];
              break;
            }
          }
        }

        if (!apiKey) {
          throw new Error('No hay API key configurada. Ve a Configuración para añadir una.');
        }
      }

      // === VERIFICAR CUOTA DE TOKENS ===
      if (chatbotId && chatbotConfig) {
        const plan = chatbotConfig.plan || 'starter';
        const { tokensLimit } = getPlanLimits(plan);

        // Verificar si necesita reset mensual
        if (chatbotConfig.reset_date) {
          const resetDate = new Date(chatbotConfig.reset_date);
          if (new Date() >= resetDate) {
            await this.db.resetMonthlyUsage(chatbotId);
          }
        }

        // Atomic check to prevent race conditions on concurrent requests
        const quota = await this.db.checkAndReserveTokens(chatbotId, tokensLimit);
        if (!quota.allowed) {
          throw new Error(`Has alcanzado el límite de tokens de tu plan. Actualiza tu plan para seguir usando el chatbot.`);
        }
      }

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
            
            logger.info(`✓ Encontrados ${relevantChunks.length} chunks relevantes para la consulta`);
          }
        } catch (error) {
          logger.error('Error buscando contenido relevante:', error);
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
      let calendarConnected = false;
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

        // Inject Google Calendar tools if connected
        try {
          calendarConnected = await this.calendarService.isConnected(chatbotId);
          if (calendarConnected) {
            const calendarTools = CalendarService.getCalendarTools();
            tools = tools ? [...tools, ...calendarTools] : calendarTools;
          }
        } catch (e) {
          logger.warn('Error checking calendar connection:', e.message);
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
          let functionArgs;
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (parseErr) {
            logger.error(`Error parsing arguments for ${functionName}:`, parseErr.message);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: 'Argumentos inválidos recibidos del modelo' })
            });
            continue;
          }
          
          // Check if it's a calendar function
          const isCalendarFunction = ['check_calendar_availability', 'book_calendar_appointment'].includes(functionName);

          if (isCalendarFunction && calendarConnected) {
            try {
              const calendarResult = await this.calendarService.executeCalendarTool(chatbotId, functionName, functionArgs);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(calendarResult)
              });
            } catch (error) {
              logger.error(`Error ejecutando función calendario ${functionName}:`, error);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: error.message })
              });
            }
          } else {
            // Buscar la función en las disponibles (HTTP functions)
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
                logger.error(`Error ejecutando función ${functionName}:`, error);
                messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ error: error.message })
                });
              }
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

      // Actualizar uso de tokens y mensajes si hay chatbotId
      if (chatbotId && result.usage) {
        const totalTokens = result.usage.total_tokens;
        await this.db.updateTokenUsage(chatbotId, totalTokens);
        await this.db.incrementMessageCount(chatbotId);
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
      logger.error('Error procesando mensaje:', error);
      throw new Error(error.message || 'Error al procesar el mensaje');
    }
  }

  // Validate URL is not targeting internal/private networks (SSRF protection)
  _isUrlSafe(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      
      // Block private/internal hostnames
      const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal'];
      if (blockedHostnames.includes(hostname)) return false;
      
      // Block private IP ranges
      const parts = hostname.split('.');
      if (parts.length === 4 && parts.every(p => !isNaN(p))) {
        const [a, b] = parts.map(Number);
        if (a === 10) return false;                           // 10.x.x.x
        if (a === 172 && b >= 16 && b <= 31) return false;    // 172.16-31.x.x
        if (a === 192 && b === 168) return false;             // 192.168.x.x
        if (a === 169 && b === 254) return false;             // 169.254.x.x (link-local)
      }
      
      // Block non-http(s) protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  async executeFunction(functionDef, args) {
    try {
      // SSRF protection: validate endpoint URL
      if (!this._isUrlSafe(functionDef.endpoint)) {
        return {
          error: true,
          message: 'URL de endpoint no permitida (IPs privadas/localhost bloqueados)'
        };
      }

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
          logger.warn('Headers inválidos para función:', functionDef.name);
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
      logger.error('Error ejecutando función externa:', error);
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
      logger.error('Error obteniendo historial:', error);
      return [];
    }
  }

  async updateConfig(config) {
    try {
      if (config.systemPrompt) {
        this.systemPrompt = config.systemPrompt;
      }
      
      await this.db.saveConfig(config);
      return true;
    } catch (error) {
      logger.error('Error actualizando configuración:', error);
      throw error;
    }
  }

  async getConfig() {
    try {
      return await this.db.getConfig();
    } catch (error) {
      logger.error('Error obteniendo configuración:', error);
      return {
        model: 'gemini-2.0-flash',
        systemPrompt: this.systemPrompt
      };
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }
}

module.exports = ChatbotService;
