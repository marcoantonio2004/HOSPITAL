import pool from '../config/database';
import { AuthRequest } from '../types';

/**
 * Registra una acción en la bitácora de auditoría.
 */
export async function logAudit(
  req: AuthRequest,
  accion: string,
  tabla: string,
  id_registro: number | null,
  datosAnteriores: any | null,
  datosNuevos: any | null
) {
  try {
    await pool.query(
      `INSERT INTO audit_log (id_usuario, accion, tabla, id_registro, datos_anteriores, datos_nuevos, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user?.id_usuario || null,
        accion,
        tabla,
        id_registro,
        datosAnteriores ? JSON.stringify(datosAnteriores) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
        req.ip,
      ]
    );
  } catch (err) {
    console.error('Error en audit_log:', err);
    // No fallar la operación por error de auditoría
  }
}

export function auditMiddleware(accion: string, tabla: string) {
  return async (req: AuthRequest, res: import('express').Response, next: import('express').NextFunction) => {
    // Para capturar la respuesta
    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const bodyJson = JSON.parse(body);
          if (bodyJson.success && bodyJson.data) {
             const id_registro = bodyJson.data.id || bodyJson.data[`id_${tabla}`] || null;
             logAudit(req, accion, tabla, id_registro, req.body, bodyJson.data).catch(console.error);
          }
        } catch(e) {}
      }
      return originalSend.call(this, body);
    };
    next();
  };
}
