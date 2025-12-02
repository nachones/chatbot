/**
 * LLM Service - Unified interface for multiple LLM providers
 * Supports: OpenAI, Groq (free & fast)
 */

const OpenAI = require('openai');

class LLMService {
  constructor() {
    this.providers = {};
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'openai';
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
        // Groq uses OpenAI-compatible API
        this.providers.groq = new OpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1'
        });
        break;
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider) {
    const models = {
      openai: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido y económico' },
        { id: 'gpt-4', name: 'GPT-4', description: 'Más inteligente, más lento' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 optimizado' },
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Última generación' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Compacto y rápido' }
      ],
      groq: [
        { id: 'llama3-8b-8192', name: 'LLaMA 3 8B', description: 'Rápido, gratis, buena calidad' },
        { id: 'llama3-70b-8192', name: 'LLaMA 3 70B', description: 'Más potente, gratis' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Buen balance calidad/velocidad' },
        { id: 'gemma-7b-it', name: 'Gemma 7B', description: 'Modelo de Google' },
        { id: 'llama-3.1-70b-versatile', name: 'LLaMA 3.1 70B', description: 'Último modelo LLaMA' }
      ]
    };
    
    return models[provider] || [];
  }

  /**
   * Detect provider from model name
   */
  detectProvider(model) {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.includes('llama') || model.includes('mixtral') || model.includes('gemma')) return 'groq';
    return this.defaultProvider;
  }

  /**
   * Chat completion - unified interface
   */
  async chat(options) {
    const {
      messages,
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 500,
      apiKey = null,
      provider = null,
      tools = null
    } = options;

    // Determine provider
    const detectedProvider = provider || this.detectProvider(model);
    
    // Initialize provider if needed
    const key = apiKey || process.env[`${detectedProvider.toUpperCase()}_API_KEY`];
    if (!key) {
      throw new Error(`API key no configurada para ${detectedProvider}`);
    }

    if (!this.providers[detectedProvider]) {
      await this.initProvider(detectedProvider, key);
    }

    const client = this.providers[detectedProvider];

    // Build completion params
    const params = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

    // Add tools if provided (function calling)
    // Note: Groq also supports function calling now
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
      console.error(`Error with ${detectedProvider}:`, error);
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text, apiKey = null) {
    // For now, only OpenAI supports embeddings
    // Groq doesn't have embedding models yet
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key requerida para embeddings');
    }

    if (!this.providers.openai) {
      await this.initProvider('openai', key);
    }

    const response = await this.providers.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  }

  /**
   * Test connection to a provider
   */
  async testConnection(provider, apiKey) {
    try {
      await this.initProvider(provider, apiKey);
      
      // Make a simple request to verify
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
   * Get pricing info for a model (approximate)
   */
  getPricing(model) {
    const pricing = {
      // OpenAI pricing (per 1M tokens)
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4o': { input: 5.00, output: 15.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      
      // Groq pricing (FREE!)
      'llama3-8b-8192': { input: 0, output: 0 },
      'llama3-70b-8192': { input: 0, output: 0 },
      'mixtral-8x7b-32768': { input: 0, output: 0 },
      'gemma-7b-it': { input: 0, output: 0 },
      'llama-3.1-70b-versatile': { input: 0, output: 0 }
    };

    return pricing[model] || { input: 0, output: 0 };
  }
}

module.exports = new LLMService();
