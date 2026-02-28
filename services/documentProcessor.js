const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const axios = require('axios');
const logger = require('./logger');

class DocumentProcessor {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.processPDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processDOCX.bind(this),
      'application/msword': this.processDOCX.bind(this),
      'text/plain': this.processTXT.bind(this),
      'text/markdown': this.processTXT.bind(this),
      'text/html': this.processHTML.bind(this)
    };
  }

  async processFile(filePath, mimeType) {
    try {
      // Verificar tamaño del archivo (límite 10MB)
      const stats = await fs.stat(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 10) {
        throw new Error(`El archivo es demasiado grande (${fileSizeInMB.toFixed(2)}MB). Límite: 10MB`);
      }

      const processor = this.supportedTypes[mimeType];
      if (!processor) {
        throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
      }

      const content = await processor(filePath);
      return this.chunkContent(content);
    } catch (error) {
      logger.error('Error procesando archivo:', error);
      throw error;
    }
  }

  async processPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  async processDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  async processTXT(filePath) {
    return await fs.readFile(filePath, 'utf8');
  }

  async processHTML(filePath) {
    const html = await fs.readFile(filePath, 'utf8');
    return this.extractTextFromHTML(html);
  }

  async processWebPage(url, depth = 1) {
    try {
      // SSRF protection: block private/internal URLs
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const blockedPatterns = [
        /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, 
        /^192\.168\./, /^0\.0\.0\.0$/, /^::1$/, /^\[::1\]$/,
        /\.local$/, /\.internal$/
      ];
      if (blockedPatterns.some(p => p.test(hostname)) || !urlObj.protocol.startsWith('http')) {
        throw new Error('URL no permitida: no se pueden acceder direcciones internas');
      }

      const response = await axios.get(url, { timeout: 15000, maxRedirects: 3 });
      const text = this.extractTextFromHTML(response.data);
      
      return this.chunkContent(text);
    } catch (error) {
      logger.error('Error procesando página web:', error.message);
      throw error;
    }
  }

  async processText(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('El texto proporcionado no es válido');
      }
      
      return this.chunkContent(text);
    } catch (error) {
      logger.error('Error procesando texto:', error);
      throw error;
    }
  }

  extractTextFromHTML(html) {
    const $ = cheerio.load(html);
    
    // Eliminar scripts y estilos
    $('script, style, nav, footer, aside').remove();
    
    // Obtener texto principal
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  }

  chunkContent(content, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    
    // Limitar contenido a 100,000 caracteres para evitar memory overflow
    const maxContentLength = 100000;
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength);
      logger.warn(`Contenido truncado a ${maxContentLength} caracteres para evitar problemas de memoria`);
    }
    
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    // If text is small enough, return as single chunk
    if (words.length <= chunkSize) {
      chunks.push({
        content: words.join(' '),
        metadata: {
          chunkIndex: 0,
          startWord: 0,
          endWord: words.length,
          totalWords: words.length
        }
      });
      return chunks;
    }
    
    // Limitar número de chunks para evitar consumir toda la memoria
    const maxChunks = 50;
    
    let start = 0;
    while (start < words.length && chunks.length < maxChunks) {
      const end = Math.min(start + chunkSize, words.length);
      const chunk = words.slice(start, end).join(' ');
      
      chunks.push({
        content: chunk,
        metadata: {
          chunkIndex: chunks.length,
          startWord: start,
          endWord: end,
          totalWords: words.length
        }
      });
      
      // If we've reached the end, stop
      if (end >= words.length) break;
      
      start = end - overlap;
      // Safety: ensure we always move forward
      if (start <= chunks[chunks.length - 1].metadata.startWord) {
        start = end;
      }
    }
    
    return chunks;
  }

  async processMultipleFiles(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const chunks = await this.processFile(file.path, file.mimetype);
        results.push({
          filename: file.originalname,
          chunks: chunks.length,
          data: chunks
        });
      } catch (error) {
        logger.error(`Error procesando ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = DocumentProcessor;
