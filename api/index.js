const backendModule = require('../backend/dist/index.js');
const app = backendModule.default || backendModule;

module.exports = app;
