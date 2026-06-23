module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      cwd: '/opt/nomad/services/telegram-bot',
      script: 'dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
