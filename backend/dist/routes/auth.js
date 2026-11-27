"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.desbloquearIntentosUsuario = desbloquearIntentosUsuario;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../middleware/audit");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
if (!process.env.VERCEL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('dotenv').config();
    }
    catch (_) { }
}
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'expediente_clinico_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';
function getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const isCrossOrigin = Boolean(process.env.FRONTEND_URL && !process.env.VERCEL);
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd && isCrossOrigin ? 'none' : 'lax'),
        maxAge: 8 * 60 * 60 * 1000, // 8 horas
    };
}
// Configuración de política de seguridad hospitalaria
const MAX_INTENTOS_CONSECUTIVOS = 5;
const TIEMPO_BLOQUEO_MINUTOS = 5;
const TIEMPO_BLOQUEO_MS = TIEMPO_BLOQUEO_MINUTOS * 60 * 1000;
// Registro en memoria de intentos fallidos agrupados por usuario (en minúsculas).
// Esto garantiza que el bloqueo aplique ÚNICAMENTE a la cuenta infractora y NO a toda la IP/hospital.
const intentosPorUsuario = new Map();
function desbloquearIntentosUsuario(username) {
    if (!username)
        return;
    intentosPorUsuario.delete(username.trim().toLowerCase());
}
// Limitador de red general contra ataques automatizados de denegación (DDoS) por IP.
// Umbral amplio (60 peticiones/minuto) para NO interferir con el tráfico normal de los consultorios del hospital.
const networkLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 60,
    skipSuccessfulRequests: true,
    message: { success: false, error: 'Demasiadas solicitudes al servidor desde esta red. Por favor espere un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
});
// POST /api/auth/login
router.post('/login', networkLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }
    const userKey = String(username).trim().toLowerCase();
    // 1. Verificar si este usuario específico se encuentra temporalmente bloqueado
    const registro = intentosPorUsuario.get(userKey);
    if (registro?.bloqueadoHasta) {
        if (Date.now() < registro.bloqueadoHasta) {
            const segRestantes = Math.ceil((registro.bloqueadoHasta - Date.now()) / 1000);
            const minRestantes = Math.ceil(segRestantes / 60);
            return res.status(429).json({
                success: false,
                error: `La cuenta "${userKey}" está bloqueada temporalmente por seguridad tras 5 intentos fallidos. Intente de nuevo en ${minRestantes} minuto(s) o solicite el restablecimiento al administrador.`,
                bloqueado: true,
                usuarioBloqueado: userKey,
                tiempoRestanteSegundos: segRestantes,
            });
        }
        else {
            // El tiempo de penalización concluyó: se restablece el contador
            intentosPorUsuario.delete(userKey);
        }
    }
    try {
        const result = await database_1.default.query(`SELECT u.*, r.nombre as rol_nombre, pm.nombre as medico_nombre
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE LOWER(u.username) = $1 AND u.activo = TRUE`, [userKey]);
        let user = null;
        let validPassword = false;
        if (result.rows.length > 0) {
            user = result.rows[0];
            validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        }
        else {
            // Dummy compare to prevent timing attack
            await bcryptjs_1.default.compare(password, '$2a$10$xyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyz');
        }
        if (!user || !validPassword) {
            const fallosPrevios = (intentosPorUsuario.get(userKey)?.fallos) || 0;
            const nuevosFallos = fallosPrevios + 1;
            if (nuevosFallos >= MAX_INTENTOS_CONSECUTIVOS) {
                intentosPorUsuario.set(userKey, {
                    fallos: nuevosFallos,
                    bloqueadoHasta: Date.now() + TIEMPO_BLOQUEO_MS,
                });
                await (0, audit_1.logAudit)({ user: null, ip: req.ip }, 'LOGIN_BLOQUEO_USUARIO', 'usuarios', user?.id_usuario || null, null, { username: userKey, intentos: nuevosFallos, motivo: 'Bloqueo temporal por 5 intentos fallidos consecutivos de contraseña' });
                return res.status(429).json({
                    success: false,
                    error: `Ha superado el límite de 5 intentos fallidos para el usuario "${userKey}". Por seguridad, la cuenta ha sido bloqueada temporalmente por 5 minutos.`,
                    bloqueado: true,
                    usuarioBloqueado: userKey,
                });
            }
            else {
                intentosPorUsuario.set(userKey, {
                    fallos: nuevosFallos,
                });
                const restantes = MAX_INTENTOS_CONSECUTIVOS - nuevosFallos;
                await (0, audit_1.logAudit)({ user: null, ip: req.ip }, 'LOGIN_FALLIDO', 'usuarios', user?.id_usuario || null, null, { username: userKey, intento: nuevosFallos, intentosRestantes: restantes });
                return res.status(401).json({
                    success: false,
                    error: `Credenciales inválidas para el usuario "${userKey}". Le quedan ${restantes} intento(s) antes del bloqueo temporal de la cuenta.`,
                    intentosRestantes: restantes,
                });
            }
        }
        // 2. Inicio de sesión exitoso: reiniciar contador de fallos de ESTE usuario
        intentosPorUsuario.delete(userKey);
        // Actualizar último acceso
        await database_1.default.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [user.id_usuario]);
        const tokenPayload = {
            id_usuario: user.id_usuario,
            username: user.username,
            id_rol: user.id_rol,
            rol_nombre: user.rol_nombre,
            id_medico: user.id_medico,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.cookie('token', token, getCookieOptions());
        // Add audit log for login
        await (0, audit_1.logAudit)({ user: tokenPayload, ip: req.ip }, 'LOGIN', 'usuarios', user.id_usuario, null, null);
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
    }
    catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, error: err?.message || 'Error interno del servidor' });
    }
});
// POST /api/auth/logout
router.post('/logout', auth_1.authenticate, async (req, res) => {
    const { maxAge: _maxAge, ...clearOpts } = getCookieOptions();
    res.clearCookie('token', clearOpts);
    if (req.user) {
        await (0, audit_1.logAudit)(req, 'LOGOUT', 'usuarios', req.user.id_usuario, null, null);
    }
    res.json({ success: true });
});
// GET /api/auth/me
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT u.id_usuario, u.username, u.id_medico, u.id_rol, u.debe_cambiar_password,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.cedula_profesional, pm.especialidad
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1`, [req.user.id_usuario]);
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
    }
    catch (err) {
        console.error('Error al obtener usuario:', err);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});
// POST /api/auth/solicitar-restablecimiento — Solicitud pública de restablecimiento (NOM-004)
router.post('/solicitar-restablecimiento', async (req, res) => {
    const { username, motivo } = req.body;
    if (!username || !String(username).trim()) {
        return res.status(400).json({
            success: false,
            error: 'Debe ingresar su nombre de usuario o matrícula institucional.',
        });
    }
    const cleanUser = String(username).trim().toLowerCase();
    try {
        const userResult = await database_1.default.query(`SELECT u.id_usuario, u.username, u.id_medico,
              pm.nombre, pm.apellido_paterno, pm.apellido_materno, pm.especialidad
       FROM usuarios u
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE LOWER(u.username) = $1`, [cleanUser]);
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
        const existing = await database_1.default.query(`SELECT id_solicitud, fecha_solicitud 
       FROM solicitudes_password 
       WHERE id_usuario = $1 AND estatus = 'pendiente'
       ORDER BY fecha_solicitud DESC LIMIT 1`, [user.id_usuario]);
        let idSolicitud = null;
        if (existing.rows.length > 0) {
            idSolicitud = existing.rows[0].id_solicitud;
        }
        else {
            const solResult = await database_1.default.query(`INSERT INTO solicitudes_password (
           id_usuario, id_medico, username, nombre_solicitante, motivo, estatus
         ) VALUES ($1, $2, $3, $4, $5, 'pendiente')
         RETURNING id_solicitud`, [
                user.id_usuario,
                user.id_medico || null,
                cleanUser,
                nombreCompleto,
                motivo?.trim() || 'Olvido de contraseña reportado desde pantalla de acceso institucional',
            ]);
            idSolicitud = solResult.rows[0].id_solicitud;
            // Generar notificación para el rol Administrador
            await database_1.default.query(`INSERT INTO notificaciones (para_rol, tipo, titulo, mensaje, id_solicitud)
         VALUES ('admin', 'solicitud_password', $1, $2, $3)`, [
                `Solicitud de restablecimiento: @${cleanUser}`,
                `El usuario @${cleanUser} (${nombreCompleto}${user.especialidad ? ' - ' + user.especialidad : ''}) ha reportado el olvido de su clave y solicita restablecimiento administrativo.`,
                idSolicitud,
            ]);
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
    }
    catch (err) {
        console.error('Error al registrar solicitud de restablecimiento:', err);
        res.status(500).json({ success: false, error: 'Error al procesar la solicitud de restablecimiento.' });
    }
});
router.put('/mis-credenciales', auth_1.authenticate, async (req, res) => {
    const userId = req.user.id_usuario;
    const { username, password_actual, nueva_password } = req.body;
    if (!password_actual || !String(password_actual).trim()) {
        return res.status(400).json({
            success: false,
            error: 'Debe ingresar su contraseña actual para confirmar los cambios de seguridad.',
        });
    }
    try {
        const userResult = await database_1.default.query(`SELECT u.id_usuario, u.username, u.password_hash, u.id_rol, u.id_medico,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.apellido_paterno, pm.apellido_materno, pm.especialidad
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1 AND u.activo = TRUE`, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado o inactivo.' });
        }
        const user = userResult.rows[0];
        const passwordValida = await bcryptjs_1.default.compare(password_actual, user.password_hash);
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
            const existeOtro = await database_1.default.query('SELECT id_usuario FROM usuarios WHERE LOWER(username) = $1 AND id_usuario != $2', [cleanUsername, userId]);
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
        if (!/[A-Z]/.test(cleanPass) || !/[a-z]/.test(cleanPass) || !/[0-9]/.test(cleanPass)) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe cumplir las condiciones de seguridad: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.',
            });
        }
        const nuevoHash = await bcryptjs_1.default.hash(cleanPass, 10);
        await database_1.default.query(`UPDATE usuarios 
       SET username = $1, password_hash = $2, debe_cambiar_password = FALSE 
       WHERE id_usuario = $3`, [finalUsername, nuevoHash, userId]);
        const tokenPayload = {
            id_usuario: user.id_usuario,
            username: finalUsername,
            id_rol: user.id_rol,
            rol_nombre: user.rol_nombre,
            id_medico: user.id_medico,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.cookie('token', token, getCookieOptions());
        await (0, audit_1.logAudit)(req, 'UPDATE_CREDENTIALS', 'usuarios', userId, { username: user.username }, { username: finalUsername, passwordModificada });
        const nombreCompleto = user.medico_nombre
            ? `${user.medico_nombre} ${user.apellido_paterno || ''} ${user.apellido_materno || ''}`.trim()
            : user.username;
        const cambiosDesc = [];
        if (usernameModificado) {
            cambiosDesc.push(`nombre de usuario modificado de @${user.username} a @${finalUsername}`);
        }
        if (passwordModificada) {
            cambiosDesc.push('contraseña de acceso actualizada');
        }
        await database_1.default.query(`INSERT INTO notificaciones (para_rol, tipo, titulo, mensaje)
       VALUES ('admin', 'cambio_credenciales', $1, $2)`, [
            `Actualización de credenciales: @${finalUsername}`,
            `El usuario @${user.username} (${nombreCompleto} - ${user.rol_nombre}) actualizó sus credenciales institucionales: ${cambiosDesc.join(', ')}. Actualización aplicada directamente en el sistema.`,
        ]);
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
    }
    catch (err) {
        console.error('Error al actualizar credenciales:', err);
        res.status(500).json({ success: false, error: 'Error al procesar la actualización de credenciales.' });
    }
});
router.post('/cambiar-password-obligatorio', auth_1.authenticate, async (req, res) => {
    const userId = req.user.id_usuario;
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
    if (!/[A-Z]/.test(cleanPass) || !/[a-z]/.test(cleanPass) || !/[0-9]/.test(cleanPass)) {
        return res.status(400).json({
            success: false,
            error: 'La nueva contraseña debe cumplir las condiciones de seguridad: mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.',
        });
    }
    if (confirmar_password !== undefined && cleanPass !== String(confirmar_password).trim()) {
        return res.status(400).json({
            success: false,
            error: 'La confirmación de la contraseña no coincide.',
        });
    }
    try {
        const passwordHash = await bcryptjs_1.default.hash(cleanPass, 10);
        await database_1.default.query('UPDATE usuarios SET password_hash = $1, debe_cambiar_password = FALSE WHERE id_usuario = $2', [passwordHash, userId]);
        const userResult = await database_1.default.query(`SELECT u.id_usuario, u.username, u.id_rol, u.id_medico, u.debe_cambiar_password,
              r.nombre as rol_nombre,
              pm.nombre as medico_nombre, pm.apellido_paterno, pm.apellido_materno
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE u.id_usuario = $1`, [userId]);
        const user = userResult.rows[0];
        const tokenPayload = {
            id_usuario: user.id_usuario,
            username: user.username,
            id_rol: user.id_rol,
            rol_nombre: user.rol_nombre,
            id_medico: user.id_medico,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.cookie('token', token, getCookieOptions());
        await (0, audit_1.logAudit)(req, 'UPDATE_PASSWORD_MANDATORY', 'usuarios', userId, null, { obligatorio: true });
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
    }
    catch (err) {
        console.error('Error al cambiar contraseña obligatoria:', err);
        res.status(500).json({ success: false, error: 'Error al cambiar la contraseña.' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map