"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
if (!process.env.VERCEL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('dotenv').config();
    }
    catch (_) { }
}
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const useSSL = isProduction || process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL);
const maxConnections = process.env.VERCEL ? 3 : 20;
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'expediente_clinico',
        user: process.env.DB_USER || process.env.USER || 'marcoantonio',
        password: process.env.DB_PASSWORD || '',
        ssl: useSSL ? { rejectUnauthorized: false } : undefined,
        max: maxConnections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
const pool = new pg_1.Pool(poolConfig);
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
exports.default = pool;
//# sourceMappingURL=database.js.map