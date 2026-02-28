// Configuración para PM2 (Process Manager para Node.js en producción)
// Dominio: app.micopiloto.es
module.exports = {
  apps: [{
    name: 'miabot-chatbot',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 5000,
    kill_timeout: 10000,
    listen_timeout: 10000,
    ignore_watch: [
      'node_modules',
      'uploads',
      'logs',
      'training-data',
      '.git',
      '*.sqlite',
      '*.sqlite-journal',
      '*.sqlite-shm',
      '*.sqlite-wal'
    ]
  }]
};
