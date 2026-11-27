"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.auditMiddleware = auditMiddleware;
const database_1 = __importDefault(require("../config/database"));
function cleanIp(ip) {
    if (!ip || typeof ip !== 'string')
        return '127.0.0.1';
    const first = ip.split(',')[0].trim();
    const clean = first.replace(/^::ffff:/, '');
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean))
        return clean;
    if (clean.includes(':'))
        return clean;
    return '127.0.0.1';
}
/**
 * Registra una acción en la bitácora de auditoría.
 */
async function logAudit(req, accion, tabla, id_registro, datosAnteriores, datosNuevos) {
    try {
        await database_1.default.query(`INSERT INTO audit_log (id_usuario, accion, tabla, id_registro, datos_anteriores, datos_nuevos, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            req.user?.id_usuario || null,
            accion,
            tabla,
            id_registro,
            datosAnteriores ? JSON.stringify(datosAnteriores) : null,
            datosNuevos ? JSON.stringify(datosNuevos) : null,
            cleanIp(req.ip),
        ]);
    }
    catch (err) {
        console.error('Error en audit_log:', err);
        // No fallar la operación por error de auditoría
    }
}
function auditMiddleware(accion, tabla) {
    return async (req, res, next) => {
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
                }
                catch (e) { }
            }
            return originalSend.call(this, body);
        };
        next();
    };
}
//# sourceMappingURL=audit.js.map