import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import rateLimit from 'express-rate-limit';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'expediente_clinico_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per IP
  message: { success: false, error: 'Demasiados intentos de inicio de sesión' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const result = await pool.query(
      `SELECT u.*, r.nombre as rol_nombre, pm.nombre as medico_nombre
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.username = $1 AND u.activo = TRUE`,
      [username]
    );

    let user = null;
    let validPassword = false;

    if (result.rows.length > 0) {
      user = result.rows[0];
      validPassword = await bcrypt.compare(password, user.password_hash);
    } else {
      // Dummy compare to prevent timing attack
      await bcrypt.compare(password, '$2a$10$xyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyz');
    }

    if (!user || !validPassword) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [user.id_usuario]);


    const tokenPayload = {
      id_usuario: user.id_usuario,
      username: user.username,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
      id_medico: user.id_medico,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    });

    // Add audit log for login
    await logAudit({ user: tokenPayload, ip: req.ip } as any, 'LOGIN', 'usuarios', user.id_usuario, null, null);

    res.json({
      success: true,
      data: {
        user: {
          id_usuario: user.id_usuario,
          username: user.username,
          nombre: user.medico_nombre || user.nombre || user.username,
          rol: user.rol_nombre,
          id_medico: user.id_medico,
          debe_cambiar_password: Boolean(user.debe_cambiar_password),
        },
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  res.clearCookie('token');
  if (req.user) {
    await logAudit(req, 'LOGOUT', 'usuarios', req.user.id_usuario, null, null);
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.username, u.id_medico, u.id_rol, u.debe_cambiar_password,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.cedula_profesional, pm.especialidad
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1`,
      [req.user!.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        debe_cambiar_password: Boolean(row.debe_cambiar_password),
      },
    });
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/auth/solicitar-restablecimiento — Solicitud pública de restablecimiento (NOM-004)
router.post('/solicitar-restablecimiento', async (req: Request, res: Response) => {
  const { username, motivo } = req.body;

  if (!username || !String(username).trim()) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar su nombre de usuario o matrícula institucional.',
    });
  }

  const cleanUser = String(username).trim().toLowerCase();

  try {
    const userResult = await pool.query(
      `SELECT u.id_usuario, u.username, u.id_medico,
              pm.nombre, pm.apellido_paterno, pm.apellido_materno, pm.especialidad
       FROM usuarios u
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE LOWER(u.username) = $1`,
      [cleanUser]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontró ninguna cuenta registrada con el usuario "${cleanUser}". Verifique sus datos o consulte a la Administración.`,
      });
    }

    const user = userResult.rows[0];
    const nombreCompleto = user.nombre
      ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno || ''}`.trim()
      : user.username;

    // Verificar si ya existe una solicitud pendiente
    const existing = await pool.query(
      `SELECT id_solicitud, fecha_solicitud 
       FROM solicitudes_password 
       WHERE id_usuario = $1 AND estatus = 'pendiente'
       ORDER BY fecha_solicitud DESC LIMIT 1`,
      [user.id_usuario]
    );

    let idSolicitud = null;

    if (existing.rows.length > 0) {
      idSolicitud = existing.rows[0].id_solicitud;
    } else {
      const solResult = await pool.query(
        `INSERT INTO solicitudes_password (
           id_usuario, id_medico, username, nombre_solicitante, motivo, estatus
         ) VALUES ($1, $2, $3, $4, $5, 'pendiente')
         RETURNING id_solicitud`,
        [
          user.id_usuario,
          user.id_medico || null,
          cleanUser,
          nombreCompleto,
          motivo?.trim() || 'Olvido de contraseña reportado desde pantalla de acceso institucional',
        ]
      );
      idSolicitud = solResult.rows[0].id_solicitud;

      // Generar notificación para el rol Administrador
      await pool.query(
        `INSERT INTO notificaciones (para_rol, tipo, titulo, mensaje, id_solicitud)
         VALUES ('admin', 'solicitud_password', $1, $2, $3)`,
        [
          `Solicitud de restablecimiento: @${cleanUser}`,
          `El usuario @${cleanUser} (${nombreCompleto}${user.especialidad ? ' - ' + user.especialidad : ''}) ha reportado el olvido de su clave y solicita restablecimiento administrativo.`,
          idSolicitud,
        ]
      );
    }

    res.json({
      success: true,
      message: `Solicitud registrada exitosamente. Se ha notificado a la Administración para restablecer la contraseña provisional de @${cleanUser}.`,
      data: {
        username: cleanUser,
        nombre: nombreCompleto,
        id_solicitud: idSolicitud,
      },
    });
  } catch (err: any) {
    console.error('Error al registrar solicitud de restablecimiento:', err);
    res.status(500).json({ success: false, error: 'Error al procesar la solicitud de restablecimiento.' });
  }
});

router.put('/mis-credenciales', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id_usuario;
  const { username, password_actual, nueva_password } = req.body;

  if (!password_actual || !String(password_actual).trim()) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar su contraseña actual para confirmar los cambios de seguridad.',
    });
  }

  try {
    const userResult = await pool.query(
      `SELECT u.id_usuario, u.username, u.password_hash, u.id_rol, u.id_medico,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.apellido_paterno, pm.apellido_materno, pm.especialidad
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1 AND u.activo = TRUE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado o inactivo.' });
    }

    const user = userResult.rows[0];

    const passwordValida = await bcrypt.compare(password_actual, user.password_hash);
    if (!passwordValida) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña actual ingresada es incorrecta.',
      });
    }

    let finalUsername = user.username;
    let usernameModificado = false;
    let passwordModificada = false;

    if (username && String(username).trim().toLowerCase() !== user.username.toLowerCase()) {
      const cleanUsername = String(username).trim().toLowerCase();

      if (cleanUsername.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres.',
        });
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.',
        });
      }

      const existeOtro = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE LOWER(username) = $1 AND id_usuario != $2',
        [cleanUsername, userId]
      );

      if (existeOtro.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `El nombre de usuario "${cleanUsername}" ya está registrado por otra cuenta. Elija uno diferente.`,
        });
      }

      finalUsername = cleanUsername;
      usernameModificado = true;
    }

    if (!nueva_password || !String(nueva_password).trim()) {
      return res.status(400).json({
        success: false,
        error: 'El cambio de contraseña es obligatorio. Ingrese una nueva contraseña.',
      });
    }

    const cleanPass = String(nueva_password).trim();
    if (cleanPass.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener un mínimo de 8 caracteres.',
      });
    }
    if (!/[A-Z0-9]/.test(cleanPass)) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe incluir al menos un número o una letra mayúscula.',
      });
    }

    const nuevoHash = await bcrypt.hash(cleanPass, 10);

    await pool.query(
      `UPDATE usuarios 
       SET username = $1, password_hash = $2, debe_cambiar_password = FALSE 
       WHERE id_usuario = $3`,
      [finalUsername, nuevoHash, userId]
    );

    const tokenPayload = {
      id_usuario: user.id_usuario,
      username: finalUsername,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
      id_medico: user.id_medico,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await logAudit(
      req,
      'UPDATE_CREDENTIALS',
      'usuarios',
      userId,
      { username: user.username },
      { username: finalUsername, passwordModificada }
    );

    const nombreCompleto = user.medico_nombre
      ? `${user.medico_nombre} ${user.apellido_paterno || ''} ${user.apellido_materno || ''}`.trim()
      : user.username;

    const cambiosDesc: string[] = [];
    if (usernameModificado) {
      cambiosDesc.push(`nombre de usuario modificado de @${user.username} a @${finalUsername}`);
    }
    if (passwordModificada) {
      cambiosDesc.push('contraseña de acceso actualizada');
    }

    await pool.query(
      `INSERT INTO notificaciones (para_rol, tipo, titulo, mensaje)
       VALUES ('admin', 'cambio_credenciales', $1, $2)`,
      [
        `Actualización de credenciales: @${finalUsername}`,
        `El usuario @${user.username} (${nombreCompleto} - ${user.rol_nombre}) actualizó sus credenciales institucionales: ${cambiosDesc.join(', ')}. Actualización aplicada directamente en el sistema.`,
      ]
    );

    res.json({
      success: true,
      message: 'Credenciales actualizadas exitosamente.',
      data: {
        id_usuario: user.id_usuario,
        username: finalUsername,
        nombre: nombreCompleto,
        rol: user.rol_nombre,
      },
    });
  } catch (err: any) {
    console.error('Error al actualizar credenciales:', err);
    res.status(500).json({ success: false, error: 'Error al procesar la actualización de credenciales.' });
  }
});

router.post('/cambiar-password-obligatorio', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id_usuario;
  const { nueva_password, confirmar_password } = req.body;

  if (!nueva_password || !String(nueva_password).trim()) {
    return res.status(400).json({
      success: false,
      error: 'Debe ingresar una nueva contraseña.',
    });
  }

  const cleanPass = String(nueva_password).trim();

  if (cleanPass.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'La nueva contraseña debe tener un mínimo de 8 caracteres.',
    });
  }

  if (!/[A-Z0-9]/.test(cleanPass)) {
    return res.status(400).json({
      success: false,
      error: 'La nueva contraseña debe incluir al menos un número o una letra mayúscula.',
    });
  }

  if (confirmar_password !== undefined && cleanPass !== String(confirmar_password).trim()) {
    return res.status(400).json({
      success: false,
      error: 'La confirmación de la contraseña no coincide.',
    });
  }

  try {
    const passwordHash = await bcrypt.hash(cleanPass, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1, debe_cambiar_password = FALSE WHERE id_usuario = $2',
      [passwordHash, userId]
    );

    const userResult = await pool.query(
      `SELECT u.id_usuario, u.username, u.id_rol, u.id_medico, u.debe_cambiar_password,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.apellido_paterno, pm.apellido_materno
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    const tokenPayload = {
      id_usuario: user.id_usuario,
      username: user.username,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
      id_medico: user.id_medico,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await logAudit(req, 'UPDATE_PASSWORD_MANDATORY', 'usuarios', userId, null, { obligatorio: true });

    const nombreCompleto = user.medico_nombre
      ? `${user.medico_nombre} ${user.apellido_paterno || ''} ${user.apellido_materno || ''}`.trim()
      : user.username;

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.',
      data: {
        user: {
          id_usuario: user.id_usuario,
          username: user.username,
          nombre: nombreCompleto,
          rol: user.rol_nombre,
          id_medico: user.id_medico,
          debe_cambiar_password: false,
        },
      },
    });
  } catch (err: any) {
    console.error('Error al cambiar contraseña obligatoria:', err);
    res.status(500).json({ success: false, error: 'Error al cambiar la contraseña.' });
  }
});

export default router;
