import fs from 'fs';
import path from 'path';
import pool from './config/database';

async function migrate() {
  console.log('🔄 Ejecutando migración de base de datos...');

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(schema);
    console.log('✅ Migración completada exitosamente');
  } catch (err: any) {
    console.error('❌ Error en migración:', err.message);
    if (err.detail) {
      console.error('   Detalle:', err.detail);
    }
  } finally {
    await pool.end();
  }
}

migrate();
