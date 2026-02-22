/**
 * Logger centralizado para MIABOT
 * Reemplaza console.log/error/warn directos con logging controlado por nivel
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info')];

function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${level.toUpperCase()}] ${timestamp}`;
  return [prefix, ...args];
}

const logger = {
  error(...args) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(...formatMessage('error', ...args));
    }
  },
  warn(...args) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(...formatMessage('warn', ...args));
    }
  },
  info(...args) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.info(...formatMessage('info', ...args));
    }
  },
  debug(...args) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(...formatMessage('debug', ...args));
    }
  }
};

module.exports = logger;
