module.exports = {
    apps: [{
      name: 'verify',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/verify',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }]
  }
  