"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("./config/database"));
async function migrate() {
    console.log('🔄 Ejecutando migración de base de datos...');
    const schemaPath = path_1.default.join(__dirname, '../../database/schema.sql');
    const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
    try {
        await database_1.default.query(schema);
        console.log('✅ Migración completada exitosamente');
    }
    catch (err) {
        console.error('❌ Error en migración:', err.message);
        if (err.detail) {
            console.error('   Detalle:', err.detail);
        }
    }
    finally {
        await database_1.default.end();
    }
}
migrate();
//# sourceMappingURL=migrate.js.map