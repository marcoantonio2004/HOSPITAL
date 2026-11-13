import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth';
import pacienteRoutes from './routes/paciente';
import documentosRoutes from './routes/documentos.routes';
import configuracionRoutes from './routes/configuracion.routes';
import notificacionesRoutes from './routes/notificaciones.routes';
import { LogoConfigService } from './services/logoConfig';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// ============================================================
// Middleware global
// ============================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Inicializar configuración de logos y membretes
LogoConfigService.init();

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
// Servir archivos estáticos del frontend (producción)
// ============================================================
const frontendBuild = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuild));

// SPA fallback — cualquier ruta no API sirve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Ruta de API no encontrada' });
  }
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

// ============================================================
// Error handler global
// ============================================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

// ============================================================
// Start
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 Expediente Clínico Digital — Backend corriendo en puerto ${PORT}`);
  console.log(`   LAN: http://0.0.0.0:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
});
