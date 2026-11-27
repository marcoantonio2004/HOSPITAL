// Bridge entrypoint for Vercel Express service detection
const app = require('./dist/index.js');
module.exports = app.default || app;
