module.exports = {
  apps: [
    {
      name: 'w2ai',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3080',
      cwd: 'D:/w2ai',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
