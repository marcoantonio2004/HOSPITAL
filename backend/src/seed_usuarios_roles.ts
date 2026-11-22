import bcrypt from 'bcryptjs';
import pool from './config/database';

async function main() {
  console.log('🚀 Creando cuentas de usuario para cada uno de los roles institucionales...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Asegurar la existencia de personal para enfermería y laboratorio si no existen
    console.log('1️⃣ Verificando personal para Enfermería y Laboratorio...');

    // Enfermería
    const enfRes = await client.query(`
      SELECT id_medico FROM personal_medico WHERE cedula_profesional = '5489210'
    `);
    let idEnfermeria: number;
    if (enfRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol_sistema, activo)
        VALUES ('Guadalupe', 'Reyes', 'Martínez', '5489210', 'Enfermería General y Hospitalización', 'hospitalizacion', 4, TRUE)
        RETURNING id_medico
      `);
      idEnfermeria = res.rows[0].id_medico;
      console.log(`   ✅ Creado personal de Enfermería con id_medico: ${idEnfermeria}`);
    } else {
      idEnfermeria = enfRes.rows[0].id_medico;
      await client.query(`UPDATE personal_medico SET id_rol_sistema = 4 WHERE id_medico = $1`, [idEnfermeria]);
    }

    // Laboratorio
    const labRes = await client.query(`
      SELECT id_medico FROM personal_medico WHERE cedula_profesional = '6378291'
    `);
    let idLaboratorio: number;
    if (labRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol_sistema, activo)
        VALUES ('Juan Manuel', 'Soto', 'Navarrete', '6378291', 'Laboratorio Clínico y Banco de Sangre', 'urgencias', 5, TRUE)
        RETURNING id_medico
      `);
      idLaboratorio = res.rows[0].id_medico;
      console.log(`   ✅ Creado personal de Laboratorio con id_medico: ${idLaboratorio}`);
    } else {
      idLaboratorio = labRes.rows[0].id_medico;
      await client.query(`UPDATE personal_medico SET id_rol_sistema = 5 WHERE id_medico = $1`, [idLaboratorio]);
    }

    // Actualizar roles de sistema de los médicos asignados a roles especializados
    await client.query(`UPDATE personal_medico SET id_rol_sistema = 2 WHERE id_medico = 20`); // Admisión (Dra. Rosa María Cedillo)
    await client.query(`UPDATE personal_medico SET id_rol_sistema = 3 WHERE id_medico = 10`); // Médico (Dr. Ricardo Javier Guadarrama)
    await client.query(`UPDATE personal_medico SET id_rol_sistema = 6 WHERE id_medico = 2`);  // Obstetricia (Dra. Sofía Mendoza)
    await client.query(`UPDATE personal_medico SET id_rol_sistema = 7 WHERE id_medico = 14`); // Pediatría (Dra. Elena Sánchez)

    // 2. Definición de las cuentas de usuario por rol
    const usuariosNuevos = [
      {
        username: 'admision',
        password: 'admision123',
        id_rol: 2,
        id_medico: 20, // Dra. Rosa María Cedillo Fuentes
        nombreCompleto: 'Dra. Rosa María Cedillo Fuentes (Admisión / Trabajo Social)'
      },
      {
        username: 'medico',
        password: 'medico123',
        id_rol: 3,
        id_medico: 10, // Dr. Ricardo Javier Guadarrama Lugo
        nombreCompleto: 'Dr. Ricardo Javier Guadarrama Lugo (Médico Especialista)'
      },
      {
        username: 'enfermeria',
        password: 'enfermeria123',
        id_rol: 4,
        id_medico: idEnfermeria, // Enf. Guadalupe Reyes Martínez
        nombreCompleto: 'Enf. Guadalupe Reyes Martínez (Personal de Enfermería)'
      },
      {
        username: 'laboratorio',
        password: 'laboratorio123',
        id_rol: 5,
        id_medico: idLaboratorio, // QFB. Juan Manuel Soto Navarrete
        nombreCompleto: 'QFB. Juan Manuel Soto Navarrete (Laboratorio y Gabinete)'
      },
      {
        username: 'obstetricia',
        password: 'obstetricia123',
        id_rol: 6,
        id_medico: 2, // Dra. Sofía Mendoza Albarrán
        nombreCompleto: 'Dra. Sofía Mendoza Albarrán (Ginecología y Obstetricia)'
      },
      {
        username: 'pediatria',
        password: 'pediatria123',
        id_rol: 7,
        id_medico: 14, // Dra. Elena Sánchez Navarro
        nombreCompleto: 'Dra. Elena Sánchez Navarro (Pediatría Médica)'
      }
    ];

    console.log('2️⃣ Insertando / actualizando usuarios institucionales...');

    for (const u of usuariosNuevos) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, id_rol, id_medico, activo, debe_cambiar_password)
        VALUES ($1, $2, $3, $4, TRUE, FALSE)
        ON CONFLICT (username) DO UPDATE 
          SET password_hash = $2,
              id_rol = $3,
              id_medico = $4,
              activo = TRUE,
              debe_cambiar_password = FALSE
      `, [u.username, hash, u.id_rol, u.id_medico]);

      console.log(`   🔑 Usuario listo: @${u.username} | Rol: ${u.id_rol} | Vinculado a: ${u.nombreCompleto}`);
    }

    await client.query('COMMIT');
    console.log('\n✨ ¡Todos los accesos institucionales fueron creados y configurados con éxito!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando los usuarios:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
