/**
 * LLM Service - Unified interface for multiple LLM providers
 * Supports: OpenAI, Groq (free & fast), Google Gemini
 */

const OpenAI = require('openai');
const axios = require('axios');
const logger = require('./logger');

class LLMService {
  constructor() {
    this.providers = {};
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'gemini';
  }

  /**
   * Initialize a provider with API key
   */
  async initProvider(provider, apiKey) {
    switch (provider) {
      case 'openai':
        this.providers.openai = new OpenAI({ apiKey });
        break;
      
      case 'groq':
        this.providers.groq = new OpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1'
        });
        break;
      
      case 'gemini':
        try {
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          this.providers.gemini = new GoogleGenerativeAI(apiKey);
        } catch (error) {
          logger.error('Error initializing Gemini:', error.message);
          throw new Error('No se pudo inicializar Gemini. Verifica que @google/generative-ai esté instalado.');
        }
        break;
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  /**
   * Get available models for a provider (or all)
   */
  getAvailableModels(provider) {
    const models = {
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Última generación, muy potente' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Compacto, rápido y económico' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 optimizado' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido y económico' }
      ],
      groq: [
        { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', description: 'Potente, gratis' },
        { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B', description: 'Ultra rápido, gratis' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Buen balance calidad/velocidad' },
        { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Modelo de Google, gratis' }
      ],
      gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Rápido, potente, capa gratuita generosa' },
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Ultra rápido, ideal para alto volumen' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido y eficiente' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Máxima calidad, contexto enorme' }
      ]
    };
    
    if (provider) {
      return models[provider] || [];
    }
    return models;
  }

  /**
   * Detect provider from model name
   */
  detectProvider(model) {
    if (!model) return this.defaultProvider;
    if (model.startsWith('gpt-')) return 'openai';
    if (model.includes('llama') || model.includes('mixtral') || model.includes('gemma')) return 'groq';
    if (model.startsWith('gemini')) return 'gemini';
    return this.defaultProvider;
  }

  /**
   * Convert messages to Gemini format
   */
  _convertToGeminiFormat(messages) {
    const systemParts = [];
    const history = [];
    let lastUserMessage = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else if (msg.role === 'user') {
        lastUserMessage = msg.content;
        history.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        history.push({ role: 'model', parts: [{ text: msg.content }] });
      } else if (msg.role === 'tool') {
        history.push({ role: 'user', parts: [{ text: `[Resultado de función]: ${msg.content}` }] });
      }
    }

    // Remove the last user message from history (it will be sent as the new message)
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop();
    }

    return {
      systemInstruction: systemParts.join('\n\n') || undefined,
      history,
      lastUserMessage
    };
  }

  /**
   * Chat completion - unified interface
   */
  async chat(options) {
    const {
      messages,
      model = 'gemini-2.0-flash',
      temperature = 0.7,
      maxTokens = 1000,
      apiKey = null,
      provider = null,
      tools = null
    } = options;

    // Determine provider
    const detectedProvider = provider || this.detectProvider(model);
    
    // Initialize provider if needed
    const key = apiKey || process.env[`${detectedProvider.toUpperCase()}_API_KEY`];
    if (!key) {
      throw new Error(`API key no configurada para ${detectedProvider}. Configúrala en el panel de Configuración.`);
    }

    if (!this.providers[detectedProvider]) {
      await this.initProvider(detectedProvider, key);
    }

    // Route to the correct provider
    if (detectedProvider === 'gemini') {
      return this._chatGemini(messages, model, temperature, maxTokens, tools);
    }

    // OpenAI / Groq (OpenAI-compatible)
    return this._chatOpenAICompatible(detectedProvider, messages, model, temperature, maxTokens, tools);
  }

  /**
   * Chat with OpenAI-compatible APIs (OpenAI, Groq)
   */
  async _chatOpenAICompatible(detectedProvider, messages, model, temperature, maxTokens, tools) {
    const client = this.providers[detectedProvider];

    const params = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = 'auto';
    }

    try {
      const startTime = Date.now();
      const completion = await client.chat.completions.create(params);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: completion.choices[0].message,
        content: completion.choices[0].message.content,
        toolCalls: completion.choices[0].message.tool_calls || null,
        usage: completion.usage,
        provider: detectedProvider,
        model,
        responseTime
      };
    } catch (error) {
      logger.error(`Error with ${detectedProvider}:`, error.message);
      throw error;
    }
  }

  /**
   * Chat with Google Gemini
   */
  async _chatGemini(messages, model, temperature, maxTokens, tools) {
    const genAI = this.providers.gemini;
    
    const { systemInstruction, history, lastUserMessage } = this._convertToGeminiFormat(messages);

    const generationConfig = {
      temperature,
      maxOutputTokens: maxTokens,
    };

    try {
      const startTime = Date.now();
      
      const geminiModel = genAI.getGenerativeModel({ 
        model,
        systemInstruction: systemInstruction || undefined,
        generationConfig
      });

      let result;

      if (history.length > 0) {
        const chat = geminiModel.startChat({ history });
        result = await chat.sendMessage(lastUserMessage || 'Hola');
      } else {
        result = await geminiModel.generateContent(lastUserMessage || messages[messages.length - 1]?.content || 'Hola');
      }

      const responseTime = Date.now() - startTime;
      const responseText = result.response.text();

      // Token usage
      const usage = {
        prompt_tokens: Math.ceil((lastUserMessage || '').length / 4),
        completion_tokens: Math.ceil(responseText.length / 4),
        total_tokens: Math.ceil(((lastUserMessage || '').length + responseText.length) / 4)
      };

      if (result.response.usageMetadata) {
        usage.prompt_tokens = result.response.usageMetadata.promptTokenCount || usage.prompt_tokens;
        usage.completion_tokens = result.response.usageMetadata.candidatesTokenCount || usage.completion_tokens;
        usage.total_tokens = result.response.usageMetadata.totalTokenCount || usage.total_tokens;
      }

      return {
        success: true,
        message: { role: 'assistant', content: responseText },
        content: responseText,
        toolCalls: null,
        usage,
        provider: 'gemini',
        model,
        responseTime
      };
    } catch (error) {
      logger.error('Error with Gemini:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings (Gemini free via REST API, OpenAI fallback)
   */
  async generateEmbedding(text, apiKey = null) {
    // Try Gemini embeddings first (free) - using REST API v1 for embedding model support
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
          {
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: text.substring(0, 5000) }] }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );
        if (response.data && response.data.embedding && response.data.embedding.values) {
          return response.data.embedding.values;
        }
        throw new Error('No embedding values in Gemini response');
      } catch (error) {
        logger.warn('Gemini embeddings failed, trying OpenAI fallback:', error.message);
      }
    }

    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      if (!this.providers.openai) {
        await this.initProvider('openai', openaiKey);
      }
      const response = await this.providers.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });
      return response.data[0].embedding;
    }

    return null; // No embedding available
  }

  /**
   * Test connection to a provider
   */
  async testConnection(provider, apiKey) {
    try {
      await this.initProvider(provider, apiKey);
      
      if (provider === 'gemini') {
        const model = this.providers.gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Responde solo con: OK');
        return {
          success: true,
          message: 'Conexión exitosa con Google Gemini',
          models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro']
        };
      }
      
      const client = this.providers[provider];
      const models = await client.models.list();
      
      return {
        success: true,
        message: `Conexión exitosa con ${provider}`,
        models: models.data?.slice(0, 5).map(m => m.id) || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error de conexión'
      };
    }
  }

  /**
   * Get pricing info (approximate per 1M tokens)
   */
  getPricing(model) {
    const pricing = {
      // OpenAI
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      // Groq (FREE)
      'llama-3.3-70b-versatile': { input: 0, output: 0 },
      'llama-3.1-8b-instant': { input: 0, output: 0 },
      'mixtral-8x7b-32768': { input: 0, output: 0 },
      'gemma2-9b-it': { input: 0, output: 0 },
      // Gemini
      'gemini-2.0-flash': { input: 0.10, output: 0.40 },
      'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
      'gemini-1.5-flash': { input: 0.075, output: 0.30 },
      'gemini-1.5-pro': { input: 1.25, output: 5.00 }
    };

    if (model) return pricing[model] || { input: 0, output: 0 };
    return pricing;
  }
}

module.exports = new LLMService();
