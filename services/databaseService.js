const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'));
    this.initTables();
  }

  async tableExists(tableName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  safeAddColumn(tableName, columnName, columnDef) {
    this.db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return;
      const exists = rows && rows.some(row => row.name === columnName);
      if (!exists) {
        this.db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error(`Error adding column ${columnName} to ${tableName}:`, err);
          } else if (!err) {
            console.log(`✓ Columna ${columnName} agregada a ${tableName}`);
          }
        });
      }
    });
  }

  async initTables() {
    try {
      // Tabla de chatbots
      if (!(await this.tableExists('chatbots'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS chatbots (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            api_key TEXT,
            model TEXT DEFAULT 'gpt-3.5-turbo',
            system_prompt TEXT,
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 500,
            widget_color TEXT DEFAULT '#007bff',
            widget_position TEXT DEFAULT 'bottom-right',
            widget_title TEXT DEFAULT 'Chat Assistant',
            welcome_message TEXT DEFAULT '¡Hola! ¿En qué puedo ayudarte?',
            appearance_settings TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // Columnas adicionales para chatbots
      this.safeAddColumn('chatbots', 'appearance_settings', 'TEXT');
      this.safeAddColumn('chatbots', 'plan', "TEXT DEFAULT 'starter'");
      this.safeAddColumn('chatbots', 'tokens_used', "INTEGER DEFAULT 0");
      this.safeAddColumn('chatbots', 'tokens_limit', "INTEGER DEFAULT 100000");
      this.safeAddColumn('chatbots', 'messages_used', "INTEGER DEFAULT 0");
      this.safeAddColumn('chatbots', 'reset_date', "TEXT");

      // Tabla de conversaciones
      if (!(await this.tableExists('conversations'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatbot_id TEXT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // Tabla de configuración
      if (!(await this.tableExists('config'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // Tabla de datos de entrenamiento
      if (!(await this.tableExists('training_data'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS training_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatbot_id TEXT,
            training_id TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            embedding TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
      this.safeAddColumn('training_data', 'embedding', 'TEXT');

      // Tabla de trabajos de entrenamiento
      if (!(await this.tableExists('training_jobs'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS training_jobs (
            id TEXT PRIMARY KEY,
            chatbot_id TEXT,
            status TEXT NOT NULL,
            training_id TEXT NOT NULL,
            model_type TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            error_message TEXT
          )
        `);
      }

      // Tabla de leads
      if (!(await this.tableExists('leads'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatbot_id TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // Tabla de funciones
      if (!(await this.tableExists('functions'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS functions (
            id TEXT PRIMARY KEY,
            chatbot_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            method TEXT DEFAULT 'POST',
            headers TEXT,
            parameters TEXT,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chatbot_id) REFERENCES chatbots(id)
          )
        `);
      }

      // Tabla de Quick Prompts
      if (!(await this.tableExists('quick_prompts'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS quick_prompts (
            id TEXT PRIMARY KEY,
            chatbot_id TEXT NOT NULL,
            button_title TEXT NOT NULL,
            link TEXT,
            prompt TEXT,
            order_index INTEGER DEFAULT 0,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chatbot_id) REFERENCES chatbots(id)
          )
        `);
      }

      // Tabla de usuarios
      if (!(await this.tableExists('users'))) {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            company TEXT,
            plan TEXT DEFAULT 'starter',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✓ Tabla users creada');
      }
      this.safeAddColumn('users', 'stripe_customer_id', 'TEXT');
      this.safeAddColumn('users', 'stripe_subscription_id', 'TEXT');

      // Añadir user_id a chatbots
      this.safeAddColumn('chatbots', 'user_id', 'TEXT');

    } catch (error) {
      console.error('Error initializing tables:', error);
    }
  }

  async saveMessage(sessionId, role, content, chatbotId = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO conversations (chatbot_id, session_id, role, content) VALUES (?, ?, ?, ?)',
        [chatbotId, sessionId, role, content],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getConversationHistory(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT role, content, timestamp FROM conversations WHERE session_id = ? ORDER BY timestamp ASC',
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async deleteConversation(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM conversations WHERE session_id = ?',
        [sessionId],
        function (err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  async saveConfig(config) {
    return new Promise((resolve, reject) => {
      const promises = Object.entries(config).map(([key, value]) => {
        return new Promise((res, rej) => {
          this.db.run(
            'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
            [key, JSON.stringify(value)],
            function (err) {
              if (err) rej(err);
              else res();
            }
          );
        });
      });

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  async getConfig() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT key, value FROM config', (err, rows) => {
        if (err) reject(err);
        else {
          const config = {};
          rows.forEach(row => {
            try {
              config[row.key] = JSON.parse(row.value);
            } catch {
              config[row.key] = row.value;
            }
          });
          resolve(config);
        }
      });
    });
  }

  async storeTrainingData(trainingId, chunks, chatbotId = null) {
    return new Promise((resolve, reject) => {
      const promises = chunks.map(chunk => {
        return new Promise((res, rej) => {
          this.db.run(
            'INSERT INTO training_data (chatbot_id, training_id, content, metadata, embedding) VALUES (?, ?, ?, ?, ?)',
            [
              chatbotId,
              trainingId,
              chunk.content,
              JSON.stringify(chunk.metadata),
              chunk.embedding ? JSON.stringify(chunk.embedding) : null
            ],
            function (err) {
              if (err) rej(err);
              else res(this.lastID);
            }
          );
        });
      });

      Promise.all(promises).then(resolve).catch(reject);
    });
  }

  async getTrainingData(trainingId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT content, metadata, embedding FROM training_data WHERE training_id = ?',
        [trainingId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const data = rows.map(row => ({
              content: row.content,
              metadata: JSON.parse(row.metadata),
              embedding: row.embedding ? JSON.parse(row.embedding) : null
            }));
            resolve(data);
          }
        }
      );
    });
  }

  async createTrainingJob(jobId, trainingId, modelType, chatbotId = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO training_jobs (id, chatbot_id, training_id, status, model_type) VALUES (?, ?, ?, ?, ?)',
        [jobId, chatbotId, trainingId, 'pending', modelType],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateTrainingJob(jobId, status, errorMessage = null) {
    return new Promise((resolve, reject) => {
      const query = errorMessage
        ? 'UPDATE training_jobs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE training_jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?';

      const params = errorMessage ? [status, errorMessage, jobId] : [status, jobId];

      this.db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getTrainingStatus(jobId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM training_jobs WHERE id = ?',
        [jobId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getAvailableTrainingData(chatbotId = null) {
    return new Promise((resolve, reject) => {
      const query = chatbotId
        ? 'SELECT training_id, COUNT(*) as chunks, MIN(created_at) as created_at FROM training_data WHERE chatbot_id = ? GROUP BY training_id'
        : 'SELECT training_id, COUNT(*) as chunks, MIN(created_at) as created_at FROM training_data GROUP BY training_id';

      const params = chatbotId ? [chatbotId] : [];
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Dashboard Statistics Methods
  async getStats(type, chatbotId = null) {
    return new Promise((resolve, reject) => {
      let query = '';

      switch (type) {
        case 'messages':
          query = chatbotId
            ? 'SELECT COUNT(*) as count FROM conversations WHERE chatbot_id = ?'
            : 'SELECT COUNT(*) as count FROM conversations';
          break;
        case 'conversations':
          query = chatbotId
            ? 'SELECT COUNT(DISTINCT session_id) as count FROM conversations WHERE chatbot_id = ?'
            : 'SELECT COUNT(DISTINCT session_id) as count FROM conversations';
          break;
        case 'training':
          query = chatbotId
            ? 'SELECT COUNT(*) as count FROM training_data WHERE chatbot_id = ?'
            : 'SELECT COUNT(*) as count FROM training_data';
          break;
        case 'leads':
          query = chatbotId
            ? 'SELECT COUNT(*) as count FROM leads WHERE chatbot_id = ?'
            : 'SELECT COUNT(*) as count FROM leads';
          break;
        default:
          resolve(0);
          return;
      }

      const params = chatbotId ? [chatbotId] : [];
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }

  async getChatHistory(period, chatbotId = null) {
    return new Promise((resolve, reject) => {
      let days = 7;

      switch (period) {
        case '1w': days = 7; break;
        case '1m': days = 30; break;
        case '3m': days = 90; break;
        case '6m': days = 180; break;
      }

      const query = chatbotId
        ? `SELECT DATE(timestamp) as date, COUNT(*) as count 
           FROM conversations 
           WHERE chatbot_id = ? AND timestamp >= datetime('now', '-${days} days')
           GROUP BY DATE(timestamp)
           ORDER BY date ASC`
        : `SELECT DATE(timestamp) as date, COUNT(*) as count 
           FROM conversations 
           WHERE timestamp >= datetime('now', '-${days} days')
           GROUP BY DATE(timestamp)
           ORDER BY date ASC`;

      const params = chatbotId ? [chatbotId] : [];
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getRecentConversations(limit = 5, chatbotId = null) {
    return new Promise((resolve, reject) => {
      const query = chatbotId
        ? `SELECT session_id, 
                  MAX(timestamp) as last_message_time,
                  COUNT(*) as message_count,
                  (SELECT content FROM conversations c2 
                   WHERE c2.session_id = c1.session_id AND c2.chatbot_id = c1.chatbot_id
                   ORDER BY timestamp DESC LIMIT 1) as last_message
           FROM conversations c1
           WHERE chatbot_id = ?
           GROUP BY session_id
           ORDER BY last_message_time DESC
           LIMIT ?`
        : `SELECT session_id, 
                  MAX(timestamp) as last_message_time,
                  COUNT(*) as message_count,
                  (SELECT content FROM conversations c2 
                   WHERE c2.session_id = c1.session_id 
                   ORDER BY timestamp DESC LIMIT 1) as last_message
           FROM conversations c1
           GROUP BY session_id
           ORDER BY last_message_time DESC
           LIMIT ?`;

      const params = chatbotId ? [chatbotId, limit] : [limit];
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getTokenUsage(period, chatbotId = null) {
    return new Promise((resolve, reject) => {
      // For now, return mock data
      // In production, you would track tokens in a separate table
      const mockData = {
        inputTokens: Math.floor(Math.random() * 10000) + 5000,
        outputTokens: Math.floor(Math.random() * 8000) + 4000
      };
      resolve(mockData);
    });
  }

  async updateTokenUsage(chatbotId, tokens) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE chatbots SET tokens_used = tokens_used + ? WHERE id = ?',
        [tokens, chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async incrementMessageCount(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE chatbots SET messages_used = messages_used + 1 WHERE id = ?',
        [chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async getAllConversations(page = 1, limit = 20, search = '', chatbotId = null) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;

      let query = `
        SELECT session_id, 
               MAX(timestamp) as last_message_time,
               COUNT(*) as message_count,
               (SELECT content FROM conversations c2 
                WHERE c2.session_id = c1.session_id 
                ORDER BY timestamp DESC LIMIT 1) as last_message
        FROM conversations c1
      `;

      const conditions = [];
      const params = [];

      if (chatbotId) {
        conditions.push('chatbot_id = ?');
        params.push(chatbotId);
      }

      if (search) {
        conditions.push("content LIKE ?");
        params.push(`%${search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` GROUP BY session_id ORDER BY last_message_time DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Get total count
          let countQuery = 'SELECT COUNT(DISTINCT session_id) as total FROM conversations';
          const countParams = [];

          if (chatbotId) {
            countQuery += ' WHERE chatbot_id = ?';
            countParams.push(chatbotId);
          }

          this.db.get(countQuery, countParams, (err2, countRow) => {
            if (err2) reject(err2);
            else resolve({
              data: rows,
              total: countRow ? countRow.total : 0
            });
          });
        }
      });
    });
  }

  async saveLead(leadData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO leads (chatbot_id, name, email, phone, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          leadData.chatbot_id,
          leadData.name,
          leadData.email,
          leadData.phone,
          leadData.created_at || new Date().toISOString()
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getLead(leadId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM leads WHERE id = ?',
        [leadId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getLeads(chatbotId = null) {
    return new Promise((resolve, reject) => {
      const query = chatbotId
        ? 'SELECT * FROM leads WHERE chatbot_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM leads ORDER BY created_at DESC';

      const params = chatbotId ? [chatbotId] : [];
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async deleteLead(leadId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM leads WHERE id = ?',
        [leadId],
        function (err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  // Chatbot Management Methods
  async createChatbot(chatbotData) {
    return new Promise((resolve, reject) => {
      const id = 'chatbot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      this.db.run(
        `INSERT INTO chatbots (id, name, description, api_key, model, system_prompt, 
         temperature, max_tokens, widget_color, widget_position, widget_title, welcome_message,
         plan, tokens_limit, reset_date, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          chatbotData.name,
          chatbotData.description || '',
          chatbotData.api_key || '',
          chatbotData.model || 'gemini-2.0-flash',
          chatbotData.system_prompt || 'Eres un asistente útil y amigable.',
          chatbotData.temperature || 0.7,
          chatbotData.max_tokens || 1000,
          chatbotData.widget_color || '#007bff',
          chatbotData.widget_position || 'bottom-right',
          chatbotData.widget_title || 'Chat Assistant',
          chatbotData.welcome_message || '¡Hola! ¿En qué puedo ayudarte?',
          chatbotData.plan || 'starter',
          chatbotData.plan === 'custom' ? 999999999 : (chatbotData.plan === 'pro' ? 500000 : 100000),
          nextResetDate.toISOString(),
          chatbotData.user_id || null
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id, ...chatbotData });
        }
      );
    });
  }

  async getAllChatbots() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM chatbots WHERE is_active = 1 ORDER BY created_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getChatbot(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM chatbots WHERE id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async updateChatbot(chatbotId, chatbotData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      Object.entries(chatbotData).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
      });

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(chatbotId);

      this.db.run(
        `UPDATE chatbots SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ chatbotId, ...chatbotData });
        }
      );
    });
  }

  async deleteChatbot(chatbotId) {
    return new Promise((resolve, reject) => {
      // Soft delete - just mark as inactive
      this.db.run(
        'UPDATE chatbots SET is_active = 0 WHERE id = ?',
        [chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  async getAppearanceSettings(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT appearance_settings FROM chatbots WHERE id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else {
            try {
              const settings = row && row.appearance_settings
                ? JSON.parse(row.appearance_settings)
                : null;
              resolve(settings);
            } catch (parseErr) {
              resolve(null);
            }
          }
        }
      );
    });
  }

  async saveAppearanceSettings(chatbotId, settings) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE chatbots SET appearance_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(settings), chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve({ updated: this.changes });
        }
      );
    });
  }

  // Functions CRUD
  async createFunction(functionData) {
    return new Promise((resolve, reject) => {
      const functionId = `func_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      this.db.run(
        `INSERT INTO functions (id, chatbot_id, name, description, endpoint, method, headers, parameters, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          functionId,
          functionData.chatbotId,
          functionData.name,
          functionData.description,
          functionData.endpoint,
          functionData.method || 'POST',
          functionData.headers || null,
          JSON.stringify(functionData.parameters || []),
          functionData.enabled ? 1 : 0
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: functionId, ...functionData });
        }
      );
    });
  }

  async getFunctions(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM functions WHERE chatbot_id = ? ORDER BY created_at DESC',
        [chatbotId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const functions = rows.map(row => ({
              ...row,
              parameters: row.parameters ? JSON.parse(row.parameters) : [],
              enabled: row.enabled === 1
            }));
            resolve(functions);
          }
        }
      );
    });
  }

  async getFunction(functionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM functions WHERE id = ?',
        [functionId],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              row.parameters = row.parameters ? JSON.parse(row.parameters) : [];
              row.enabled = row.enabled === 1;
            }
            resolve(row);
          }
        }
      );
    });
  }

  async updateFunction(functionId, functionData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (functionData.name !== undefined) {
        fields.push('name = ?');
        values.push(functionData.name);
      }
      if (functionData.description !== undefined) {
        fields.push('description = ?');
        values.push(functionData.description);
      }
      if (functionData.endpoint !== undefined) {
        fields.push('endpoint = ?');
        values.push(functionData.endpoint);
      }
      if (functionData.method !== undefined) {
        fields.push('method = ?');
        values.push(functionData.method);
      }
      if (functionData.headers !== undefined) {
        fields.push('headers = ?');
        values.push(functionData.headers);
      }
      if (functionData.parameters !== undefined) {
        fields.push('parameters = ?');
        values.push(JSON.stringify(functionData.parameters));
      }
      if (functionData.enabled !== undefined) {
        fields.push('enabled = ?');
        values.push(functionData.enabled ? 1 : 0);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(functionId);

      this.db.run(
        `UPDATE functions SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ functionId, ...functionData });
        }
      );
    });
  }

  async deleteFunction(functionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM functions WHERE id = ?',
        [functionId],
        function (err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }

  // Usage Stats Methods
  async getUsageStats(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT plan, tokens_used, tokens_limit, messages_used, reset_date FROM chatbots WHERE id = ?',
        [chatbotId],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              // Planes: starter (9,95€/mes, 100K tokens), pro (25€/mes, 500K tokens), custom (150€/año, API propia)
              const tokenLimits = { 'starter': 100000, 'pro': 500000, 'custom': 999999999 };
              const messageLimits = { 'starter': 1000, 'pro': 5000, 'custom': 999999999 };
              row.tokens_limit = tokenLimits[row.plan] || 100000;
              row.messages_limit = messageLimits[row.plan] || 1000;
            }
            resolve(row);
          }
        }
      );
    });
  }

  async resetMonthlyUsage(chatbotId) {
    return new Promise((resolve, reject) => {
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      this.db.run(
        'UPDATE chatbots SET messages_used = 0, tokens_used = 0, reset_date = ? WHERE id = ?',
        [nextResetDate.toISOString(), chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve({ updated: this.changes });
        }
      );
    });
  }

  async updatePlan(chatbotId, plan) {
    const tokenLimits = { 'starter': 100000, 'pro': 500000, 'custom': 999999999 };
    const tokensLimit = tokenLimits[plan] || 100000;
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE chatbots SET plan = ?, tokens_limit = ? WHERE id = ?',
        [plan, tokensLimit, chatbotId],
        function (err) {
          if (err) reject(err);
          else resolve({ updated: this.changes });
        }
      );
    });
  }

  // Quick Prompts Methods
  async getQuickPrompts(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM quick_prompts WHERE chatbot_id = ? ORDER BY order_index ASC',
        [chatbotId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getQuickPrompt(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM quick_prompts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async createQuickPrompt(data) {
    return new Promise((resolve, reject) => {
      const id = 'qp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.db.run(
        `INSERT INTO quick_prompts (id, chatbot_id, button_title, link, prompt, order_index, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.chatbotId, data.buttonTitle, data.link || null, data.prompt || null, data.orderIndex || 0, data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1],
        function (err) {
          if (err) reject(err);
          else resolve({ id, ...data });
        }
      );
    });
  }

  async updateQuickPrompt(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      if (data.buttonTitle !== undefined) { fields.push('button_title = ?'); values.push(data.buttonTitle); }
      if (data.link !== undefined) { fields.push('link = ?'); values.push(data.link); }
      if (data.prompt !== undefined) { fields.push('prompt = ?'); values.push(data.prompt); }
      if (data.orderIndex !== undefined) { fields.push('order_index = ?'); values.push(data.orderIndex); }
      if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      this.db.run(
        `UPDATE quick_prompts SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ id, ...data });
        }
      );
    });
  }

  async deleteQuickPrompt(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM quick_prompts WHERE id = ?',
        [id],
        function (err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes });
        }
      );
    });
  }
  async addTrainingData(chatbotId, content, type, source) {
    return new Promise((resolve, reject) => {
      const trainingId = 'train_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const metadata = JSON.stringify({ type, source });

      this.db.run(
        `INSERT INTO training_data (chatbot_id, training_id, content, metadata) VALUES (?, ?, ?, ?)`,
        [chatbotId, trainingId, content, metadata],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getTrainingDataByChatbot(chatbotId) {
    return new Promise((resolve, reject) => {
      // Group chunks by training_id to show one entry per training session
      this.db.all(
        `SELECT training_id, 
                MIN(id) as id,
                COUNT(*) as chunks,
                GROUP_CONCAT(SUBSTR(content, 1, 200), ' | ') as preview,
                MIN(metadata) as metadata, 
                MIN(created_at) as created_at,
                SUM(LENGTH(content)) as total_chars,
                SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
         FROM training_data 
         WHERE chatbot_id = ? 
         GROUP BY training_id
         ORDER BY created_at DESC`,
        [chatbotId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const data = rows.map(row => {
              let meta = {};
              try {
                meta = JSON.parse(row.metadata || '{}');
              } catch (e) {}
              return {
                id: row.id,
                trainingId: row.training_id,
                content: (row.preview || '').substring(0, 300),
                type: meta.type || 'unknown',
                source: meta.source || 'Unknown',
                title: meta.source || meta.type || 'Contenido',
                chunks: row.chunks,
                totalChars: row.total_chars,
                withEmbeddings: row.with_embeddings,
                created_at: row.created_at
              };
            });
            resolve(data);
          }
        }
      );
    });
  }

  async deleteTrainingData(id) {
    return new Promise((resolve, reject) => {
      // First check if this id has a training_id, and delete all chunks with same training_id
      this.db.get('SELECT training_id FROM training_data WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve({ deleted: 0 });
        
        this.db.run(
          'DELETE FROM training_data WHERE training_id = ?',
          [row.training_id],
          function (err) {
            if (err) reject(err);
            else resolve({ deleted: this.changes });
          }
        );
      });
    });
  }

  async getTrainingStats(chatbotId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN json_extract(metadata, '$.type') = 'file' THEN 1 ELSE 0 END) as files,
           SUM(CASE WHEN json_extract(metadata, '$.type') = 'url' THEN 1 ELSE 0 END) as urls,
           SUM(CASE WHEN json_extract(metadata, '$.type') = 'text' THEN 1 ELSE 0 END) as texts,
           SUM(LENGTH(content)) as totalChars
         FROM training_data 
         WHERE chatbot_id = ?`,
        [chatbotId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const stats = rows[0] || { total: 0, files: 0, urls: 0, texts: 0, totalChars: 0 };
            resolve(stats);
          }
        }
      );
    });
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async createUser(id, email, hashedPassword, name, company) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, email, password, name, company) VALUES (?, ?, ?, ?, ?)`,
        [id, email, hashedPassword, name, company],
        function (err) {
          if (err) reject(err);
          else resolve({ id, email, name, company });
        }
      );
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, email, name, company, plan, stripe_customer_id, stripe_subscription_id, is_active, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  async updateUser(id, fields) {
    const allowed = ['name', 'company', 'plan', 'stripe_customer_id', 'stripe_subscription_id', 'is_active'];
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (updates.length === 0) return;
    values.push(id);
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  async getChatbotsByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM chatbots WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = DatabaseService;
