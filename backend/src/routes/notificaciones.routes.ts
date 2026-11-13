import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(authenticate);

// GET /api/notificaciones — Obtener notificaciones del usuario (o de administración)
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id_usuario;
  const userRole = (req.user!.rol_nombre || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  try {
    let query = `
      SELECT n.id_notificacion, n.id_usuario, n.para_rol, n.tipo, n.titulo, n.mensaje, n.leida, n.created_at,
             n.id_solicitud,
             sp.username as solicitante_username,
             sp.nombre_solicitante,
             sp.estatus as solicitante_estatus,
             sp.id_medico as solicitante_id_medico
      FROM notificaciones n
      LEFT JOIN solicitudes_password sp ON n.id_solicitud = sp.id_solicitud
      WHERE 
    `;

    const params: any[] = [];
    if (isAdmin) {
      query += `(n.id_usuario = $1 OR n.para_rol = 'admin')`;
      params.push(userId);
    } else {
      query += `(n.id_usuario = $1)`;
      params.push(userId);
    }

    query += ` ORDER BY n.created_at DESC LIMIT 60`;

    const result = await pool.query(query, params);

    // Contar no leídas
    let countQuery = `
      SELECT COUNT(*)::int as no_leidas
      FROM notificaciones
      WHERE leida = FALSE AND 
    `;
    if (isAdmin) {
      countQuery += `(id_usuario = $1 OR para_rol = 'admin')`;
    } else {
      countQuery += `(id_usuario = $1)`;
    }
    const countRes = await pool.query(countQuery, [userId]);
    const noLeidas = countRes.rows[0]?.no_leidas || 0;

    res.json({
      success: true,
      data: result.rows,
      no_leidas: noLeidas,
    });
  } catch (err: any) {
    console.error('Error al obtener notificaciones:', err);
    res.status(500).json({ success: false, error: 'Error al obtener notificaciones' });
  }
});

// PUT /api/notificaciones/:id/leer — Marcar notificación individual como leída
router.put('/:id/leer', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id_usuario;
  const isAdmin = (req.user!.rol_nombre || '').toLowerCase() === 'admin';

  try {
    let query = `
      UPDATE notificaciones 
      SET leida = TRUE 
      WHERE id_notificacion = $1
    `;
    const params: any[] = [id];

    if (!isAdmin) {
      query += ` AND id_usuario = $2`;
      params.push(userId);
    }

    await pool.query(query, params);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error al marcar notificación como leída:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar notificación' });
  }
});

// PUT /api/notificaciones/marcar-todas-leidas — Marcar todas las notificaciones como leídas
router.put('/marcar-todas-leidas', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id_usuario;
  const isAdmin = (req.user!.rol_nombre || '').toLowerCase() === 'admin';

  try {
    let query = `UPDATE notificaciones SET leida = TRUE WHERE leida = FALSE AND `;
    if (isAdmin) {
      query += `(id_usuario = $1 OR para_rol = 'admin')`;
    } else {
      query += `(id_usuario = $1)`;
    }

    await pool.query(query, [userId]);
    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err: any) {
    console.error('Error al marcar todas como leídas:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar notificaciones' });
  }
});

// GET /api/notificaciones/solicitudes-pendientes — Listar solicitudes pendientes de restablecimiento (Admin)
router.get('/solicitudes-pendientes', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, pm.especialidad, pm.cedula_profesional
       FROM solicitudes_password sp
       LEFT JOIN personal_medico pm ON sp.id_medico = pm.id_medico
       WHERE sp.estatus = 'pendiente'
       ORDER BY sp.fecha_solicitud DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('Error al obtener solicitudes pendientes:', err);
    res.status(500).json({ success: false, error: 'Error al obtener solicitudes pendientes' });
  }
});

// POST /api/notificaciones/solicitudes/:id/atender — Atender y restablecer contraseña al username (Admin)
router.post('/solicitudes/:id/atender', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id_usuario;

  try {
    const solResult = await pool.query(
      `SELECT sp.*, u.id_usuario, u.username 
       FROM solicitudes_password sp
       JOIN usuarios u ON sp.id_usuario = u.id_usuario
       WHERE sp.id_solicitud = $1`,
      [id]
    );

    if (solResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    }

    const sol = solResult.rows[0];
    const usernameNorm = sol.username.trim().toLowerCase();

    // Hashear el nombre de usuario como nueva contraseña
    const passwordHash = await bcrypt.hash(usernameNorm, 10);

    // Actualizar usuario
    await pool.query(
      `UPDATE usuarios 
       SET password_hash = $1, activo = TRUE 
       WHERE id_usuario = $2`,
      [passwordHash, sol.id_usuario]
    );

    // Marcar solicitud como atendida
    await pool.query(
      `UPDATE solicitudes_password 
       SET estatus = 'atendida', atendido_por = $1, fecha_atencion = NOW() 
       WHERE id_solicitud = $2`,
      [adminId, id]
    );

    // Notificar al usuario solicitante
    await pool.query(
      `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES ($1, 'password_restablecida', $2, $3, $4)`,
      [
        sol.id_usuario,
        'Contraseña restablecida por administración',
        `Su solicitud ha sido atendida. Su contraseña ha sido restablecida a su nombre de usuario provisional (@${usernameNorm}). Puede acceder ingresando este nombre de usuario como contraseña.`,
        id,
      ]
    );

    // Marcar la notificación del administrador como leída
    await pool.query(
      `UPDATE notificaciones 
       SET leida = TRUE 
       WHERE id_solicitud = $1 AND para_rol = 'admin'`,
      [id]
    );

    await logAudit(req, 'RESET_PASSWORD_REQUEST', 'usuarios', sol.id_usuario, null, {
      id_solicitud: id,
      username: usernameNorm,
      atendido_por: adminId,
      motivo: 'Atención de solicitud de restablecimiento NOM-004-SSA3-2012',
    });

    res.json({
      success: true,
      message: `Contraseña de @${usernameNorm} restablecida exitosamente a su nombre de usuario.`,
      username: usernameNorm,
    });
  } catch (err: any) {
    console.error('Error al atender solicitud de restablecimiento:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al atender la solicitud' });
  }
});

// POST /api/notificaciones/solicitudes/:id/rechazar — Rechazar solicitud de restablecimiento (Admin)
router.post('/solicitudes/:id/rechazar', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id_usuario;
  const { motivo_rechazo } = req.body;

  try {
    const solResult = await pool.query(
      `SELECT sp.*, u.id_usuario, u.username 
       FROM solicitudes_password sp
       JOIN usuarios u ON sp.id_usuario = u.id_usuario
       WHERE sp.id_solicitud = $1`,
      [id]
    );

    if (solResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
    }

    const sol = solResult.rows[0];

    await pool.query(
      `UPDATE solicitudes_password 
       SET estatus = 'rechazada', atendido_por = $1, fecha_atencion = NOW() 
       WHERE id_solicitud = $2`,
      [adminId, id]
    );

    await pool.query(
      `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, id_solicitud)
       VALUES ($1, 'solicitud_rechazada', $2, $3, $4)`,
      [
        sol.id_usuario,
        'Solicitud de restablecimiento no autorizada',
        motivo_rechazo || 'Su solicitud de restablecimiento no fue aprobada. Por favor preséntese personalmente en el Departamento de Administración con su identificación oficial.',
        id,
      ]
    );

    await pool.query(
      `UPDATE notificaciones 
       SET leida = TRUE 
       WHERE id_solicitud = $1 AND para_rol = 'admin'`,
      [id]
    );

    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (err: any) {
    console.error('Error al rechazar solicitud:', err);
    res.status(500).json({ success: false, error: 'Error al rechazar la solicitud' });
  }
});

export default router;
