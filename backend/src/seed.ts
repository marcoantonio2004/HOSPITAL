import bcrypt from 'bcryptjs';
import pool from './config/database';

async function seed() {
  console.log('🌱 Insertando datos iniciales...');

  try {
    // Crear usuario admin por defecto
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO usuarios (username, password_hash, id_rol)
       VALUES ('admin', $1, 1)
       ON CONFLICT (username) DO NOTHING`,
      [adminPassword]
    );
    console.log('  ✅ Usuario admin creado (usuario: admin, contraseña: admin123)');

    // Crear usuario de prueba para admisión
    const admPassword = await bcrypt.hash('admision123', 10);
    await pool.query(
      `INSERT INTO usuarios (username, password_hash, id_rol)
       VALUES ('admision', $1, 2)
       ON CONFLICT (username) DO NOTHING`,
      [admPassword]
    );
    console.log('  ✅ Usuario admisión creado (usuario: admision, contraseña: admision123)');

    // Crear usuario médico de prueba
    // Crear personal médico de plantilla
    const medicoResult = await pool.query(
      `INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, id_rol_sistema)
       VALUES ('María', 'García', 'López', '12345678', 'Medicina General', 3)
       ON CONFLICT (cedula_profesional) DO NOTHING
       RETURNING id_medico`
    );

    // Médicos adicionales de plantilla
    await pool.query(
      `INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, id_rol_sistema)
       VALUES 
         ('Carlos Alberto', 'Ramírez', 'Soto', '87654321', 'Urgenciología', 3),
         ('Elena', 'Sánchez', 'Navarro', '45678912', 'Pediatría y Neonatología', 3),
         ('Fernando', 'Torres', 'Morales', '98761234', 'Ginecología y Obstetricia', 3)
       ON CONFLICT (cedula_profesional) DO NOTHING`
    );

    let medicoId = medicoResult.rows[0]?.id_medico;
    if (!medicoId) {
      const existing = await pool.query('SELECT id_medico FROM personal_medico WHERE cedula_profesional = $1', ['12345678']);
      medicoId = existing.rows[0]?.id_medico;
    }

    if (medicoId) {
      const medPassword = await bcrypt.hash('medico123', 10);
      await pool.query(
        `INSERT INTO usuarios (username, password_hash, id_medico, id_rol)
         VALUES ('medico', $1, $2, 3)
         ON CONFLICT (username) DO NOTHING`,
        [medPassword, medicoId]
      );
      console.log('  ✅ Usuario médico creado (usuario: medico, contraseña: medico123)');
    }

    console.log('\n📋 Usuarios disponibles:');
    console.log('   admin / admin123       — Administrador');
    console.log('   admision / admision123  — Admisión');
    console.log('   medico / medico123      — Médico');

  } catch (err: any) {
    console.error('❌ Error en seed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
