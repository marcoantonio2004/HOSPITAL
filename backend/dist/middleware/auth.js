"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
if (!process.env.VERCEL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('dotenv').config();
    }
    catch (_) { }
}
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
}
async function authenticate(req, res, next) {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token && typeof req.query?.token === 'string') {
        token = req.query.token;
    }
    if (!token) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET || 'expediente_clinico_secret');
        // Check if user is active
        const userResult = await database_1.default.query('SELECT activo FROM usuarios WHERE id_usuario = $1', [decoded.id_usuario]);
        if (userResult.rows.length === 0 || !userResult.rows[0].activo) {
            return res.status(401).json({ success: false, error: 'Usuario inactivo o eliminado' });
        }
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }
}
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol_nombre)) {
            return res.status(403).json({ success: false, error: 'Sin permisos para esta acción' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map