// Configuración para PM2 (Process Manager para Node.js en producción)
module.exports = {
  apps: [{
    name: 'miabot-chatbot',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/access.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    ignore_watch: [
      'node_modules',
      'uploads',
      'logs',
      '.git'
    ]
  }]
};
