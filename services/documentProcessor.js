const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const axios = require('axios');

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
      const processor = this.supportedTypes[mimeType];
      if (!processor) {
        throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
      }

      const content = await processor(filePath);
      return this.chunkContent(content);
    } catch (error) {
      console.error('Error procesando archivo:', error);
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
      const response = await axios.get(url);
      const text = this.extractTextFromHTML(response.data);
      
      // Si depth > 1, podríamos hacer web scraping recursivo
      // Por ahora, solo procesamos la página principal
      
      return this.chunkContent(text);
    } catch (error) {
      console.error('Error procesando página web:', error);
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
      console.error('Error procesando texto:', error);
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
    const words = content.split(/\s+/);
    
    let start = 0;
    while (start < words.length) {
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
      
      start = end - overlap;
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
        console.error(`Error procesando ${file.originalname}:`, error);
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
