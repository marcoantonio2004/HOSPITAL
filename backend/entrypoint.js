// ============================================================
// Vercel Serverless Entrypoint Launcher
// ============================================================
const path = require('path');

const candidates = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, 'backend/node_modules'),
  path.resolve(process.cwd(), 'node_modules'),
  path.resolve(process.cwd(), 'backend/node_modules'),
  '/var/task/node_modules',
  '/var/task/backend/node_modules',
];

for (const c of candidates) {
  if (!module.paths.includes(c)) {
    module.paths.push(c);
  }
}

// Cargar la aplicación compilada
const backendApp = require('./dist/index.js');
const app = backendApp.default || backendApp;

module.exports = app;
