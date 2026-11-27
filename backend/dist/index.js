"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
if (!process.env.VERCEL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('dotenv').config();
    }
    catch (_) { }
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./routes/auth"));
const paciente_1 = __importDefault(require("./routes/paciente"));
const documentos_routes_1 = __importDefault(require("./routes/documentos.routes"));
const configuracion_routes_1 = __importDefault(require("./routes/configuracion.routes"));
const notificaciones_routes_1 = __importDefault(require("./routes/notificaciones.routes"));
const logoConfig_1 = require("./services/logoConfig");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000');
// Confiar en proxy inverso en producción (Render / Vercel) para IP real y cookies HTTPS
app.set('trust proxy', 1);
// ============================================================
// Middleware global
// ============================================================
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (curl, healthchecks, mismo origen)
        if (!origin)
            return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes(cleanOrigin)) {
            return callback(null, true);
        }
        // En Vercel, permitir el dominio asignado por Vercel (*.vercel.app)
        if (process.env.VERCEL && cleanOrigin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Inicializar configuración de logos y membretes (compatible con serverless)
if (!process.env.VERCEL) {
    logoConfig_1.LogoConfigService.init();
}
app.use(async (req, _res, next) => {
    if (req.path !== '/api/health') {
        try {
            await logoConfig_1.LogoConfigService.ensureInitialized();
        }
        catch (e) {
            console.warn('LogoConfigService warning:', e);
        }
    }
    next();
});
// ============================================================
// API Routes
// ============================================================
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/favicon.ico', (req, res) => {
    const icoPath = path_1.default.resolve(__dirname, 'assets/favicon.ico');
    res.sendFile(icoPath);
});
app.use('/api/auth', auth_1.default);
app.use('/api/pacientes', paciente_1.default);
app.use('/api/pacientes', documentos_routes_1.default);
app.use('/api/configuracion', configuracion_routes_1.default);
app.use('/api/notificaciones', notificaciones_routes_1.default);
// ============================================================
// Servir archivos estáticos del frontend (si existen en despliegue monolítico)
// ============================================================
const frontendBuild = path_1.default.join(__dirname, '../../frontend/dist');
const frontendIndex = path_1.default.join(frontendBuild, 'index.html');
if (fs_1.default.existsSync(frontendIndex)) {
    app.use(express_1.default.static(frontendBuild));
}
// SPA fallback — cualquier ruta no API sirve index.html o estado de la API
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Ruta de API no encontrada' });
    }
    if (fs_1.default.existsSync(frontendIndex)) {
        return res.sendFile(frontendIndex);
    }
    return res.json({
        success: true,
        service: 'Expediente Clínico Digital API — Hospital General San Felipe del Progreso',
        status: 'online',
    });
});
// ============================================================
// Error handler global
// ============================================================
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
});
// ============================================================
// Start (solo en servidor local/dedicado; en Vercel se exporta como función serverless)
// ============================================================
if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🏥 Expediente Clínico Digital — Backend corriendo en puerto ${PORT}`);
        console.log(`   LAN: http://0.0.0.0:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map