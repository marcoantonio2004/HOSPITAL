if (!process.env.VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config();
  } catch (_) {}
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import pacienteRoutes from './routes/paciente';
import documentosRoutes from './routes/documentos.routes';
import configuracionRoutes from './routes/configuracion.routes';
import notificacionesRoutes from './routes/notificaciones.routes';
import { LogoConfigService } from './services/logoConfig';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Confiar en proxy inverso en producción (Render / Vercel) para IP real y cookies HTTPS
app.set('trust proxy', 1);

// ============================================================
// Middleware global
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (curl, healthchecks, mismo origen)
    if (!origin) return callback(null, true);
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
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Inicializar configuración de logos y membretes (compatible con serverless)
if (!process.env.VERCEL) {
  LogoConfigService.init();
}
app.use(async (req, _res, next) => {
  if (req.path !== '/api/health') {
    try {
      await LogoConfigService.ensureInitialized();
    } catch (e) {
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
  const icoPath = path.resolve(__dirname, 'assets/favicon.ico');
  res.sendFile(icoPath);
});
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/pacientes', documentosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// ============================================================
// Servir archivos estáticos del frontend (si existen en despliegue monolítico)
// ============================================================
const frontendBuild = path.join(__dirname, '../../frontend/dist');
const frontendIndex = path.join(frontendBuild, 'index.html');
if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendBuild));
}

// SPA fallback — cualquier ruta no API sirve index.html o estado de la API
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Ruta de API no encontrada' });
  }
  if (fs.existsSync(frontendIndex)) {
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
