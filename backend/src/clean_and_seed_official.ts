import bcrypt from 'bcryptjs';
import pool from './config/database';

async function main() {
  console.log('🧹 Iniciando purga total de datos de prueba y re-siembra oficial...\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // =========================================================================
    // 1. DESVINCULAR RELACIONES EXTERNAS ANTES DE TRUNCAR
    // =========================================================================
    console.log('1️⃣ Desvinculando camas y médicos de usuarios...');
    await client.query(`UPDATE cama SET id_encuentro_actual = NULL, estado = 'disponible'`);
    await client.query(`UPDATE usuarios SET id_medico = NULL`);

    // =========================================================================
    // 2. PURGA TOTAL DE TABLAS CLÍNICAS Y DE PACIENTES
    // =========================================================================
    console.log('2️⃣ Vaciando tablas clínicas, de encuentros y de pacientes en cascada...');
    await client.query(`
      TRUNCATE TABLE 
        doc_partograma_ingreso,
        partograma,
        atencion_parto,
        nota_atencion_rn,
        recien_nacido,
        doc_hoja_diaria_urgencias_sinba16,
        doc_hoja_hospitalizacion_sinba14,
        doc_nota_egreso,
        doc_historia_clinica_pediatrica,
        doc_hoja_indicaciones,
        doc_indicacion_orden,
        doc_solicitud_gabinete,
        doc_solicitud_laboratorio,
        doc_hoja_frontal,
        doc_aviso_privacidad,
        doc_consentimiento_informado,
        consentimiento_informado,
        historia_clinica,
        nota_ingreso,
        nota_urgencias,
        nota_evolucion_diaria,
        internamiento,
        indicaciones_medicas,
        orden_estudio,
        interconsulta,
        referencia,
        traslado_intrahospitalario,
        notificaciones,
        solicitudes_password,
        encuentro,
        paciente,
        personal_medico
      RESTART IDENTITY CASCADE
    `);

    // =========================================================================
    // 3. LIMPIAR USUARIOS - DEJAR SÓLO ADMIN
    // =========================================================================
    console.log('3️⃣ Limpiando usuarios, conservando exclusivamente a admin...');
    await client.query(`DELETE FROM usuarios WHERE username != 'admin'`);

    // Asegurar que el usuario admin exista, esté activo y con rol 1 (admin)
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const adminUpsert = await client.query(`
      INSERT INTO usuarios (username, password_hash, id_rol, activo, debe_cambiar_password)
      VALUES ('admin', $1, 1, TRUE, FALSE)
      ON CONFLICT (username) DO UPDATE 
        SET password_hash = $1, id_rol = 1, activo = TRUE, debe_cambiar_password = FALSE
      RETURNING id_usuario
    `, [adminPassHash]);

    const adminUserId = adminUpsert.rows[0].id_usuario;
    console.log(`   ✅ Usuario admin verificado con id_usuario: ${adminUserId}`);

    // =========================================================================
    // 4. INSERTAR 20 MÉDICOS OFICIALES DE PLANTILLA HOSPITALARIA
    // =========================================================================
    console.log('4️⃣ Insertando 20 médicos profesionales de plantilla con cédulas reales...');

    const medicosData = [
      // Cirugía / Dirección (1)
      { nom: 'Marco Antonio', apPat: 'Morales', apMat: 'Reyes', ced: '7845120', esp: 'Cirugía General y Laparoscópica', area: 'hospitalizacion' },
      // Ginecología y Obstetricia / Tococirugía (4)
      { nom: 'Sofía', apPat: 'Mendoza', apMat: 'Albarrán', ced: '8492015', esp: 'Ginecología y Obstetricia', area: 'tococirugia' },
      { nom: 'Alejandro', apPat: 'Garduño', apMat: 'Peñaloza', ced: '9321458', esp: 'Ginecología y Obstetricia', area: 'tococirugia' },
      { nom: 'Valeria', apPat: 'Gómez', apMat: 'Navarrete', ced: '1045236', esp: 'Ginecología y Obstetricia', area: 'tococirugia' },
      { nom: 'Roberto Carlos', apPat: 'Vilchis', apMat: 'Cruz', ced: '8712390', esp: 'Obstetricia y Medicina Materno-Fetal', area: 'tococirugia' },
      // Urgencias Médico-Quirúrgicas (4)
      { nom: 'Mariana', apPat: 'Estrada', apMat: 'Colín', ced: '9283741', esp: 'Urgencias Médico-Quirúrgicas', area: 'urgencias' },
      { nom: 'David Fernando', apPat: 'Monroy', apMat: 'Peña', ced: '8172635', esp: 'Medicina de Urgencias', area: 'urgencias' },
      { nom: 'Claudia Ivette', apPat: 'Salinas', apMat: 'Mondragón', ced: '9028374', esp: 'Urgenciología Pediátrica y Adultos', area: 'urgencias' },
      { nom: 'Jorge Luis', apPat: 'Bernal', apMat: 'Cárdenas', ced: '7654321', esp: 'Medicina General y Triage Hospitalario', area: 'urgencias' },
      // Medicina Interna y Cirugía / Hospitalización (4)
      { nom: 'Ricardo Javier', apPat: 'Guadarrama', apMat: 'Lugo', ced: '8392014', esp: 'Medicina Interna', area: 'hospitalizacion' },
      { nom: 'Beatriz Adriana', apPat: 'Reyes', apMat: 'Salgado', ced: '9481726', esp: 'Medicina Interna', area: 'hospitalizacion' },
      { nom: 'Héctor Manuel', apPat: 'Valdés', apMat: 'Benítez', ced: '7519283', esp: 'Cirugía General y del Aparato Digestivo', area: 'hospitalizacion' },
      { nom: 'Gabriela Patricia', apPat: 'Domínguez', apMat: 'Rosas', ced: '8920145', esp: 'Medicina Interna e Infectología', area: 'hospitalizacion' },
      // Pediatría y Neonatología (4)
      { nom: 'Elena', apPat: 'Sánchez', apMat: 'Navarro', ced: '8456789', esp: 'Pediatría Médica', area: 'pediatria' },
      { nom: 'Luis Enrique', apPat: 'Archundia', apMat: 'Mercado', ced: '9182736', esp: 'Pediatría y Neonatología', area: 'pediatria' },
      { nom: 'Ana Cristina', apPat: 'Romero', apMat: 'Téllez', ced: '8029384', esp: 'Pediatría y Cuidados Intensivos Pediátricos', area: 'pediatria' },
      { nom: 'Carlos Iván', apPat: 'Velázquez', apMat: 'Quintana', ced: '9384726', esp: 'Pediatría General', area: 'pediatria' },
      // Anestesiología y Traumatología (2)
      { nom: 'Víctor Hugo', apPat: 'Plata', apMat: 'Carmona', ced: '7890123', esp: 'Anestesiología y Reanimación', area: 'hospitalizacion' },
      { nom: 'Francisco Javier', apPat: 'Marín', apMat: 'Orozco', ced: '8472910', esp: 'Traumatología y Ortopedia', area: 'urgencias' },
      // Admisión y Consulta Externa (1)
      { nom: 'Rosa María', apPat: 'Cedillo', apMat: 'Fuentes', ced: '8930214', esp: 'Medicina Familiar y Admisión Hospitalaria', area: 'admision' },
    ];

    const medicosInsertados: any[] = [];
    for (const m of medicosData) {
      const res = await client.query(`
        INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol_sistema, activo)
        VALUES ($1, $2, $3, $4, $5, $6, 3, TRUE)
        RETURNING id_medico, nombre, apellido_paterno, especialidad
      `, [m.nom, m.apPat, m.apMat, m.ced, m.esp, m.area]);
      medicosInsertados.push(res.rows[0]);
    }

    // Vincular al usuario admin con el primer médico (Dr. Marco Antonio Morales Reyes)
    await client.query(`UPDATE usuarios SET id_medico = $1 WHERE username = 'admin'`, [medicosInsertados[0].id_medico]);

    // =========================================================================
    // 4.1 INVENTARIO OFICIAL DE CAMAS HOSPITALARIAS
    // =========================================================================
    console.log('🛏️ Creando catálogo oficial de camas hospitalarias...');
    await client.query(`TRUNCATE TABLE cama RESTART IDENTITY CASCADE`);

    const camasData = [
      // Hospitalización General (10 censables + 3 no censables)
      { num: 'Cama 101', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 102', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 103', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 104', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 105', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 106', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 107', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 108', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 109', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Cama 110', area: 'hospitalizacion', censable: true, tipo: 'Cama Hospitalaria Adulto', desc: 'Hospitalización Medicina Interna y Cirugía' },
      { num: 'Aislado 1', area: 'hospitalizacion', censable: false, tipo: 'Aislamiento Respiratorio / Contacto', desc: 'Cuarto de Aislamiento 1' },
      { num: 'Aislado 2', area: 'hospitalizacion', censable: false, tipo: 'Aislamiento Respiratorio / Contacto', desc: 'Cuarto de Aislamiento 2' },
      { num: 'Cama Tránsito 1', area: 'hospitalizacion', censable: false, tipo: 'Tránsito Hospitalario', desc: 'Cama de preparación preoperatoria o ingreso' },

      // Urgencias (6 no censables)
      { num: 'Obs Adultos 1', area: 'urgencias', censable: false, tipo: 'Camilla de Observación', desc: 'Área de Observación Adultos Urgencias' },
      { num: 'Obs Adultos 2', area: 'urgencias', censable: false, tipo: 'Camilla de Observación', desc: 'Área de Observación Adultos Urgencias' },
      { num: 'Obs Adultos 3', area: 'urgencias', censable: false, tipo: 'Camilla de Observación', desc: 'Área de Observación Adultos Urgencias' },
      { num: 'Obs Adultos 4', area: 'urgencias', censable: false, tipo: 'Camilla de Observación', desc: 'Área de Observación Adultos Urgencias' },
      { num: 'Choque 1', area: 'urgencias', censable: false, tipo: 'Camilla de Choque / Reanimación', desc: 'Sala de Choque y Reanimación Médica' },
      { num: 'Choque 2', area: 'urgencias', censable: false, tipo: 'Camilla de Choque / Reanimación', desc: 'Sala de Choque y Reanimación Médica' },

      // Tococirugía (5 no censables)
      { num: 'Labor 1', area: 'tococirugia', censable: false, tipo: 'Cama de Labor de Parto', desc: 'Sala de Labor Tococirugía' },
      { num: 'Labor 2', area: 'tococirugia', censable: false, tipo: 'Cama de Labor de Parto', desc: 'Sala de Labor Tococirugía' },
      { num: 'Labor 3', area: 'tococirugia', censable: false, tipo: 'Cama de Labor de Parto', desc: 'Sala de Labor Tococirugía' },
      { num: 'Recuperación Toco 1', area: 'tococirugia', censable: false, tipo: 'Camilla de Recuperación', desc: 'Recuperación Obstétrica Inmediata' },
      { num: 'Recuperación Toco 2', area: 'tococirugia', censable: false, tipo: 'Camilla de Recuperación', desc: 'Recuperación Obstétrica Inmediata' },

      // Pediatría (5 censables)
      { num: 'Cuna 1', area: 'pediatria', censable: true, tipo: 'Cuna Hospitalaria', desc: 'Pediatría Lactantes' },
      { num: 'Cuna 2', area: 'pediatria', censable: true, tipo: 'Cuna Hospitalaria', desc: 'Pediatría Lactantes' },
      { num: 'Cama Ped 1', area: 'pediatria', censable: true, tipo: 'Cama Pediátrica Escolar', desc: 'Pediatría Escolares' },
      { num: 'Cama Ped 2', area: 'pediatria', censable: true, tipo: 'Cama Pediátrica Escolar', desc: 'Pediatría Escolares' },
      { num: 'Cama Ped 3', area: 'pediatria', censable: true, tipo: 'Cama Pediátrica Escolar', desc: 'Pediatría Escolares' },
    ];

    for (const c of camasData) {
      await client.query(`
        INSERT INTO cama (numero, area, es_censable, estado, tipo, descripcion)
        VALUES ($1, $2, $3, 'disponible', $4, $5)
      `, [c.num, c.area, c.censable, c.tipo, c.desc]);
    }

    // =========================================================================
    // 5. INSERTAR 25 PACIENTES OFICIALES (5 EN CADA ÁREA HOSPITALARIA)
    // =========================================================================
    console.log('5️⃣ Insertando 25 pacientes clínicos estructurados (5 por cada área)...');

    const pacientesData = [
      // --- GRUPO 1: URGENCIAS (5) ---
      {
        exp: '2026-00001',
        curp: 'HEMJ880315HMCXRN02',
        nombre: 'Juan Carlos',
        apPat: 'Hernández',
        apMat: 'Morales',
        fn: '1988-03-15',
        sexo: 'M',
        dom: 'Calle Hidalgo #45, Col. Centro, San Felipe del Progreso',
        tel: '7121234501',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Comerciante',
        edoCivil: 'casada',
        area: 'urgencias',
        diag: 'Cólico renoureteral derecho agudo / Litiasis ureteral',
        idMed: medicosInsertados[5].id_medico, // Dra. Mariana Estrada
        cama: null,
      },
      {
        exp: '2026-00002',
        curp: 'LOMG740722MMCSRT05',
        nombre: 'María Guadalupe',
        apPat: 'López',
        apMat: 'Martínez',
        fn: '1974-07-22',
        sexo: 'F',
        dom: 'Av. Juárez #12, Barrio La Cantera, San Felipe del Progreso',
        tel: '7121234502',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Hogar',
        edoCivil: 'casada',
        area: 'urgencias',
        diag: 'Crisis hipertensiva tipo urgencia / Cefalea holocraneana',
        idMed: medicosInsertados[6].id_medico, // Dr. David Fernando Monroy
        cama: null,
      },
      {
        exp: '2026-00003',
        curp: 'BACM970110HMCXRG08',
        nombre: 'Miguel Ángel',
        apPat: 'Bautista',
        apMat: 'Cruz',
        fn: '1997-01-10',
        sexo: 'M',
        dom: 'Domicilio Conocido, Palmillas, San Felipe del Progreso',
        tel: '7121234503',
        lugarNac: 'Atlacomulco, Edo. Méx.',
        ocupa: 'Agricultor',
        edoCivil: 'soltera',
        area: 'urgencias',
        diag: 'Síndrome doloroso abdominal agudo / Descarte de apendicitis',
        idMed: medicosInsertados[7].id_medico, // Dra. Claudia Ivette Salinas
        cama: null,
      },
      {
        exp: '2026-00004',
        curp: 'VIMR820914MMCLNS01',
        nombre: 'Rosa Isela',
        apPat: 'Vilchis',
        apMat: 'Mondragón',
        fn: '1982-09-14',
        sexo: 'F',
        dom: 'Calle Zaragoza #8, San Antonio de las Huertas, San Felipe del Progreso',
        tel: '7121234504',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Artesana',
        edoCivil: 'concubinato',
        area: 'urgencias',
        diag: 'Crisis asmática moderada en tratamiento con nebulizaciones',
        idMed: medicosInsertados[8].id_medico, // Dr. Jorge Luis Bernal
        cama: null,
      },
      {
        exp: '2026-00005',
        curp: 'GOCJ630518HMCXLS04',
        nombre: 'José Luis',
        apPat: 'Gómez',
        apMat: 'Colín',
        fn: '1963-05-18',
        sexo: 'M',
        dom: 'Manzana 2, San Pedro el Alto, San Felipe del Progreso',
        tel: '7121234505',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Campesino',
        edoCivil: 'casada',
        area: 'urgencias',
        diag: 'Traumatismo en tobillo izquierdo cerrado / Posible fractura bimaleolar',
        idMed: medicosInsertados[18].id_medico, // Dr. Francisco Javier Marín (Trauma)
        cama: null,
      },

      // --- GRUPO 2: HOSPITALIZACIÓN GENERAL (5) ---
      {
        exp: '2026-00006',
        curp: 'SADR680211HMCXMR09',
        nombre: 'Roberto',
        apPat: 'Sánchez',
        apMat: 'Domínguez',
        fn: '1968-02-11',
        sexo: 'M',
        dom: 'Calle 5 de Mayo #18, San Felipe del Progreso',
        tel: '7121234506',
        lugarNac: 'Toluca, Edo. Méx.',
        ocupa: 'Empleado',
        edoCivil: 'casada',
        area: 'hospitalizacion',
        diag: 'Neumonía bacteriana adquirida en la comunidad / Oxigenoterapia con puntas nasales',
        idMed: medicosInsertados[9].id_medico, // Dr. Ricardo Javier Guadarrama
        cama: 'Cama 101',
      },
      {
        exp: '2026-00007',
        curp: 'RAGT791104MMCMRR02',
        nombre: 'Teresa',
        apPat: 'Ramírez',
        apMat: 'Galindo',
        fn: '1979-11-04',
        sexo: 'F',
        dom: 'Calle Morelos #32, Ixtlahuaca',
        tel: '7121234507',
        lugarNac: 'Ixtlahuaca, Edo. Méx.',
        ocupa: 'Docente',
        edoCivil: 'casada',
        area: 'hospitalizacion',
        diag: 'Colecistitis aguda litiásica / Postoperada colecistectomía laparoscópica evolutiva',
        idMed: medicosInsertados[11].id_medico, // Dr. Héctor Manuel Valdés
        cama: 'Cama 102',
      },
      {
        exp: '2026-00008',
        curp: 'AAGF600615HMCXLR07',
        nombre: 'Fernando',
        apPat: 'Albarrán',
        apMat: 'Garduño',
        fn: '1960-06-15',
        sexo: 'M',
        dom: 'Domicilio Conocido, Tepetitlán, San Felipe del Progreso',
        tel: '7121234508',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Jubilado',
        edoCivil: 'viuda',
        area: 'hospitalizacion',
        diag: 'Diabetes Mellitus tipo 2 descompensada / Cetoacidosis leve en control metabólico',
        idMed: medicosInsertados[10].id_medico, // Dra. Beatriz Adriana Reyes
        cama: 'Cama 103',
      },
      {
        exp: '2026-00009',
        curp: 'MOCA750428MMCRLS03',
        nombre: 'Ana Luisa',
        apPat: 'Morales',
        apMat: 'Carmona',
        fn: '1975-04-28',
        sexo: 'F',
        dom: 'Av. del Ferrocarril #5, Atlacomulco',
        tel: '7121234509',
        lugarNac: 'Atlacomulco, Edo. Méx.',
        ocupa: 'Contadora',
        edoCivil: 'divorciada',
        area: 'hospitalizacion',
        diag: 'Pielonefritis aguda izquierda no complicada / Esquema antibiótico IV',
        idMed: medicosInsertados[12].id_medico, // Dra. Gabriela Patricia Domínguez
        cama: 'Cama 104',
      },
      {
        exp: '2026-00010',
        curp: 'NAEA840819HMCXVR06',
        nombre: 'Armando',
        apPat: 'Nava',
        apMat: 'Esquivel',
        fn: '1984-08-19',
        sexo: 'M',
        dom: 'Calle Vicente Guerrero #14, El Oro, Méx.',
        tel: '7121234510',
        lugarNac: 'El Oro, Edo. Méx.',
        ocupa: 'Chofer de transporte',
        edoCivil: 'casada',
        area: 'hospitalizacion',
        diag: 'Pancreatitis aguda de origen biliar grado Balthazar B en resolución',
        idMed: medicosInsertados[0].id_medico, // Dr. Marco Antonio Morales
        cama: 'Cama 105',
      },

      // --- GRUPO 3: TOCOCIRUGÍA Y OBSTETRICIA (5) ---
      {
        exp: '2026-00011',
        curp: 'FOGB030214MMCLRN09',
        nombre: 'Brenda Lizeth',
        apPat: 'Flores',
        apMat: 'Garduño',
        fn: '2003-02-14',
        sexo: 'F',
        dom: 'Barrio El Rincón, San Felipe del Progreso',
        tel: '7121234511',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Hogar',
        edoCivil: 'concubinato',
        area: 'tococirugia',
        diag: 'Embarazo a término de 39.2 SDG en Fase Activa de Trabajo de Parto',
        idMed: medicosInsertados[1].id_medico, // Dra. Sofía Mendoza
        cama: null,
        // Datos obstétricos para partograma
        obstetrico: {
          gesta: 1, para: 0, cesareas: 0, abortos: 0, sdg: '39.2',
          dilatacion: '6', borramiento: '80', fcf: '142', posicion: 'OA',
          presentacion: 'Cefálica', hodge: '2', pelvis: true, membranas: 'intactas'
        }
      },
      {
        exp: '2026-00012',
        curp: 'MOPD980620MMCNNR06',
        nombre: 'Diana Laura',
        apPat: 'Monroy',
        apMat: 'Peñaloza',
        fn: '1998-06-20',
        sexo: 'F',
        dom: 'Domicilio Conocido, Fresno Niches, San Felipe del Progreso',
        tel: '7121234512',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Hogar',
        edoCivil: 'casada',
        area: 'tococirugia',
        diag: 'Embarazo de 38.5 SDG en Labor de Parto / Fase latente avanzada',
        idMed: medicosInsertados[2].id_medico, // Dr. Alejandro Garduño
        cama: null,
        obstetrico: {
          gesta: 2, para: 1, cesareas: 0, abortos: 0, sdg: '38.5',
          dilatacion: '4', borramiento: '60', fcf: '138', posicion: 'OIA',
          presentacion: 'Cefálica', hodge: '1', pelvis: true, membranas: 'intactas'
        }
      },
      {
        exp: '2026-00013',
        curp: 'REMK950805MMCYNR01',
        nombre: 'Karla Vanessa',
        apPat: 'Reyes',
        apMat: 'Mondragón',
        fn: '1995-08-05',
        sexo: 'F',
        dom: 'San Juan Jalpa, San Felipe del Progreso',
        tel: '7121234513',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Comerciante',
        edoCivil: 'casada',
        area: 'tococirugia',
        diag: 'Embarazo de 40.1 SDG / Trabajo de parto en período expulsivo',
        idMed: medicosInsertados[3].id_medico, // Dra. Valeria Gómez
        cama: null,
        obstetrico: {
          gesta: 3, para: 1, cesareas: 1, abortos: 0, sdg: '40.1',
          dilatacion: '9', borramiento: '100', fcf: '145', posicion: 'OA',
          presentacion: 'Cefálica', hodge: '3', pelvis: true, membranas: 'rotas'
        }
      },
      {
        exp: '2026-00014',
        curp: 'VISC050329MMCLND04',
        nombre: 'Claudia Berenice',
        apPat: 'Vilchis',
        apMat: 'Solís',
        fn: '2005-03-29',
        sexo: 'F',
        dom: 'San José del Rincón, Méx.',
        tel: '7121234514',
        lugarNac: 'San José del Rincón, Edo. Méx.',
        ocupa: 'Estudiante',
        edoCivil: 'soltera',
        area: 'tococirugia',
        diag: 'Primigesta en trabajo de parto activo / Ruptura prematura de membranas',
        idMed: medicosInsertados[4].id_medico, // Dr. Roberto Carlos Vilchis
        cama: null,
        obstetrico: {
          gesta: 1, para: 0, cesareas: 0, abortos: 0, sdg: '39.4',
          dilatacion: '5', borramiento: '70', fcf: '140', posicion: 'ODA',
          presentacion: 'Cefálica', hodge: '2', pelvis: true, membranas: 'rotas'
        }
      },
      {
        exp: '2026-00015',
        curp: 'CAPE001012MMCRLS08',
        nombre: 'Estefanía',
        apPat: 'Carmona',
        apMat: 'Plata',
        fn: '2000-10-12',
        sexo: 'F',
        dom: 'Calle Reforma #22, Atlacomulco',
        tel: '7121234515',
        lugarNac: 'Atlacomulco, Edo. Méx.',
        ocupa: 'Empleada',
        edoCivil: 'casada',
        area: 'tococirugia',
        diag: 'Embarazo de 38.2 SDG con dinámica uterina regular / Valoración obstétrica',
        idMed: medicosInsertados[1].id_medico, // Dra. Sofía Mendoza
        cama: null,
        obstetrico: {
          gesta: 2, para: 0, cesareas: 1, abortos: 0, sdg: '38.2',
          dilatacion: '4', borramiento: '50', fcf: '144', posicion: 'OA',
          presentacion: 'Cefálica', hodge: '2', pelvis: true, membranas: 'intactas'
        }
      },

      // --- GRUPO 4: PEDIATRÍA (5) ---
      {
        exp: '2026-00016',
        curp: 'GORM260310HMCNSN04',
        nombre: 'Mateo Santiago',
        apPat: 'González',
        apMat: 'Reyes',
        fn: '2026-03-10',
        sexo: 'M',
        dom: 'Calle Bugambilias #10, San Felipe del Progreso',
        tel: '7121234516',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Lactante menor',
        edoCivil: '',
        area: 'pediatria',
        diag: 'Bronquiolitis aguda viral / Manejo de sostén y micronebulizaciones con solución salina',
        idMed: medicosInsertados[13].id_medico, // Dra. Elena Sánchez (Pediatría)
        cama: null,
        tutor: { nom: 'Andrea Reyes Solís', par: 'Madre', tel: '7121234516' }
      },
      {
        exp: '2026-00017',
        curp: 'GOMV230815MMCMNS07',
        nombre: 'Valentina Sofía',
        apPat: 'Gómez',
        apMat: 'Mondragón',
        fn: '2023-08-15',
        sexo: 'F',
        dom: 'Barrio La Venta, San Felipe del Progreso',
        tel: '7121234517',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Preescolar',
        edoCivil: '',
        area: 'pediatria',
        diag: 'Gastroenteritis aguda infecciosa con deshidratación leve en plan de hidratación oral',
        idMed: medicosInsertados[14].id_medico, // Dr. Luis Enrique Archundia
        cama: null,
        tutor: { nom: 'Patricia Mondragón Albarrán', par: 'Madre', tel: '7121234517' }
      },
      {
        exp: '2026-00018',
        curp: 'MAPE190412HMCXNN02',
        nombre: 'Emiliano',
        apPat: 'Martínez',
        apMat: 'Peña',
        fn: '2019-04-12',
        sexo: 'M',
        dom: 'Domicilio Conocido, Dios Padre, San Felipe del Progreso',
        tel: '7121234518',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Estudiante primaria',
        edoCivil: '',
        area: 'pediatria',
        diag: 'Neumonía bacteriana pediátrica adquirida en la comunidad / Buena respuesta a ceftriaxona',
        idMed: medicosInsertados[15].id_medico, // Dra. Ana Cristina Romero
        cama: null,
        tutor: { nom: 'Carlos Martínez Cruz', par: 'Padre', tel: '7121234518' }
      },
      {
        exp: '2026-00019',
        curp: 'TOVC251205MMCRLN05',
        nombre: 'Camila Ximena',
        apPat: 'Torres',
        apMat: 'Vilchis',
        fn: '2025-12-05',
        sexo: 'F',
        dom: 'San Agustín Mextepec, San Felipe del Progreso',
        tel: '7121234519',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Lactante',
        edoCivil: '',
        area: 'pediatria',
        diag: 'Síndrome febril agudo en estudio / Exantema súbito en resolución',
        idMed: medicosInsertados[16].id_medico, // Dr. Carlos Iván Velázquez
        cama: null,
        tutor: { nom: 'Jessica Vilchis Garduño', par: 'Madre', tel: '7121234519' }
      },
      {
        exp: '2026-00020',
        curp: 'MODS210625HMCXRB09',
        nombre: 'Sebastián Gael',
        apPat: 'Morales',
        apMat: 'Domínguez',
        fn: '2021-06-25',
        sexo: 'M',
        dom: 'Av. Hidalgo #80, Ixtlahuaca',
        tel: '7121234520',
        lugarNac: 'Ixtlahuaca, Edo. Méx.',
        ocupa: 'Preescolar',
        edoCivil: '',
        area: 'pediatria',
        diag: 'Faringoamigdalitis purulenta aguda con intolerancia oral leve',
        idMed: medicosInsertados[13].id_medico, // Dra. Elena Sánchez
        cama: null,
        tutor: { nom: 'Lorena Domínguez Reyes', par: 'Madre', tel: '7121234520' }
      },

      // --- GRUPO 5: ADMISIÓN CONTINUA Y ARCHIVO (5) ---
      {
        exp: '2026-00021',
        curp: 'CUVG910118MMCRLZ03',
        nombre: 'Guadalupe Araceli',
        apPat: 'Cruz',
        apMat: 'Velázquez',
        fn: '1991-01-18',
        sexo: 'F',
        dom: 'Domicilio Conocido, Calvario Buenavista, San Felipe del Progreso',
        tel: '7121234521',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Comerciante',
        edoCivil: 'casada',
        area: 'admision',
        diag: 'Apertura de expediente / Solicitud de atención ginecológica preventiva',
        idMed: medicosInsertados[19].id_medico, // Dra. Rosa María Cedillo
        cama: null,
      },
      {
        exp: '2026-00022',
        curp: 'PAGE650709HMCXRN08',
        nombre: 'Enrique Arturo',
        apPat: 'Peña',
        apMat: 'Garduño',
        fn: '1965-07-09',
        sexo: 'M',
        dom: 'Calle Morelos #4, Jocotitlán, Méx.',
        tel: '7121234522',
        lugarNac: 'Jocotitlán, Edo. Méx.',
        ocupa: 'Agricultor',
        edoCivil: 'casada',
        area: 'admision',
        diag: 'Ingreso programado para protocolo prequirúrgico de hernia inguinal derecha',
        idMed: medicosInsertados[0].id_medico, // Dr. Marco Antonio Morales
        cama: null,
      },
      {
        exp: '2026-00023',
        curp: 'COBL991130MMCLND06',
        nombre: 'Lucía Jimena',
        apPat: 'Colín',
        apMat: 'Benítez',
        fn: '1999-11-30',
        sexo: 'F',
        dom: 'San Pedro el Alto, San Felipe del Progreso',
        tel: '7121234523',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Hogar',
        edoCivil: 'soltera',
        area: 'admision',
        diag: 'Control prenatal de primer trimestre / Registro en programa materno',
        idMed: medicosInsertados[19].id_medico, // Dra. Rosa María Cedillo
        cama: null,
      },
      {
        exp: '2026-00024',
        curp: 'AASF770514HMCXLR01',
        nombre: 'Francisco Javier',
        apPat: 'Albarrán',
        apMat: 'Solís',
        fn: '1977-05-14',
        sexo: 'M',
        dom: 'Calle Matamoros #19, Atlacomulco',
        tel: '7121234524',
        lugarNac: 'Atlacomulco, Edo. Méx.',
        ocupa: 'Mecánico',
        edoCivil: 'casada',
        area: 'admision',
        diag: 'Valoración médica integral de primera vez / Control de hipertensión arterial',
        idMed: medicosInsertados[19].id_medico, // Dra. Rosa María Cedillo
        cama: null,
      },
      {
        exp: '2026-00025',
        curp: 'MOVM860822MMCRLG07',
        nombre: 'Maricela Elizabeth',
        apPat: 'Morales',
        apMat: 'Vega',
        fn: '1986-08-22',
        sexo: 'F',
        dom: 'Av. de las Rosas #15, San Felipe del Progreso',
        tel: '7121234525',
        lugarNac: 'San Felipe del Progreso, Edo. Méx.',
        ocupa: 'Empleada',
        edoCivil: 'casada',
        area: 'admision',
        diag: 'Ingreso administrativo para estudios de laboratorio y gabinete de rutina',
        idMed: medicosInsertados[19].id_medico, // Dra. Rosa María Cedillo
        cama: null,
      },
    ];

    for (const p of pacientesData) {
      // 1. Insertar Paciente
      const pacRes = await client.query(`
        INSERT INTO paciente (
          expediente_clinico, curp, nombre, apellido_paterno, apellido_materno,
          fecha_nacimiento, sexo, domicilio, telefono, lugar_nacimiento,
          ocupacion, estado_civil, pais_nacimiento, domicilio_pais,
          tutor_nombre, tutor_parentesco, tutor_telefono,
          gesta, para, cesarea, aborto, hijos_vivos,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, 'MÉXICO', 'MÉXICO',
          $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21
        ) RETURNING id_paciente, expediente_clinico
      `, [
        p.exp, p.curp, p.nombre, p.apPat, p.apMat,
        p.fn, p.sexo, p.dom, p.tel, p.lugarNac,
        p.ocupa, p.edoCivil,
        (p as any).tutor?.nom || null, (p as any).tutor?.par || null, (p as any).tutor?.tel || null,
        (p as any).obstetrico?.gesta ?? 0,
        (p as any).obstetrico?.para ?? 0,
        (p as any).obstetrico?.cesareas ?? 0,
        (p as any).obstetrico?.abortos ?? 0,
        (p as any).obstetrico?.para ?? 0,
        adminUserId
      ]);

      const idPac = pacRes.rows[0].id_paciente;

      // 2. Insertar Encuentro activo
      const encRes = await client.query(`
        INSERT INTO encuentro (
          id_paciente, fecha_hora_ingreso, area_ingreso, servicio_actual,
          id_medico_responsable, estatus, cama_asignada, created_by
        ) VALUES (
          $1, NOW() - INTERVAL '2 hours', $2, $3,
          $4, 'activo', $5, $6
        ) RETURNING id_encuentro
      `, [
        idPac,
        p.area,
        p.area,
        p.idMed,
        p.cama,
        adminUserId
      ]);

      const idEnc = encRes.rows[0].id_encuentro;

      // Si tiene cama asignada, actualizar cama como ocupada
      if (p.cama) {
        await client.query(`
          UPDATE cama 
          SET estado = 'ocupada', id_encuentro_actual = $1 
          WHERE numero = $2
        `, [idEnc, p.cama]);
      }

      // Si es de Tococirugía, crear el registro inicial oficial en doc_partograma_ingreso
      if ((p as any).obstetrico) {
        const obs = (p as any).obstetrico;
        const medNom = `${medicosData.find(m => m.ced === '8492015')?.nom} ${medicosData.find(m => m.ced === '8492015')?.apPat}`;
        await client.query(`
          INSERT INTO doc_partograma_ingreso (
            id_encuentro, unidad_medica, fecha, hora, medico_responsable, medico_cedula,
            gesta, para, cesareas, abortos, hijos_vivos, semanas_gestacion,
            actividad_uterina_inicio, contracciones_10min, ta, temp, fr, fc,
            fcf, fcf_ritmo, cervix_dilatacion, cervix_borramiento, pelvis_util,
            presentacion, posicion, planos_hodge, membranas, ruptura_membranas, liquido_amniotico,
            impresion_diagnostica, indicaciones_medicas, registrado_por
          ) VALUES (
            $1, 'Hospital General San Felipe del Progreso', CURRENT_DATE, '08:30', $2, '8492015',
            $3, $4, $5, $6, $7, $8,
            'Hoy 06:00', 3, '115/75', '36.6', 19, 78,
            $9, 'Regular', $10, $11, $12,
            $13, $14, $15, $16, $17, $18,
            $19, 'Monitoreo estricto materno y fetal, hidratación parenteral, vigilancia de la curva del partograma.', $20
          )
        `, [
          idEnc, medNom,
          obs.gesta, obs.para, obs.cesareas, obs.abortos, obs.para, obs.sdg,
          obs.fcf, obs.dilatacion, obs.borramiento, obs.pelvis,
          obs.presentacion, obs.posicion, obs.hodge, obs.membranas, obs.membranas === 'rotas', obs.membranas === 'rotas' ? 'claro' : '',
          p.diag,
          adminUserId
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('\n✨ ¡Limpieza y siembra oficial completada con éxito!');
    console.log('   👨‍⚕️ 20 médicos en plantilla');
    console.log('   👤 1 usuario único administrador (admin / admin123)');
    console.log('   🏥 25 pacientes reales distribuidos (5 por área: Urgencias, Hospitalización, Tococirugía, Pediatría, Admisión)\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la siembra:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
