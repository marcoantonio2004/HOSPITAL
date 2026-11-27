import { AuthRequest } from '../types';
/**
 * Registra una acción en la bitácora de auditoría.
 */
export declare function logAudit(req: AuthRequest, accion: string, tabla: string, id_registro: number | null, datosAnteriores: any | null, datosNuevos: any | null): Promise<void>;
export declare function auditMiddleware(accion: string, tabla: string): (req: AuthRequest, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
//# sourceMappingURL=audit.d.ts.map