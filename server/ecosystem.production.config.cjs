const path = require('node:path');
const release = process.env.MUVS_RELEASE_DIR || path.resolve(__dirname, '..');
module.exports = {
  apps: [{
    name: 'muvs-api', script: path.join(release, 'server', 'index.js'), cwd: path.join(release, 'server'),
    exec_mode: 'fork', instances: 1, min_uptime: '10s', max_restarts: 5, restart_delay: 1500, kill_timeout: 10000,
    env: { NODE_ENV: 'production', DATA_DIR: process.env.DATA_DIR || '/var/www/muvs-data' },
  }],
};
