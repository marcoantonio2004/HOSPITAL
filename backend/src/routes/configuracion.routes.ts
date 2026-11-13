// ============================================================
// RUTAS DE CONFIGURACIÓN DEL SISTEMA Y GESTIÓN DE LOGOS/MEMBRETE
// Hospital General San Felipe del Progreso — Expediente Clínico Digital
// ============================================================

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { AuthRequest } from '../types';
import { LogoConfigService } from '../services/logoConfig';

const router = Router();

// ============================================================
// 1. Obtener configuración actual de logos y membrete
// ============================================================
router.get('/logo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const config = LogoConfigService.getConfig();
    res.json({ success: true, data: config });
  } catch (err: any) {
    console.error('Error al obtener configuración de logos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener configuración de logos' });
  }
});

// ============================================================
// 2. Actualizar configuración y cargar nuevos logotipos
// ============================================================
router.post('/logo', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;
    const updated = await LogoConfigService.updateConfig(req.body, userId);

    await logAudit(
      req,
      'MODIFICAR',
      'configuracion_sistema',
      null,
      null,
      {
        accion: 'actualizar_membrete_logos',
        tipo_encabezado: req.body.tipo_encabezado,
        usar_predeterminado: req.body.usar_predeterminado,
        tiene_banner: Boolean(req.body.banner_base64),
        tiene_logo_izq: Boolean(req.body.logo_izquierdo_base64),
        tiene_logo_der: Boolean(req.body.logo_derecho_base64),
      }
    );

    res.json({
      success: true,
      message: 'Configuración y membrete actualizados exitosamente',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error al actualizar configuración de logos:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al guardar logotipos' });
  }
});

// ============================================================
// 3. Restablecer membrete oficial predeterminado (ISEM)
// ============================================================
router.post('/logo/reset', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;
    const config = await LogoConfigService.resetDefault(userId);

    await logAudit(
      req,
      'MODIFICAR',
      'configuracion_sistema',
      null,
      null,
      { accion: 'restablecer_membrete_oficial_isem' }
    );

    res.json({
      success: true,
      message: 'Se ha restaurado el membrete oficial predeterminado de ISEM',
      data: config,
    });
  } catch (err: any) {
    console.error('Error al restablecer membrete:', err);
    res.status(500).json({ success: false, error: 'Error al restablecer membrete oficial' });
  }
});

// ============================================================
// 4. Servir archivos de imagen de logotipo directamente
// ============================================================
router.get('/logo/archivo/:tipo', (req: AuthRequest, res: Response) => {
  const tipo = req.params.tipo as 'banner' | 'izquierdo' | 'derecho' | 'central' | 'central2' | 'default-banner';
  const buffer = LogoConfigService.getActiveBuffer(tipo);

  if (!buffer) {
    return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(buffer);
});

// ============================================================
// 5. Generar PDF de prueba oficial con el encabezado activo
// Permite al usuario verificar el membrete en una hoja real antes de imprimir
// ============================================================
router.get('/logo/preview-pdf', (req: AuthRequest, res: Response) => {
  try {
    LogoConfigService.generarPdfPrueba(res);
  } catch (err: any) {
    console.error('Error al generar PDF de prueba:', err);
    res.status(500).json({ success: false, error: 'Error al generar documento PDF de prueba' });
  }
});

export default router;
