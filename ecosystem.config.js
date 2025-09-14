module.exports = {
  apps: [{
    name: 'mall-pos-backend',
    script: './backend/server.js',
    cwd: '/home/deploy/mall-pos',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    
    // Auto restart on crash
    autorestart: true,
    
    // Merge logs from all instances
    merge_logs: true,
    
    // Log date format
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Environment variables
    env_file: './backend/.env'
  }]
};