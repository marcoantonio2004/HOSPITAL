import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { AuthRequest } from '../types';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * Genera el siguiente número de expediente.
 * Formato: YYYY-NNNNN (año + secuencial de 5 dígitos)
 */
async function generarExpediente(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT expediente_clinico FROM paciente
     WHERE expediente_clinico LIKE $1
     ORDER BY expediente_clinico DESC LIMIT 1`,
    [`${year}-%`]
  );

  if (result.rows.length === 0) {
    return `${year}-00001`;
  }

  const last = result.rows[0].expediente_clinico;
  const lastNum = parseInt(last.split('-')[1], 10);
  const nextNum = (lastNum + 1).toString().padStart(5, '0');
  return `${year}-${nextNum}`;
}

/**
 * Valida formato de CURP (18 caracteres, formato mexicano).
 */
function validarCURP(curp: string): boolean {
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp);
}

/**
 * Valida que un campo de texto solo contenga letras, espacios, acentos y signos ortográficos de nombres (sin dígitos ni caracteres numéricos).
 */
function soloTextoValido(str?: string | null): boolean {
  if (!str || !str.trim()) return true;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,.'-]+$/.test(str.trim());
}

/**
 * Valida que un teléfono contenga únicamente dígitos numéricos (exactamente 10 dígitos).
 */
function soloTelefonoValido(tel?: string | null): boolean {
  if (!tel || !tel.trim()) return true;
  const digits = tel.trim().replace(/[\s-]/g, '');
  return /^\d{10}$/.test(digits);
}

// ============================================================
// PACIENTES
// ============================================================

// GET /api/pacientes — Buscar pacientes (incluyendo datos de su último encuentro)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { buscar, expediente, curp } = req.query;

  try {
    let query = `
      SELECT p.*,
             e.id_encuentro,
             e.area_ingreso,
             e.servicio_actual,
             e.cama_asignada,
             e.estatus AS estatus_encuentro,
             e.fecha_hora_ingreso
      FROM paciente p
      LEFT JOIN LATERAL (
        SELECT id_encuentro, area_ingreso, servicio_actual, cama_asignada, estatus, fecha_hora_ingreso
        FROM encuentro
        WHERE id_paciente = p.id_paciente
        ORDER BY CASE WHEN estatus = 'activo' THEN 0 ELSE 1 END, fecha_hora_ingreso DESC
        LIMIT 1
      ) e ON true
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (buscar) {
      query += ` AND (
        LOWER(p.nombre) ILIKE LOWER($${paramIdx}) OR
        LOWER(p.apellido_paterno) ILIKE LOWER($${paramIdx}) OR
        LOWER(p.apellido_materno) ILIKE LOWER($${paramIdx}) OR
        p.expediente_clinico ILIKE $${paramIdx} OR
        p.curp ILIKE $${paramIdx}
      )`;
      params.push(`%${buscar}%`);
      paramIdx++;
    }

    if (expediente) {
      query += ` AND p.expediente_clinico = $${paramIdx}`;
      params.push(expediente);
      paramIdx++;
    }

    if (curp) {
      query += ` AND p.curp = $${paramIdx}`;
      params.push(curp);
      paramIdx++;
    }

    query += ' ORDER BY p.created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al buscar pacientes:', err);
    res.status(500).json({ success: false, error: 'Error al buscar pacientes' });
  }
});

// GET /api/pacientes/dashboard/estadisticas — Métricas y pacientes catalogados por área para el inicio
router.get('/dashboard/estadisticas', async (req: AuthRequest, res: Response) => {
  try {
    const statsQuery = `
      WITH ultimos_activos AS (
        SELECT DISTINCT ON (id_paciente) *
        FROM encuentro
        WHERE estatus = 'activo'
        ORDER BY id_paciente, fecha_hora_ingreso DESC
      )
      SELECT 
        (SELECT COUNT(*) FROM paciente)::int as total_pacientes,
        (SELECT COUNT(*) FROM ultimos_activos)::int as total_activos,
        (SELECT COUNT(*) FROM ultimos_activos WHERE area_ingreso = 'urgencias')::int as urgencias_activas,
        (SELECT COUNT(*) FROM ultimos_activos WHERE area_ingreso = 'hospitalizacion')::int as hosp_activas,
        (SELECT COUNT(*) FROM ultimos_activos WHERE area_ingreso IN ('tococirugia', 'obstetricia'))::int as toco_activas,
        (SELECT COUNT(*) FROM ultimos_activos WHERE area_ingreso = 'admision')::int as admision_activas
    `;
    const activosQuery = `
      SELECT e.id_encuentro, e.area_ingreso, e.servicio_actual, e.cama_asignada, e.estatus, e.fecha_hora_ingreso,
             p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, p.expediente_clinico, p.sexo, p.fecha_nacimiento, p.curp
      FROM (
        SELECT DISTINCT ON (id_paciente) *
        FROM encuentro
        WHERE estatus = 'activo'
        ORDER BY id_paciente, fecha_hora_ingreso DESC
      ) e
      JOIN paciente p ON e.id_paciente = p.id_paciente
      ORDER BY e.fecha_hora_ingreso DESC
    `;
    const recientesQuery = `
      SELECT e.id_encuentro, e.area_ingreso, e.servicio_actual, e.cama_asignada, e.estatus, e.fecha_hora_ingreso,
             p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, p.expediente_clinico, p.sexo, p.fecha_nacimiento
      FROM encuentro e
      JOIN paciente p ON e.id_paciente = p.id_paciente
      ORDER BY e.fecha_hora_ingreso DESC
      LIMIT 5
    `;

    const [statsResult, activosResult, recientesResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(activosQuery),
      pool.query(recientesQuery)
    ]);

    res.json({
      success: true,
      data: {
        metricas: statsResult.rows[0] || {
          total_pacientes: 0,
          total_activos: 0,
          urgencias_activas: 0,
          hosp_activas: 0,
          toco_activas: 0,
          admision_activas: 0,
        },
        pacientes_activos: activosResult.rows,
        recientes: recientesResult.rows
      }
    });
  } catch (err) {
    console.error('Error al obtener estadísticas del dashboard:', err);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
});

// GET /api/pacientes/area/:areaId — Pacientes catalogados por área clínica específica o censo total
router.get('/area/:areaId', async (req: AuthRequest, res: Response) => {
  const { areaId } = req.params;
  const buscar = (req.query.buscar as string || '').trim();

  try {
    const conteoQuery = `
      SELECT 
        COUNT(*) as todas,
        COUNT(*) FILTER (WHERE area_ingreso = 'urgencias') as urgencias,
        COUNT(*) FILTER (WHERE area_ingreso = 'hospitalizacion') as hospitalizacion,
        COUNT(*) FILTER (WHERE area_ingreso IN ('tococirugia', 'obstetricia')) as toco,
        COUNT(*) FILTER (WHERE area_ingreso = 'admision') as admision,
        COUNT(*) FILTER (WHERE area_ingreso = 'consulta_externa') as consulta_externa,
        COUNT(*) FILTER (WHERE area_ingreso = 'pediatria' OR servicio_actual ILIKE '%pediat%') as pediatria
      FROM (
        SELECT DISTINCT ON (e_inner.id_paciente)
          e_inner.*
        FROM encuentro e_inner
        WHERE e_inner.estatus = 'activo'
        ORDER BY e_inner.id_paciente, e_inner.fecha_hora_ingreso DESC
      ) e
      JOIN paciente p ON e.id_paciente = p.id_paciente
    `;

    let areaCondition = '';
    const cleanArea = areaId.toLowerCase().replace('-', '_');

    if (cleanArea === 'todas' || cleanArea === 'todas_las_areas' || cleanArea === 'censo') {
      areaCondition = '';
    } else if (cleanArea === 'urgencias') {
      areaCondition = " AND e.area_ingreso = 'urgencias'";
    } else if (cleanArea === 'hospitalizacion') {
      areaCondition = " AND e.area_ingreso = 'hospitalizacion'";
    } else if (cleanArea === 'tococirugia' || cleanArea === 'obstetricia' || cleanArea === 'toco') {
      areaCondition = " AND e.area_ingreso IN ('tococirugia', 'obstetricia')";
    } else if (cleanArea === 'admision') {
      areaCondition = " AND e.area_ingreso = 'admision'";
    } else if (cleanArea === 'consulta_externa' || cleanArea === 'consulta') {
      areaCondition = " AND e.area_ingreso = 'consulta_externa'";
    } else if (cleanArea === 'pediatria') {
      areaCondition = " AND (e.area_ingreso = 'pediatria' OR e.servicio_actual ILIKE '%pediat%')";
    } else {
      areaCondition = " AND e.area_ingreso = $areaParam";
    }

    const queryParams: any[] = [];
    let paramIndex = 1;

    let searchCondition = '';
    if (buscar) {
      searchCondition = ` AND (
        p.nombre ILIKE $${paramIndex} 
        OR p.apellido_paterno ILIKE $${paramIndex} 
        OR p.apellido_materno ILIKE $${paramIndex} 
        OR p.expediente_clinico ILIKE $${paramIndex} 
        OR p.curp ILIKE $${paramIndex} 
        OR e.cama_asignada ILIKE $${paramIndex}
        OR e.servicio_actual ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${buscar}%`);
      paramIndex++;
    }

    if (areaCondition.includes('$areaParam')) {
      areaCondition = areaCondition.replace('$areaParam', `$${paramIndex}`);
      queryParams.push(cleanArea);
      paramIndex++;
    }

    const pacientesQuery = `
      SELECT e.id_encuentro, e.area_ingreso, e.servicio_actual, e.cama_asignada, e.estatus, e.fecha_hora_ingreso,
             p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, p.expediente_clinico, p.curp, p.sexo, p.fecha_nacimiento, p.telefono,
             NULLIF(TRIM(CONCAT(pm.nombre, ' ', pm.apellido_paterno)), '') as medico_responsable
      FROM (
        SELECT DISTINCT ON (e_inner.id_paciente)
          e_inner.*
        FROM encuentro e_inner
        WHERE e_inner.estatus = 'activo'
        ORDER BY e_inner.id_paciente, e_inner.fecha_hora_ingreso DESC
      ) e
      JOIN paciente p ON e.id_paciente = p.id_paciente
      LEFT JOIN personal_medico pm ON e.id_medico_responsable = pm.id_medico
      WHERE 1=1 ${areaCondition} ${searchCondition}
      ORDER BY e.fecha_hora_ingreso DESC
    `;

    const [conteoRes, pacientesRes] = await Promise.all([
      pool.query(conteoQuery),
      pool.query(pacientesQuery, queryParams)
    ]);

    const conteos = conteoRes.rows[0] || {
      todas: 0,
      urgencias: 0,
      hospitalizacion: 0,
      toco: 0,
      admision: 0,
      consulta_externa: 0,
      pediatria: 0,
    };

    res.json({
      success: true,
      data: {
        area_consultada: cleanArea,
        conteos: {
          todas: Number(conteos.todas || 0),
          urgencias: Number(conteos.urgencias || 0),
          hospitalizacion: Number(conteos.hospitalizacion || 0),
          tococirugia: Number(conteos.toco || 0),
          admision: Number(conteos.admision || 0),
          consulta_externa: Number(conteos.consulta_externa || 0),
          pediatria: Number(conteos.pediatria || 0),
        },
        total: pacientesRes.rows.length,
        pacientes: pacientesRes.rows
      }
    });
  } catch (err) {
    console.error('Error al obtener pacientes por área:', err);
    res.status(500).json({ success: false, error: 'Error al obtener pacientes por área' });
  }
});

router.get('/camas', async (req: AuthRequest, res: Response) => {
  const { area = 'hospitalizacion', tipo = 'todas', estado = 'todas' } = req.query;

  try {
    await pool.query(`
      UPDATE cama c
      SET estado = 'ocupada',
          id_encuentro_actual = e.id_encuentro,
          updated_at = NOW()
      FROM encuentro e
      WHERE e.estatus = 'activo'
        AND (e.cama_asignada = c.numero OR e.cama_asignada = REPLACE(c.numero, 'Cama ', ''))
        AND (c.estado != 'ocupada' OR c.id_encuentro_actual IS DISTINCT FROM e.id_encuentro)
    `);

    await pool.query(`
      UPDATE cama c
      SET estado = 'disponible',
          id_encuentro_actual = NULL,
          updated_at = NOW()
      WHERE c.estado = 'ocupada'
        AND NOT EXISTS (
          SELECT 1 FROM encuentro e
          WHERE e.estatus = 'activo'
            AND (e.cama_asignada = c.numero OR e.cama_asignada = REPLACE(c.numero, 'Cama ', ''))
        )
    `);

    const queryParams: any[] = [];
    let whereSql = 'WHERE 1=1';

    if (area && area !== 'todas') {
      queryParams.push(area);
      whereSql += ` AND c.area = $${queryParams.length}`;
    }

    if (tipo === 'censable') {
      whereSql += ' AND c.es_censable = TRUE';
    } else if (tipo === 'no_censable') {
      whereSql += ' AND c.es_censable = FALSE';
    }

    if (estado === 'disponible') {
      whereSql += " AND c.estado = 'disponible'";
    } else if (estado === 'ocupada') {
      whereSql += " AND c.estado = 'ocupada'";
    }

    const bedsQuery = `
      SELECT c.id_cama, c.numero, c.area, c.es_censable, c.estado, c.tipo, c.descripcion,
             e.id_encuentro, e.servicio_actual, e.fecha_hora_ingreso,
             p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, p.expediente_clinico
      FROM cama c
      LEFT JOIN encuentro e ON c.id_encuentro_actual = e.id_encuentro
      LEFT JOIN paciente p ON e.id_paciente = p.id_paciente
      ${whereSql}
      ORDER BY c.es_censable DESC, c.numero ASC
    `;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_camas,
        COUNT(*) FILTER (WHERE es_censable = TRUE) as censables_total,
        COUNT(*) FILTER (WHERE es_censable = TRUE AND estado = 'disponible') as censables_disponibles,
        COUNT(*) FILTER (WHERE es_censable = TRUE AND estado = 'ocupada') as censables_ocupadas,
        COUNT(*) FILTER (WHERE es_censable = FALSE) as no_censables_total,
        COUNT(*) FILTER (WHERE es_censable = FALSE AND estado = 'disponible') as no_censables_disponibles,
        COUNT(*) FILTER (WHERE es_censable = FALSE AND estado = 'ocupada') as no_censables_ocupadas,
        COUNT(*) FILTER (WHERE estado = 'disponible') as total_disponibles,
        COUNT(*) FILTER (WHERE estado = 'ocupada') as total_ocupadas
      FROM cama
      WHERE ($1::text = 'todas' OR area = $1)
    `;

    const [bedsRes, statsRes] = await Promise.all([
      pool.query(bedsQuery, queryParams),
      pool.query(statsQuery, [area || 'hospitalizacion']),
    ]);

    const stats = statsRes.rows[0] || {};

    res.json({
      success: true,
      data: {
        camas: bedsRes.rows,
        resumen: {
          total_camas: parseInt(stats.total_camas || '0', 10),
          censables_total: parseInt(stats.censables_total || '0', 10),
          censables_disponibles: parseInt(stats.censables_disponibles || '0', 10),
          censables_ocupadas: parseInt(stats.censables_ocupadas || '0', 10),
          no_censables_total: parseInt(stats.no_censables_total || '0', 10),
          no_censables_disponibles: parseInt(stats.no_censables_disponibles || '0', 10),
          no_censables_ocupadas: parseInt(stats.no_censables_ocupadas || '0', 10),
          total_disponibles: parseInt(stats.total_disponibles || '0', 10),
          total_ocupadas: parseInt(stats.total_ocupadas || '0', 10),
        },
      },
    });
  } catch (err: any) {
    console.error('Error al consultar camas:', err);
    res.status(500).json({ success: false, error: 'Error al consultar catálogo de camas' });
  }
});

router.post('/camas/:id/asignar', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { id_encuentro } = req.body;

  if (!id_encuentro) {
    return res.status(400).json({ success: false, error: 'Debe especificar el id del encuentro activo' });
  }

  try {
    const camaRes = await pool.query('SELECT * FROM cama WHERE id_cama = $1', [id]);
    if (camaRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cama no encontrada' });
    }
    const cama = camaRes.rows[0];

    await pool.query(
      'UPDATE encuentro SET cama_asignada = $1 WHERE id_encuentro = $2',
      [cama.numero, id_encuentro]
    );

    await pool.query(
      "UPDATE cama SET estado = 'ocupada', id_encuentro_actual = $1, updated_at = NOW() WHERE id_cama = $2",
      [id_encuentro, id]
    );

    await logAudit(req, 'ASSIGN_BED', 'cama', parseInt(id, 10), null, { id_encuentro, cama: cama.numero });

    res.json({ success: true, message: `Cama ${cama.numero} asignada exitosamente.` });
  } catch (err: any) {
    console.error('Error al asignar cama:', err);
    res.status(500).json({ success: false, error: 'Error al asignar cama' });
  }
});

router.post('/camas/:id/liberar', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const camaRes = await pool.query('SELECT * FROM cama WHERE id_cama = $1', [id]);
    if (camaRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cama no encontrada' });
    }
    const cama = camaRes.rows[0];

    if (cama.id_encuentro_actual) {
      await pool.query(
        'UPDATE encuentro SET cama_asignada = NULL WHERE id_encuentro = $1',
        [cama.id_encuentro_actual]
      );
    }

    await pool.query(
      "UPDATE cama SET estado = 'disponible', id_encuentro_actual = NULL, updated_at = NOW() WHERE id_cama = $1",
      [id]
    );

    await logAudit(req, 'RELEASE_BED', 'cama', parseInt(id, 10), null, { cama: cama.numero });

    res.json({ success: true, message: `Cama ${cama.numero} liberada exitosamente.` });
  } catch (err: any) {
    console.error('Error al liberar cama:', err);
    res.status(500).json({ success: false, error: 'Error al liberar cama' });
  }
});

// GET /api/pacientes/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM paciente WHERE id_paciente = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener paciente:', err);
    res.status(500).json({ success: false, error: 'Error al obtener paciente' });
  }
});

// POST /api/pacientes — Crear nuevo paciente (Admisión)
router.post('/', authorize('admin', 'admision', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const esRecienNacido = Boolean(data.es_recien_nacido_sin_curp);

  if (!data.fecha_nacimiento || !data.sexo) {
    return res.status(400).json({
      success: false,
      error: 'Campos requeridos: fecha_nacimiento y sexo',
    });
  }

  // En modo normal (sin casilla de recién nacido/bebé sin registro), exigir CURP, nombre y apellido paterno
  if (!esRecienNacido && (!data.curp || !data.nombre || !data.apellido_paterno)) {
    return res.status(400).json({
      success: false,
      error: 'Para registro ordinario son obligatorios: CURP, Nombre(s) y Apellido Paterno. Si es un bebé sin registro/CURP, active la casilla de Recién Nacido.',
    });
  }

  if (data.curp && !validarCURP(data.curp)) {
    return res.status(400).json({ success: false, error: 'CURP con formato inválido' });
  }

  if (data.nombre && !soloTextoValido(data.nombre)) {
    return res.status(400).json({ success: false, error: 'El nombre solo debe contener letras (sin números)' });
  }
  if (data.apellido_paterno && !soloTextoValido(data.apellido_paterno)) {
    return res.status(400).json({ success: false, error: 'El apellido paterno solo debe contener letras (sin números)' });
  }
  if (data.apellido_materno && !soloTextoValido(data.apellido_materno)) {
    return res.status(400).json({ success: false, error: 'El apellido materno solo debe contener letras (sin números)' });
  }
  if (data.telefono && !soloTelefonoValido(data.telefono)) {
    return res.status(400).json({ success: false, error: 'El teléfono debe contener únicamente 10 dígitos numéricos' });
  }
  if (data.contacto_emergencia_telefono && !soloTelefonoValido(data.contacto_emergencia_telefono)) {
    return res.status(400).json({ success: false, error: 'El teléfono de emergencia debe contener únicamente 10 dígitos numéricos' });
  }
  if (data.contacto_emergencia_nombre && !soloTextoValido(data.contacto_emergencia_nombre)) {
    return res.status(400).json({ success: false, error: 'El nombre del contacto de emergencia solo debe contener letras (sin números)' });
  }
  if (data.lugar_nacimiento && !soloTextoValido(data.lugar_nacimiento)) {
    return res.status(400).json({ success: false, error: 'El lugar de nacimiento solo debe contener texto (sin números)' });
  }

  const prefijoSexo = data.sexo === 'M' ? 'RN MASCULINO' : 'RN FEMENINO';
  const esUnico = !data.numero_producto || ['hijo único', 'hijo unico', 'producto único', 'producto unico'].includes(String(data.numero_producto).trim().toLowerCase());
  const numProducto = !esUnico ? ` (${String(data.numero_producto).trim().toUpperCase()})` : '';
  const nombreMadre = data.madre_nombre ? String(data.madre_nombre).trim().toUpperCase() : '';

  const nombreFinal = (data.nombre && String(data.nombre).trim())
    ? String(data.nombre).trim()
    : nombreMadre
      ? `RN HIJO(A) DE ${nombreMadre}${numProducto}`
      : `${prefijoSexo}${numProducto}`;

  const apellidoPaternoFinal = (data.apellido_paterno && String(data.apellido_paterno).trim())
    ? String(data.apellido_paterno).trim()
    : (data.madre_apellido_paterno && String(data.madre_apellido_paterno).trim())
      ? String(data.madre_apellido_paterno).trim()
      : 'SIN REGISTRO CIVIL';

  const apellidoMaternoFinal = (data.apellido_materno && String(data.apellido_materno).trim())
    ? String(data.apellido_materno).trim()
    : (data.madre_apellido_materno && String(data.madre_apellido_materno).trim())
      ? String(data.madre_apellido_materno).trim()
      : null;

  try {
    const expediente = data.expediente_clinico || await generarExpediente();
    const toInt = (v: any, def: number | null = null) => {
      if (v === undefined || v === null || v === '') return def;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? def : n;
    };
    const toBool = (v: any, def: boolean = false) => {
      if (typeof v === 'boolean') return v;
      if (v === undefined || v === null || v === '') return def;
      const s = String(v).trim().toLowerCase();
      if (['true', '1', 'si', 'sí', 'positivo'].includes(s)) return true;
      if (['false', '0', 'no', 'negado', 'negada', 'negativo'].includes(s)) return false;
      return Boolean(v);
    };

    const result = await pool.query(
      `INSERT INTO paciente (
        expediente_clinico, curp, nombre, apellido_paterno, apellido_materno,
        fecha_nacimiento, sexo, domicilio, telefono, lugar_nacimiento,
        ocupacion, estado_civil, religion, escolaridad,
        contacto_emergencia_nombre, contacto_emergencia_parentesco, contacto_emergencia_telefono,
        con_quien_habita, material_construccion, servicios_agua, servicios_luz, servicios_drenaje,
        num_personas_cohabitan, zoonosis,
        antecedentes_heredofamiliares, tabaquismo, alcoholismo, farmacodependencia,
        grupo_sanguineo, rh, alergias, antecedentes_quirurgicos, antecedentes_transfusionales,
        menarca, ritmo_menstrual, ivsa, num_parejas,
        citologia_cervical, autoexploracion_mamaria, metodo_planificacion_familiar,
        fecha_ultima_menstruacion, fecha_probable_parto, fecha_ultimo_parto,
        gesta, para, cesarea, aborto, num_controles_prenatales, lugar_control, hijos_vivos,
        created_by,
        tutor_nombre, tutor_parentesco, tutor_telefono
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51,
        $52, $53, $54
      ) RETURNING *`,
      [
        expediente, esRecienNacido ? null : (data.curp || null), nombreFinal, apellidoPaternoFinal, apellidoMaternoFinal,
        data.fecha_nacimiento, data.sexo, data.domicilio || null, data.telefono || null,
        data.lugar_nacimiento || (esRecienNacido ? (data.condicion_nacimiento || 'Recién Nacido') : null),
        data.ocupacion || (esRecienNacido ? 'Recién Nacido (Sin CURP)' : null),
        data.estado_civil || null,
        data.religion || null, data.escolaridad || null,
        data.contacto_emergencia_nombre || null, data.contacto_emergencia_parentesco || null,
        data.contacto_emergencia_telefono || null,
        data.con_quien_habita || null, data.material_construccion || null,
        toBool(data.servicios_agua, false), toBool(data.servicios_luz, false), toBool(data.servicios_drenaje, false),
        toInt(data.num_personas_cohabitan, null), data.zoonosis !== undefined && data.zoonosis !== null ? String(data.zoonosis) : null,
        data.antecedentes_heredofamiliares || null,
        toBool(data.tabaquismo, false), toBool(data.alcoholismo, false), toBool(data.farmacodependencia, false),
        data.grupo_sanguineo || null, data.rh || null, data.alergias || null,
        data.antecedentes_quirurgicos || null, data.antecedentes_transfusionales || null,
        toInt(data.menarca, null), data.ritmo_menstrual || null, toInt(data.ivsa, null),
        toInt(data.num_parejas, null), toBool(data.citologia_cervical, false),
        toBool(data.autoexploracion_mamaria, false), data.metodo_planificacion_familiar || null,
        data.fecha_ultima_menstruacion || null, data.fecha_probable_parto || null,
        data.fecha_ultimo_parto || null,
        toInt(data.gesta, 0), toInt(data.para, 0), toInt(data.cesarea, 0), toInt(data.aborto, 0),
        toInt(data.num_controles_prenatales, 0), data.lugar_control || null, toInt(data.hijos_vivos, 0),
        req.user!.id_usuario,
        data.tutor_nombre || data.contacto_emergencia_nombre || null,
        data.tutor_parentesco || data.contacto_emergencia_parentesco || null,
        data.tutor_telefono || data.contacto_emergencia_telefono || null,
      ]
    );

    const paciente = result.rows[0];

    await logAudit(req, 'INSERT', 'paciente', paciente.id_paciente, null, paciente);

    res.status(201).json({ success: true, data: paciente });
  } catch (err: any) {
    console.error('Error al crear paciente:', err);
    if (err.code === '23505') {
      // Unique violation
      if (err.constraint?.includes('curp')) {
        return res.status(409).json({ success: false, error: 'Ya existe un paciente con esa CURP' });
      }
      if (err.constraint?.includes('expediente')) {
        return res.status(409).json({ success: false, error: 'Error de duplicidad de expediente' });
      }
    }
    res.status(500).json({ success: false, error: 'Error al crear paciente' });
  }
});

// PUT /api/pacientes/:id — Actualizar datos del paciente
router.put('/:id', authorize('admin', 'admision', 'medico'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // Obtener datos actuales para auditoría
    const current = await pool.query('SELECT * FROM paciente WHERE id_paciente = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    const curpVal = data.curp ? String(data.curp).trim().toUpperCase() : null;
    if (curpVal && !validarCURP(curpVal)) {
      return res.status(400).json({ success: false, error: 'CURP con formato inválido (18 caracteres)' });
    }

    if (data.nombre && !soloTextoValido(data.nombre)) {
      return res.status(400).json({ success: false, error: 'El nombre solo debe contener letras (sin números)' });
    }
    if (data.apellido_paterno && !soloTextoValido(data.apellido_paterno)) {
      return res.status(400).json({ success: false, error: 'El apellido paterno solo debe contener letras (sin números)' });
    }
    if (data.apellido_materno && !soloTextoValido(data.apellido_materno)) {
      return res.status(400).json({ success: false, error: 'El apellido materno solo debe contener letras (sin números)' });
    }
    if (data.telefono && !soloTelefonoValido(data.telefono)) {
      return res.status(400).json({ success: false, error: 'El teléfono debe contener únicamente 10 dígitos numéricos' });
    }
    if (data.contacto_emergencia_telefono && !soloTelefonoValido(data.contacto_emergencia_telefono)) {
      return res.status(400).json({ success: false, error: 'El teléfono de emergencia debe contener únicamente 10 dígitos numéricos' });
    }
    if (data.contacto_emergencia_nombre && !soloTextoValido(data.contacto_emergencia_nombre)) {
      return res.status(400).json({ success: false, error: 'El nombre del contacto de emergencia solo debe contener letras (sin números)' });
    }
    if (data.lugar_nacimiento && !soloTextoValido(data.lugar_nacimiento)) {
      return res.status(400).json({ success: false, error: 'El lugar de nacimiento solo debe contener texto (sin números)' });
    }

    const toIntOrNull = (v: any) => {
      if (v === undefined || v === null || v === '') return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };
    const toBoolOrNull = (v: any) => {
      if (typeof v === 'boolean') return v;
      if (v === undefined || v === null || v === '') return null;
      const s = String(v).trim().toLowerCase();
      if (['true', '1', 'si', 'sí', 'positivo'].includes(s)) return true;
      if (['false', '0', 'no', 'negado', 'negada', 'negativo'].includes(s)) return false;
      return Boolean(v);
    };
    const toDateOrNull = (v: any) => (v !== undefined && v !== null && v !== '' ? v : null);

    const result = await pool.query(
      `UPDATE paciente SET
        curp = $2,
        nombre = COALESCE($3, nombre),
        apellido_paterno = COALESCE($4, apellido_paterno),
        apellido_materno = $5,
        fecha_nacimiento = COALESCE($6, fecha_nacimiento),
        sexo = COALESCE($7, sexo),
        domicilio = $8,
        telefono = $9,
        lugar_nacimiento = $10,
        ocupacion = $11,
        estado_civil = $12,
        religion = COALESCE($13, religion),
        escolaridad = COALESCE($14, escolaridad),
        contacto_emergencia_nombre = $15,
        contacto_emergencia_parentesco = $16,
        contacto_emergencia_telefono = $17,
        con_quien_habita = COALESCE($18, con_quien_habita),
        material_construccion = COALESCE($19, material_construccion),
        servicios_agua = COALESCE($20, servicios_agua),
        servicios_luz = COALESCE($21, servicios_luz),
        servicios_drenaje = COALESCE($22, servicios_drenaje),
        num_personas_cohabitan = COALESCE($23, num_personas_cohabitan),
        zoonosis = COALESCE($24, zoonosis),
        antecedentes_heredofamiliares = COALESCE($25, antecedentes_heredofamiliares),
        tabaquismo = COALESCE($26, tabaquismo),
        alcoholismo = COALESCE($27, alcoholismo),
        farmacodependencia = COALESCE($28, farmacodependencia),
        grupo_sanguineo = COALESCE($29, grupo_sanguineo),
        rh = COALESCE($30, rh),
        alergias = COALESCE($31, alergias),
        antecedentes_quirurgicos = COALESCE($32, antecedentes_quirurgicos),
        antecedentes_transfusionales = COALESCE($33, antecedentes_transfusionales),
        tutor_nombre = COALESCE($34, $15, tutor_nombre),
        tutor_parentesco = COALESCE($35, $16, tutor_parentesco),
        tutor_telefono = COALESCE($36, $17, tutor_telefono),
        menarca = COALESCE($37, menarca),
        ritmo_menstrual = COALESCE($38, ritmo_menstrual),
        ivsa = COALESCE($39, ivsa),
        num_parejas = COALESCE($40, num_parejas),
        citologia_cervical = COALESCE($41, citologia_cervical),
        autoexploracion_mamaria = COALESCE($42, autoexploracion_mamaria),
        metodo_planificacion_familiar = COALESCE($43, metodo_planificacion_familiar),
        fecha_ultima_menstruacion = COALESCE($44, fecha_ultima_menstruacion),
        fecha_probable_parto = COALESCE($45, fecha_probable_parto),
        fecha_ultimo_parto = COALESCE($46, fecha_ultimo_parto),
        gesta = COALESCE($47, gesta),
        para = COALESCE($48, para),
        cesarea = COALESCE($49, cesarea),
        aborto = COALESCE($50, aborto),
        num_controles_prenatales = COALESCE($51, num_controles_prenatales),
        lugar_control = COALESCE($52, lugar_control),
        hijos_vivos = COALESCE($53, hijos_vivos),
        updated_at = NOW()
       WHERE id_paciente = $1
       RETURNING *`,
      [
        id,
        curpVal,
        data.nombre || current.rows[0].nombre,
        data.apellido_paterno || current.rows[0].apellido_paterno,
        data.apellido_materno !== undefined ? data.apellido_materno : current.rows[0].apellido_materno,
        data.fecha_nacimiento || current.rows[0].fecha_nacimiento,
        data.sexo || current.rows[0].sexo,
        data.domicilio !== undefined ? data.domicilio : current.rows[0].domicilio,
        data.telefono !== undefined ? data.telefono : current.rows[0].telefono,
        data.lugar_nacimiento !== undefined ? data.lugar_nacimiento : current.rows[0].lugar_nacimiento,
        data.ocupacion !== undefined ? data.ocupacion : current.rows[0].ocupacion,
        data.estado_civil !== undefined ? data.estado_civil : current.rows[0].estado_civil,
        data.religion !== undefined ? data.religion : current.rows[0].religion,
        data.escolaridad !== undefined ? data.escolaridad : current.rows[0].escolaridad,
        data.contacto_emergencia_nombre !== undefined ? data.contacto_emergencia_nombre : current.rows[0].contacto_emergencia_nombre,
        data.contacto_emergencia_parentesco !== undefined ? data.contacto_emergencia_parentesco : current.rows[0].contacto_emergencia_parentesco,
        data.contacto_emergencia_telefono !== undefined ? data.contacto_emergencia_telefono : current.rows[0].contacto_emergencia_telefono,
        data.con_quien_habita !== undefined ? data.con_quien_habita : current.rows[0].con_quien_habita,
        data.material_construccion !== undefined ? data.material_construccion : current.rows[0].material_construccion,
        data.servicios_agua !== undefined ? toBoolOrNull(data.servicios_agua) : current.rows[0].servicios_agua,
        data.servicios_luz !== undefined ? toBoolOrNull(data.servicios_luz) : current.rows[0].servicios_luz,
        data.servicios_drenaje !== undefined ? toBoolOrNull(data.servicios_drenaje) : current.rows[0].servicios_drenaje,
        data.num_personas_cohabitan !== undefined ? toIntOrNull(data.num_personas_cohabitan) : current.rows[0].num_personas_cohabitan,
        data.zoonosis !== undefined ? String(data.zoonosis) : current.rows[0].zoonosis,
        data.antecedentes_heredofamiliares !== undefined ? data.antecedentes_heredofamiliares : current.rows[0].antecedentes_heredofamiliares,
        data.tabaquismo !== undefined ? toBoolOrNull(data.tabaquismo) : current.rows[0].tabaquismo,
        data.alcoholismo !== undefined ? toBoolOrNull(data.alcoholismo) : current.rows[0].alcoholismo,
        data.farmacodependencia !== undefined ? toBoolOrNull(data.farmacodependencia) : current.rows[0].farmacodependencia,
        data.grupo_sanguineo !== undefined ? data.grupo_sanguineo : current.rows[0].grupo_sanguineo,
        data.rh !== undefined ? data.rh : current.rows[0].rh,
        data.alergias !== undefined ? data.alergias : current.rows[0].alergias,
        data.antecedentes_quirurgicos !== undefined ? data.antecedentes_quirurgicos : current.rows[0].antecedentes_quirurgicos,
        data.antecedentes_transfusionales !== undefined ? data.antecedentes_transfusionales : current.rows[0].antecedentes_transfusionales,
        data.tutor_nombre !== undefined ? data.tutor_nombre : null,
        data.tutor_parentesco !== undefined ? data.tutor_parentesco : null,
        data.tutor_telefono !== undefined ? data.tutor_telefono : null,
        data.menarca !== undefined ? toIntOrNull(data.menarca) : current.rows[0].menarca,
        data.ritmo_menstrual !== undefined ? data.ritmo_menstrual : current.rows[0].ritmo_menstrual,
        data.ivsa !== undefined ? toIntOrNull(data.ivsa) : current.rows[0].ivsa,
        data.num_parejas !== undefined ? toIntOrNull(data.num_parejas) : current.rows[0].num_parejas,
        data.citologia_cervical !== undefined ? toBoolOrNull(data.citologia_cervical) : current.rows[0].citologia_cervical,
        data.autoexploracion_mamaria !== undefined ? toBoolOrNull(data.autoexploracion_mamaria) : current.rows[0].autoexploracion_mamaria,
        data.metodo_planificacion_familiar !== undefined ? data.metodo_planificacion_familiar : current.rows[0].metodo_planificacion_familiar,
        data.fecha_ultima_menstruacion !== undefined ? toDateOrNull(data.fecha_ultima_menstruacion) : current.rows[0].fecha_ultima_menstruacion,
        data.fecha_probable_parto !== undefined ? toDateOrNull(data.fecha_probable_parto) : current.rows[0].fecha_probable_parto,
        data.fecha_ultimo_parto !== undefined ? toDateOrNull(data.fecha_ultimo_parto) : current.rows[0].fecha_ultimo_parto,
        data.gesta !== undefined ? toIntOrNull(data.gesta) : current.rows[0].gesta,
        data.para !== undefined ? toIntOrNull(data.para) : current.rows[0].para,
        data.cesarea !== undefined ? toIntOrNull(data.cesarea) : current.rows[0].cesarea,
        data.aborto !== undefined ? toIntOrNull(data.aborto) : current.rows[0].aborto,
        data.num_controles_prenatales !== undefined ? toIntOrNull(data.num_controles_prenatales) : current.rows[0].num_controles_prenatales,
        data.lugar_control !== undefined ? data.lugar_control : current.rows[0].lugar_control,
        data.hijos_vivos !== undefined ? toIntOrNull(data.hijos_vivos) : current.rows[0].hijos_vivos,
      ]
    );

    await logAudit(req, 'UPDATE', 'paciente', parseInt(id), current.rows[0], result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('Error al actualizar paciente:', err);
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Ya existe un paciente con esos datos' });
    }
    res.status(500).json({ success: false, error: 'Error al actualizar paciente' });
  }
});

// DELETE /api/pacientes/:id — Eliminar paciente (admin y admisión)
router.delete('/:id', authorize('admin', 'admision'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const pacienteId = parseInt(req.params.id, 10);
    const current = await client.query('SELECT * FROM paciente WHERE id_paciente = $1', [pacienteId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    await client.query('BEGIN');

    // 1. Eliminar recién nacidos donde la madre sea este paciente
    await client.query('DELETE FROM recien_nacido WHERE id_madre = $1', [pacienteId]);

    // 2. Obtener IDs de todos los encuentros del paciente
    const encResult = await client.query('SELECT id_encuentro FROM encuentro WHERE id_paciente = $1', [pacienteId]);
    const encIds = encResult.rows.map(r => r.id_encuentro);

    if (encIds.length > 0) {
      // 3. Eliminar órdenes médicas subordinadas a hojas de indicaciones
      await client.query(`
        DELETE FROM doc_indicacion_orden 
        WHERE id_hoja_indicaciones IN (
          SELECT id_hoja_indicaciones FROM doc_hoja_indicaciones WHERE id_encuentro = ANY($1::int[])
        )
      `, [encIds]);

      // 4. Eliminar todas las tablas que tienen FK hacia encuentro
      const tablasEncuentro = [
        'recien_nacido', 'historia_clinica', 'nota_ingreso', 'nota_urgencias',
        'orden_estudio', 'internamiento', 'indicaciones_medicas', 'partograma',
        'consentimiento_informado', 'nota_evolucion_diaria', 'atencion_parto',
        'interconsulta', 'referencia', 'doc_aviso_privacidad',
        'doc_consentimiento_informado', 'doc_hoja_frontal',
        'doc_historia_clinica_pediatrica', 'doc_hoja_indicaciones',
        'doc_solicitud_gabinete', 'doc_solicitud_laboratorio',
        'doc_hoja_hospitalizacion_sinba14', 'doc_hoja_diaria_urgencias_sinba16',
        'doc_nota_egreso'
      ];

      for (const tabla of tablasEncuentro) {
        await client.query(`DELETE FROM ${tabla} WHERE id_encuentro = ANY($1::int[])`, [encIds]);
      }

      // 5. Eliminar encuentros
      await client.query('DELETE FROM encuentro WHERE id_paciente = $1', [pacienteId]);
    }

    // 6. Eliminar logs de auditoría asociados
    await client.query("DELETE FROM audit_log WHERE tabla = 'paciente' AND id_registro = $1", [pacienteId]);

    // 7. Eliminar el registro del paciente
    await client.query('DELETE FROM paciente WHERE id_paciente = $1', [pacienteId]);

    await client.query('COMMIT');
    await logAudit(req, 'DELETE', 'paciente', pacienteId, current.rows[0], null);

    res.json({ success: true, message: 'Paciente y expediente eliminados correctamente' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar paciente:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar paciente: ' + (err.message || 'Error en base de datos') });
  } finally {
    client.release();
  }
});

// ============================================================
// ENCUNTROS
// ============================================================

// GET /api/pacientes/:id/encuentros — Historial de encuentros de un paciente
router.get('/:id/encuentros', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT e.*, 
              pm.nombre as medico_nombre, 
              pm.apellido_paterno as medico_apellido_paterno, 
              pm.apellido_materno as medico_apellido_materno,
              CONCAT(pm.nombre, ' ', pm.apellido_paterno, COALESCE(' ' || pm.apellido_materno, '')) as medico_responsable,
              pm.cedula_profesional as medico_cedula,
              pm.especialidad
       FROM encuentro e
       LEFT JOIN personal_medico pm ON e.id_medico_responsable = pm.id_medico
       WHERE e.id_paciente = $1
       ORDER BY e.fecha_hora_ingreso DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener encuentros:', err);
    res.status(500).json({ success: false, error: 'Error al obtener encuentros' });
  }
});

// POST /api/pacientes/:id/encuentros — Crear nuevo encuentro
router.post('/:id/encuentros', authorize('admin', 'admision', 'medico'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { area_ingreso, id_medico_responsable } = req.body;

  if (!area_ingreso) {
    return res.status(400).json({ success: false, error: 'area_ingreso es requerida' });
  }

  try {
    // Verificar que el paciente existe
    const paciente = await pool.query('SELECT id_paciente FROM paciente WHERE id_paciente = $1', [id]);
    if (paciente.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO encuentro (id_paciente, area_ingreso, servicio_actual, id_medico_responsable, created_by)
       VALUES ($1, $2, $2, $3, $4)
       RETURNING *`,
      [id, area_ingreso, id_medico_responsable || null, req.user!.id_usuario]
    );

    const encuentro = result.rows[0];
    await logAudit(req, 'INSERT', 'encuentro', encuentro.id_encuentro, null, { id_paciente: id, area_ingreso, id_medico_responsable });

    res.status(201).json({ success: true, data: encuentro });
  } catch (err) {
    console.error('Error al crear encuentro:', err);
    res.status(500).json({ success: false, error: 'Error al crear encuentro' });
  }
});

// PUT /api/encuentros/:id — Actualizar estatus del encuentro (alta, etc.)
router.put('/encuentros/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { estatus, diagnostico_egreso, id_medico_responsable, fecha_hora_alta } = req.body;

  // Normalizar 'egresado' a 'alta' para cumplir con el constraint encuentro_estatus_check ('activo', 'alta', 'referido', 'defuncion')
  const normalizedEstatus = estatus === 'egresado' ? 'alta' : (estatus || null);

  try {
    const current = await pool.query('SELECT * FROM encuentro WHERE id_encuentro = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuentro no encontrado' });
    }

    const result = await pool.query(
      `UPDATE encuentro SET
        estatus = COALESCE($2, estatus),
        diagnostico_egreso = COALESCE($3, diagnostico_egreso),
        id_medico_responsable = CASE WHEN $4::int IS NOT NULL THEN $4::int ELSE id_medico_responsable END,
        fecha_hora_alta = COALESCE($5::timestamptz, CASE WHEN $2 IN ('alta', 'referido', 'defuncion') THEN NOW() ELSE fecha_hora_alta END),
        updated_at = NOW()
       WHERE id_encuentro = $1
       RETURNING *`,
      [
        id,
        normalizedEstatus,
        diagnostico_egreso || null,
        id_medico_responsable !== undefined ? id_medico_responsable : null,
        fecha_hora_alta || null,
      ]
    );

    await logAudit(req, 'UPDATE', 'encuentro', parseInt(id), current.rows[0], result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar encuentro:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar encuentro' });
  }
});

// ============================================================
// TRASLADO INTRAHOSPITALARIO (CON RESTRICCIONES CLÍNICAS)
// ============================================================
const AREAS_CLINICAS = [
  {
    id: 'urgencias_general',
    nombre: 'Urgencias Generales (Choque / Observación)',
    area_base: 'urgencias',
    soloAdultos: true,
    descripcion: 'Atención continua y estabilización de adultos'
  },
  {
    id: 'urgencias_pediatria',
    nombre: 'Urgencias Pediátricas',
    area_base: 'urgencias',
    soloPediatricos: true,
    descripcion: 'Exclusivo pacientes menores de 18 años'
  },
  {
    id: 'hosp_medicina_interna',
    nombre: 'Hospitalización Medicina Interna (Adultos)',
    area_base: 'hospitalizacion',
    soloAdultos: true,
    descripcion: 'Piso de adultos con patología médica'
  },
  {
    id: 'hosp_cirugia',
    nombre: 'Hospitalización Cirugía General (Adultos)',
    area_base: 'hospitalizacion',
    soloAdultos: true,
    descripcion: 'Piso de adultos pre y post quirúrgicos'
  },
  {
    id: 'hosp_pediatria',
    nombre: 'Hospitalización Pediatría',
    area_base: 'pediatria',
    soloPediatricos: true,
    descripcion: 'Piso exclusivo de menores de 18 años'
  },
  {
    id: 'tococirugia',
    nombre: 'Tococirugía (Labor de Parto y Expulsión)',
    area_base: 'tococirugia',
    soloSexo: 'F',
    descripcion: 'Exclusivo pacientes obstétricas femeninas'
  },
  {
    id: 'hosp_ginecologia',
    nombre: 'Hospitalización Ginecología y Maternidad',
    area_base: 'hospitalizacion',
    soloSexo: 'F',
    descripcion: 'Piso exclusivo de mujeres y puerperio'
  },
  {
    id: 'consulta_externa',
    nombre: 'Consulta Externa',
    area_base: 'consulta_externa',
    descripcion: 'Atención médica ambulatoria programada'
  }
];

// GET /api/pacientes/catalogo/areas-hospitalarias
router.get('/catalogo/areas-hospitalarias', (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: AREAS_CLINICAS });
});

// POST /api/pacientes/encuentros/:id/traslado — Registrar traslado intrahospitalario
router.post('/encuentros/:id/traslado', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { area_destino_id, cama_destino, motivo_traslado, medico_autoriza } = req.body;

  if (!area_destino_id || !motivo_traslado) {
    return res.status(400).json({ success: false, error: 'Área de destino y motivo del traslado son obligatorios' });
  }

  const areaDestino = AREAS_CLINICAS.find(a => a.id === area_destino_id);
  if (!areaDestino) {
    return res.status(400).json({ success: false, error: 'Área hospitalaria destino no válida' });
  }

  try {
    // 1. Obtener encuentro y datos del paciente para validar restricciones
    const encQuery = await pool.query(
      `SELECT e.*, p.sexo, p.fecha_nacimiento, p.nombre, p.apellido_paterno
       FROM encuentro e
       JOIN paciente p ON e.id_paciente = p.id_paciente
       WHERE e.id_encuentro = $1`,
      [id]
    );

    if (encQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuentro no encontrado' });
    }

    const enc = encQuery.rows[0];

    // Calcular edad
    let edad = 0;
    if (enc.fecha_nacimiento) {
      const hoy = new Date();
      const nac = new Date(enc.fecha_nacimiento);
      edad = hoy.getFullYear() - nac.getFullYear();
      const m = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    }

    const sexoUpper = (enc.sexo || '').toUpperCase();
    const esMujer = sexoUpper.startsWith('F');
    const esHombre = sexoUpper.startsWith('M');

    // 2. VALIDACIÓN RESTRICCIÓN CLÍNICA DE SEXO
    if (areaDestino.soloSexo === 'F' && !esMujer) {
      return res.status(400).json({
        success: false,
        error: `Restricción Clínica: Un paciente de sexo masculino no puede ser ingresado ni trasladado al área de ${areaDestino.nombre}.`
      });
    }
    if (areaDestino.soloSexo === 'M' && !esHombre) {
      return res.status(400).json({
        success: false,
        error: `Restricción Clínica: Un paciente de sexo femenino no puede ser asignado a un pabellón exclusivo de hombres.`
      });
    }

    // 3. VALIDACIÓN RESTRICCIÓN CLÍNICA DE EDAD (Pediátrico vs Adulto)
    if (areaDestino.soloPediatricos && edad >= 18) {
      return res.status(400).json({
        success: false,
        error: `Restricción Etaria: El paciente es un adulto (${edad} años) y no puede ser trasladado a un área exclusiva de Pediatría.`
      });
    }
    if (areaDestino.soloAdultos && edad < 18) {
      return res.status(400).json({
        success: false,
        error: `Restricción Etaria: El paciente es menor de edad (${edad} años) y por normativa oficial debe ser atendido en Pediatría, no en salas generales de adultos.`
      });
    }

    // 4. Registrar en traslado_intrahospitalario
    const areaOrigenNombre = enc.servicio_actual || enc.area_ingreso;
    const camaOrigen = enc.cama_asignada || 'Sin cama previa';

    await pool.query(
      `INSERT INTO traslado_intrahospitalario 
       (id_encuentro, area_origen, cama_origen, area_destino, cama_destino, motivo_traslado, medico_autoriza, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        areaOrigenNombre,
        camaOrigen,
        areaDestino.nombre,
        cama_destino || null,
        motivo_traslado,
        medico_autoriza || null,
        req.user?.id_usuario || null
      ]
    );

    // 5. Actualizar encuentro con nueva área y cama
    const updateResult = await pool.query(
      `UPDATE encuentro SET
         area_ingreso = $2,
         servicio_actual = $3,
         cama_asignada = $4,
         updated_at = NOW()
       WHERE id_encuentro = $1
       RETURNING *`,
      [id, areaDestino.area_base, areaDestino.nombre, cama_destino || null]
    );

    await logAudit(req, 'UPDATE', 'encuentro_traslado', parseInt(id, 10), enc, updateResult.rows[0]);

    res.json({
      success: true,
      message: `Paciente trasladado exitosamente a ${areaDestino.nombre}`,
      data: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Error al procesar traslado:', err);
    res.status(500).json({ success: false, error: 'Error al procesar el traslado intrahospitalario' });
  }
});

// GET /api/pacientes/encuentros/:id/traslados — Historial de traslados del encuentro
router.get('/encuentros/:id/traslados', async (req: AuthRequest, res: Response) => {
  try {
    const r = await pool.query(
      'SELECT * FROM traslado_intrahospitalario WHERE id_encuentro = $1 ORDER BY fecha_hora DESC',
      [req.params.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al consultar traslados' });
  }
});

// GET /api/encuentros/:id — Obtener un encuentro con datos del paciente
router.get('/encuentros/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT e.*,
              p.nombre, p.apellido_paterno, p.apellido_materno, p.curp,
              p.fecha_nacimiento, p.sexo, p.expediente_clinico,
              pm.nombre as medico_nombre, pm.apellido_paterno as medico_apellido_paterno,
              pm.apellido_materno as medico_apellido_materno,
              CONCAT(pm.nombre, ' ', pm.apellido_paterno, COALESCE(' ' || pm.apellido_materno, '')) as medico_responsable,
              pm.cedula_profesional as medico_cedula, pm.especialidad
       FROM encuentro e
       JOIN paciente p ON e.id_paciente = p.id_paciente
       LEFT JOIN personal_medico pm ON e.id_medico_responsable = pm.id_medico
       WHERE e.id_encuentro = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Encuentro no encontrado' });
    }

    const enc = result.rows[0];
    // Calcular edad
    const hoy = new Date();
    const nacimiento = new Date(enc.fecha_nacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesDiff = hoy.getMonth() - nacimiento.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    enc.edad = edad;

    res.json({ success: true, data: enc });
  } catch (err) {
    console.error('Error al obtener encuentro:', err);
    res.status(500).json({ success: false, error: 'Error al obtener encuentro' });
  }
});

// ============================================================
// HISTORIA CLÍNICA
// ============================================================

// GET /api/encuentros/:id/historia-clinica
router.get('/encuentros/:id/historia-clinica', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM historia_clinica WHERE id_encuentro = $1',
      [req.params.id]
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener historia clínica:', err);
    res.status(500).json({ success: false, error: 'Error al obtener historia clínica' });
  }
});

// POST /api/encuentros/:id/historia-clinica
router.post('/encuentros/:id/historia-clinica', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  if (!data.padecimiento_actual) {
    return res.status(400).json({ success: false, error: 'padecimiento_actual es requerido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO historia_clinica (
        id_encuentro, padecimiento_actual,
        int_sistema_riegenegado, int_sistema_observaciones,
        int_aparato_cardiovascular_niega, int_aparato_cardiovascular_observaciones,
        int_aparato_respiratorio_niega, int_aparato_respiratorio_observaciones,
        int_aparato_digestivo_niega, int_aparato_digestivo_observaciones,
        int_aparato_genitourinario_niega, int_aparato_genitourinario_observaciones,
        int_aparato_neurologico_niega, int_aparato_neurologico_observaciones,
        int_aparato_musculoesqueletico_niega, int_aparato_musculoesqueletico_observaciones,
        int_aparato_piel_anexos_niega, int_aparato_piel_anexos_observaciones,
        int_aparato_endocrino_niega, int_aparato_endocrino_observaciones,
        int_aparato_hematico_niega, int_aparato_hematico_observaciones,
        ef_cabeza, ef_cuello, ef_torax, ef_abdomen, extremidades, ef_pelvis, ef_columna, ef_neurologico,
        temperatura, presion_arterial_sistolica, presion_arterial_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria, peso, talla, saturacion_oxigeno,
        diagnostico, plan_tratamiento,
        registrado_por, medico_cedula,
        antecedentes_heredofamiliares, antecedentes_no_patologicos, antecedentes_patologicos, antecedentes_gineco_obstetricos,
        habitus_exterior, ef_genitales, ef_piel, estudios_previos,
        tipo_interrogatorio, ocupacion, grupo_etnico, tx_previo, tx_actual, pronostico, fecha, hora, medico_nombre
      ) VALUES (
        $1, $2,
        $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42,
        $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59
      ) RETURNING *`,
      [
        req.params.id, data.padecimiento_actual,
        data.int_sistema_riegenegado ?? true, data.int_sistema_observaciones || null,
        data.int_aparato_cardiovascular_niega ?? true, data.int_aparato_cardiovascular_observaciones || null,
        data.int_aparato_respiratorio_niega ?? true, data.int_aparato_respiratorio_observaciones || null,
        data.int_aparato_digestivo_niega ?? true, data.int_aparato_digestivo_observaciones || null,
        data.int_aparato_genitourinario_niega ?? true, data.int_aparato_genitourinario_observaciones || null,
        data.int_aparato_neurologico_niega ?? true, data.int_aparato_neurologico_observaciones || null,
        data.int_aparato_musculoesqueletico_niega ?? true, data.int_aparato_musculoesqueletico_observaciones || null,
        data.int_aparato_piel_anexos_niega ?? true, data.int_aparato_piel_anexos_observaciones || null,
        data.int_aparato_endocrino_niega ?? true, data.int_aparato_endocrino_observaciones || null,
        data.int_aparato_hematico_niega ?? true, data.int_aparato_hematico_observaciones || null,
        data.ef_cabeza || null, data.ef_cuello || null, data.ef_torax || null,
        data.ef_abdomen || null, data.extremidades || null, data.ef_pelvis || null,
        data.ef_columna || null, data.ef_neurologico || null,
        data.temperatura || null, data.presion_arterial_sistolica || null,
        data.presion_arterial_diastolica || null, data.frecuencia_cardiaca || null,
        data.frecuencia_respiratoria || null, data.peso || null, data.talla || null,
        data.saturacion_oxigeno || null,
        data.diagnostico || null, data.plan_tratamiento || null,
        req.user!.id_usuario, data.medico_cedula || null,
        data.antecedentes_heredofamiliares || null,
        data.antecedentes_no_patologicos || null,
        data.antecedentes_patologicos || null,
        data.antecedentes_gineco_obstetricos || null,
        data.habitus_exterior || null,
        data.ef_genitales || null,
        data.ef_piel || null,
        data.estudios_previos || null,
        data.tipo_interrogatorio || 'Directo',
        data.ocupacion || null,
        data.grupo_etnico || null,
        data.tx_previo || null,
        data.tx_actual || null,
        data.pronostico || null,
        data.fecha || null,
        data.hora || null,
        data.medico_nombre || null,
      ]
    );

    const hc = result.rows[0];
    await logAudit(req, 'INSERT', 'historia_clinica', hc.id_historia_clinica, null, { id_encuentro: req.params.id });

    res.status(201).json({ success: true, data: hc });
  } catch (err) {
    console.error('Error al crear historia clínica:', err);
    res.status(500).json({ success: false, error: 'Error al crear historia clínica' });
  }
});

// PUT /api/encuentros/:id/historia-clinica
router.put('/encuentros/:id/historia-clinica', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  try {
    const current = await pool.query(
      'SELECT * FROM historia_clinica WHERE id_encuentro = $1', [req.params.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Historia clínica no encontrada para este encuentro' });
    }

    const result = await pool.query(
      `UPDATE historia_clinica SET
        padecimiento_actual = COALESCE($2, padecimiento_actual),
        int_sistema_riegenegado = COALESCE($3, int_sistema_riegenegado),
        int_sistema_observaciones = COALESCE($4, int_sistema_observaciones),
        int_aparato_cardiovascular_niega = COALESCE($5, int_aparato_cardiovascular_niega),
        int_aparato_cardiovascular_observaciones = COALESCE($6, int_aparato_cardiovascular_observaciones),
        int_aparato_respiratorio_niega = COALESCE($7, int_aparato_respiratorio_niega),
        int_aparato_respiratorio_observaciones = COALESCE($8, int_aparato_respiratorio_observaciones),
        int_aparato_digestivo_niega = COALESCE($9, int_aparato_digestivo_niega),
        int_aparato_digestivo_observaciones = COALESCE($10, int_aparato_digestivo_observaciones),
        int_aparato_genitourinario_niega = COALESCE($11, int_aparato_genitourinario_niega),
        int_aparato_genitourinario_observaciones = COALESCE($12, int_aparato_genitourinario_observaciones),
        int_aparato_neurologico_niega = COALESCE($13, int_aparato_neurologico_niega),
        int_aparato_neurologico_observaciones = COALESCE($14, int_aparato_neurologico_observaciones),
        int_aparato_musculoesqueletico_niega = COALESCE($15, int_aparato_musculoesqueletico_niega),
        int_aparato_musculoesqueletico_observaciones = COALESCE($16, int_aparato_musculoesqueletico_observaciones),
        int_aparato_piel_anexos_niega = COALESCE($17, int_aparato_piel_anexos_niega),
        int_aparato_piel_anexos_observaciones = COALESCE($18, int_aparato_piel_anexos_observaciones),
        int_aparato_endocrino_niega = COALESCE($19, int_aparato_endocrino_niega),
        int_aparato_endocrino_observaciones = COALESCE($20, int_aparato_endocrino_observaciones),
        int_aparato_hematico_niega = COALESCE($21, int_aparato_hematico_niega),
        int_aparato_hematico_observaciones = COALESCE($22, int_aparato_hematico_observaciones),
        ef_cabeza = COALESCE($23, ef_cabeza),
        ef_cuello = COALESCE($24, ef_cuello),
        ef_torax = COALESCE($25, ef_torax),
        ef_abdomen = COALESCE($26, ef_abdomen),
        extremidades = COALESCE($27, extremidades),
        ef_pelvis = COALESCE($28, ef_pelvis),
        ef_columna = COALESCE($29, ef_columna),
        ef_neurologico = COALESCE($30, ef_neurologico),
        temperatura = COALESCE($31, temperatura),
        presion_arterial_sistolica = COALESCE($32, presion_arterial_sistolica),
        presion_arterial_diastolica = COALESCE($33, presion_arterial_diastolica),
        frecuencia_cardiaca = COALESCE($34, frecuencia_cardiaca),
        frecuencia_respiratoria = COALESCE($35, frecuencia_respiratoria),
        peso = COALESCE($36, peso),
        talla = COALESCE($37, talla),
        saturacion_oxigeno = COALESCE($38, saturacion_oxigeno),
        diagnostico = COALESCE($39, diagnostico),
        plan_tratamiento = COALESCE($40, plan_tratamiento),
        antecedentes_heredofamiliares = COALESCE($41, antecedentes_heredofamiliares),
        antecedentes_no_patologicos = COALESCE($42, antecedentes_no_patologicos),
        antecedentes_patologicos = COALESCE($43, antecedentes_patologicos),
        antecedentes_gineco_obstetricos = COALESCE($44, antecedentes_gineco_obstetricos),
        habitus_exterior = COALESCE($45, habitus_exterior),
        ef_genitales = COALESCE($46, ef_genitales),
        ef_piel = COALESCE($47, ef_piel),
        estudios_previos = COALESCE($48, estudios_previos),
        tipo_interrogatorio = COALESCE($49, tipo_interrogatorio),
        ocupacion = COALESCE($50, ocupacion),
        grupo_etnico = COALESCE($51, grupo_etnico),
        tx_previo = COALESCE($52, tx_previo),
        tx_actual = COALESCE($53, tx_actual),
        pronostico = COALESCE($54, pronostico),
        fecha = COALESCE($55, fecha),
        hora = COALESCE($56, hora),
        medico_nombre = COALESCE($57, medico_nombre),
        medico_cedula = COALESCE($58, medico_cedula),
        updated_at = NOW()
       WHERE id_encuentro = $1
       RETURNING *`,
      [
        req.params.id,
        data.padecimiento_actual,
        data.int_sistema_riegenegado, data.int_sistema_observaciones,
        data.int_aparato_cardiovascular_niega, data.int_aparato_cardiovascular_observaciones,
        data.int_aparato_respiratorio_niega, data.int_aparato_respiratorio_observaciones,
        data.int_aparato_digestivo_niega, data.int_aparato_digestivo_observaciones,
        data.int_aparato_genitourinario_niega, data.int_aparato_genitourinario_observaciones,
        data.int_aparato_neurologico_niega, data.int_aparato_neurologico_observaciones,
        data.int_aparato_musculoesqueletico_niega, data.int_aparato_musculoesqueletico_observaciones,
        data.int_aparato_piel_anexos_niega, data.int_aparato_piel_anexos_observaciones,
        data.int_aparato_endocrino_niega, data.int_aparato_endocrino_observaciones,
        data.int_aparato_hematico_niega, data.int_aparato_hematico_observaciones,
        data.ef_cabeza, data.ef_cuello, data.ef_torax, data.ef_abdomen,
        data.extremidades, data.ef_pelvis, data.ef_columna, data.ef_neurologico,
        data.temperatura || null, data.presion_arterial_sistolica || null, data.presion_arterial_diastolica || null,
        data.frecuencia_cardiaca || null, data.frecuencia_respiratoria || null, data.peso || null, data.talla || null,
        data.saturacion_oxigeno || null, data.diagnostico, data.plan_tratamiento,
        data.antecedentes_heredofamiliares, data.antecedentes_no_patologicos,
        data.antecedentes_patologicos, data.antecedentes_gineco_obstetricos,
        data.habitus_exterior, data.ef_genitales, data.ef_piel,
        data.estudios_previos, data.tipo_interrogatorio, data.ocupacion,
        data.grupo_etnico, data.tx_previo, data.tx_actual, data.pronostico,
        data.fecha || null, data.hora || null, data.medico_nombre, data.medico_cedula,
      ]
    );

    await logAudit(req, 'UPDATE', 'historia_clinica', result.rows[0].id_historia_clinica, current.rows[0], result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar historia clínica:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar historia clínica' });
  }
});

// DELETE /api/encuentros/:id/historia-clinica
router.delete('/encuentros/:id/historia-clinica', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  try {
    const current = await pool.query('SELECT * FROM historia_clinica WHERE id_encuentro = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Historia clínica no encontrada' });
    }
    await pool.query('DELETE FROM historia_clinica WHERE id_encuentro = $1', [req.params.id]);
    await logAudit(req, 'DELETE', 'historia_clinica', current.rows[0].id_historia_clinica, current.rows[0], null);
    res.json({ success: true, message: 'Historia clínica eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar historia clínica:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar historia clínica' });
  }
});

// ============================================================
// NOTAS DE URGENCIAS
// ============================================================

// GET /api/encuentros/:id/notas-urgencias
router.get('/encuentros/:id/notas-urgencias', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nota_urgencias WHERE id_encuentro = $1 ORDER BY fecha_hora_registro',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener notas de urgencias:', err);
    res.status(500).json({ success: false, error: 'Error al obtener notas de urgencias' });
  }
});

// POST /api/encuentros/:id/notas-urgencias
router.post('/encuentros/:id/notas-urgencias', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  const evolucionVal = data.evolucion || data.padecimiento_actual || data.motivo_consulta || data.diagnostico || '';
  if (!evolucionVal && !data.motivo_consulta && !data.padecimiento_actual) {
    return res.status(400).json({ success: false, error: 'evolucion o motivo_consulta es requerido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO nota_urgencias (
        id_encuentro, folio, unidad_medica, fecha_registro, hora_registro,
        codigo_triage, triage_color, procedencia, urgencia_calificada_bool,
        responsable_nombre, responsable_parentesco, responsable_domicilio, responsable_telefono,
        fecha_hora_atencion, ta, temp, fr, fc, peso, talla,
        motivo_consulta, antecedentes, padecimiento_actual, ef_urgencias, exploracion_fisica,
        evolucion, estudios_solicitados, resultados_estudios,
        diagnostico, diagnosticos_presuncionales, analisis_pronosticos,
        plan, tratamiento_plan, destino_paciente,
        familiar_nombre, familiar_firma, medico_nombre, medico_cedula, registrado_por
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28,
        $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37, $38, $39
      ) RETURNING *`,
      [
        req.params.id,
        data.folio || null,
        data.unidad_medica || 'Hospital General San Felipe del Progreso',
        data.fecha_registro || null,
        data.hora_registro || null,
        data.codigo_triage || null,
        data.triage_color || null,
        data.procedencia || null,
        data.urgencia_calificada_bool !== undefined ? data.urgencia_calificada_bool : true,
        data.responsable_nombre || null,
        data.responsable_parentesco || null,
        data.responsable_domicilio || null,
        data.responsable_telefono || null,
        data.fecha_hora_atencion || null,
        data.ta || null,
        data.temp || null,
        data.fr || null,
        data.fc || null,
        data.peso || null,
        data.talla || null,
        data.motivo_consulta || null,
        data.antecedentes || null,
        data.padecimiento_actual || null,
        data.ef_urgencias || data.exploracion_fisica || null,
        data.exploracion_fisica || data.ef_urgencias || null,
        evolucionVal || 'Atención inicial de urgencias',
        data.estudios_solicitados || null,
        data.resultados_estudios || data.observaciones_estudios || null,
        data.diagnostico || data.diagnosticos_presuncionales || null,
        data.diagnosticos_presuncionales || data.diagnostico || null,
        data.analisis_pronosticos || null,
        data.plan || data.tratamiento_plan || null,
        data.tratamiento_plan || data.plan || null,
        data.destino_paciente || null,
        data.familiar_nombre || null,
        data.familiar_firma || null,
        data.medico_nombre || null,
        data.medico_cedula || null,
        req.user!.id_usuario,
      ]
    );

    const nota = result.rows[0];
    await logAudit(req, 'INSERT', 'nota_urgencias', nota.id_nota_urgencias, null, { id_encuentro: req.params.id });

    res.status(201).json({ success: true, data: nota });
  } catch (err) {
    console.error('Error al crear nota de urgencias:', err);
    res.status(500).json({ success: false, error: 'Error al crear nota de urgencias' });
  }
});

// PUT /api/notas-urgencias/:id
router.put('/notas-urgencias/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  try {
    const current = await pool.query(
      'SELECT * FROM nota_urgencias WHERE id_nota_urgencias = $1', [req.params.id]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nota no encontrada' });
    }

    const result = await pool.query(
      `UPDATE nota_urgencias SET
        folio = COALESCE($2, folio),
        unidad_medica = COALESCE($3, unidad_medica),
        fecha_registro = COALESCE($4, fecha_registro),
        hora_registro = COALESCE($5, hora_registro),
        codigo_triage = COALESCE($6, codigo_triage),
        triage_color = COALESCE($7, triage_color),
        procedencia = COALESCE($8, procedencia),
        urgencia_calificada_bool = COALESCE($9, urgencia_calificada_bool),
        responsable_nombre = COALESCE($10, responsable_nombre),
        responsable_parentesco = COALESCE($11, responsable_parentesco),
        responsable_domicilio = COALESCE($12, responsable_domicilio),
        responsable_telefono = COALESCE($13, responsable_telefono),
        fecha_hora_atencion = COALESCE($14, fecha_hora_atencion),
        ta = COALESCE($15, ta),
        temp = COALESCE($16, temp),
        fr = COALESCE($17, fr),
        fc = COALESCE($18, fc),
        peso = COALESCE($19, peso),
        talla = COALESCE($20, talla),
        motivo_consulta = COALESCE($21, motivo_consulta),
        antecedentes = COALESCE($22, antecedentes),
        padecimiento_actual = COALESCE($23, padecimiento_actual),
        ef_urgencias = COALESCE($24, ef_urgencias),
        exploracion_fisica = COALESCE($25, exploracion_fisica),
        evolucion = COALESCE($26, evolucion),
        estudios_solicitados = COALESCE($27, estudios_solicitados),
        resultados_estudios = COALESCE($28, resultados_estudios),
        diagnostico = COALESCE($29, diagnostico),
        diagnosticos_presuncionales = COALESCE($30, diagnosticos_presuncionales),
        analisis_pronosticos = COALESCE($31, analisis_pronosticos),
        plan = COALESCE($32, plan),
        tratamiento_plan = COALESCE($33, tratamiento_plan),
        destino_paciente = COALESCE($34, destino_paciente),
        familiar_nombre = COALESCE($35, familiar_nombre),
        familiar_firma = COALESCE($36, familiar_firma),
        medico_nombre = COALESCE($37, medico_nombre),
        medico_cedula = COALESCE($38, medico_cedula),
        updated_at = NOW()
       WHERE id_nota_urgencias = $1
       RETURNING *`,
      [
        req.params.id,
        data.folio || null,
        data.unidad_medica || null,
        data.fecha_registro || null,
        data.hora_registro || null,
        data.codigo_triage || null,
        data.triage_color || null,
        data.procedencia || null,
        data.urgencia_calificada_bool,
        data.responsable_nombre || null,
        data.responsable_parentesco || null,
        data.responsable_domicilio || null,
        data.responsable_telefono || null,
        data.fecha_hora_atencion || null,
        data.ta || null,
        data.temp !== undefined && data.temp !== '' ? data.temp : null,
        data.fr !== undefined && data.fr !== '' ? data.fr : null,
        data.fc !== undefined && data.fc !== '' ? data.fc : null,
        data.peso !== undefined && data.peso !== '' ? data.peso : null,
        data.talla !== undefined && data.talla !== '' ? data.talla : null,
        data.motivo_consulta,
        data.antecedentes,
        data.padecimiento_actual,
        data.ef_urgencias || data.exploracion_fisica,
        data.exploracion_fisica || data.ef_urgencias,
        data.evolucion,
        data.estudios_solicitados,
        data.resultados_estudios || data.observaciones_estudios,
        data.diagnostico || data.diagnosticos_presuncionales,
        data.diagnosticos_presuncionales || data.diagnostico,
        data.analisis_pronosticos,
        data.plan || data.tratamiento_plan,
        data.tratamiento_plan || data.plan,
        data.destino_paciente,
        data.familiar_nombre,
        data.familiar_firma,
        data.medico_nombre,
        data.medico_cedula,
      ]
    );

    await logAudit(req, 'UPDATE', 'nota_urgencias', parseInt(req.params.id), current.rows[0], result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar nota:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar nota' });
  }
});

// DELETE /api/notas-urgencias/:id
router.delete('/notas-urgencias/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const current = await pool.query('SELECT * FROM nota_urgencias WHERE id_nota_urgencias = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nota de urgencias no encontrada' });
    }
    await pool.query('DELETE FROM nota_urgencias WHERE id_nota_urgencias = $1', [req.params.id]);
    await logAudit(req, 'DELETE', 'nota_urgencias', parseInt(req.params.id), current.rows[0], null);
    res.json({ success: true, message: 'Nota de urgencias eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar nota de urgencias:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar nota de urgencias' });
  }
});

// ============================================================
// NOTAS DE INGRESO
// ============================================================

// GET /api/encuentros/:id/nota-ingreso
router.get('/encuentros/:id/nota-ingreso', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nota_ingreso WHERE id_encuentro = $1', [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener nota de ingreso:', err);
    res.status(500).json({ success: false, error: 'Error al obtener nota de ingreso' });
  }
});

// POST /api/encuentros/:id/nota-ingreso
router.post('/encuentros/:id/nota-ingreso', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO nota_ingreso (id_encuentro, subjetivo, objetivo, analisis, plan, registrado_por, medico_cedula)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id_encuentro) DO UPDATE SET
         subjetivo = EXCLUDED.subjetivo,
         objetivo = EXCLUDED.objetivo,
         analisis = EXCLUDED.analisis,
         plan = EXCLUDED.plan,
         medico_cedula = COALESCE(EXCLUDED.medico_cedula, nota_ingreso.medico_cedula),
         updated_at = NOW()
       RETURNING *`,
      [req.params.id, data.subjetivo || null, data.objetivo || null,
       data.analisis || null, data.plan || null,
       req.user!.id_usuario, data.medico_cedula || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear nota de ingreso:', err);
    res.status(500).json({ success: false, error: 'Error al crear nota de ingreso' });
  }
});

// PUT /api/encuentros/:id/nota-ingreso
router.put('/encuentros/:id/nota-ingreso', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  try {
    const result = await pool.query(
      `UPDATE nota_ingreso SET
         subjetivo = COALESCE($2, subjetivo),
         objetivo = COALESCE($3, objetivo),
         analisis = COALESCE($4, analisis),
         plan = COALESCE($5, plan),
         medico_cedula = COALESCE($6, medico_cedula),
         updated_at = NOW()
       WHERE id_encuentro = $1
       RETURNING *`,
      [req.params.id, data.subjetivo || null, data.objetivo || null,
       data.analisis || null, data.plan || null, data.medico_cedula || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nota de ingreso no encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar nota de ingreso:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar nota de ingreso' });
  }
});

// DELETE /api/encuentros/:id/nota-ingreso
router.delete('/encuentros/:id/nota-ingreso', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const current = await pool.query('SELECT * FROM nota_ingreso WHERE id_encuentro = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nota de ingreso no encontrada' });
    }
    await pool.query('DELETE FROM nota_ingreso WHERE id_encuentro = $1', [req.params.id]);
    await logAudit(req, 'DELETE', 'nota_ingreso', current.rows[0].id_nota_ingreso, current.rows[0], null);
    res.json({ success: true, message: 'Nota de ingreso eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar nota de ingreso:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar nota de ingreso' });
  }
});

// ============================================================
// ESTUDIOS / LABORATORIO
// ============================================================

// GET /api/encuentros/:id/estudios
router.get('/encuentros/:id/estudios', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orden_estudio WHERE id_encuentro = $1 ORDER BY fecha_solicitud',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener estudios:', err);
    res.status(500).json({ success: false, error: 'Error al obtener estudios' });
  }
});

// POST /api/encuentros/:id/estudios
router.post('/encuentros/:id/estudios', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  if (!data.tipo_estudio || !data.nombre_estudio) {
    return res.status(400).json({ success: false, error: 'tipo_estudio y nombre_estudio son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orden_estudio (id_encuentro, tipo_estudio, nombre_estudio, indicacion, resultados, solicitado_por, medico_cedula)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, data.tipo_estudio, data.nombre_estudio,
       data.indicacion || null, data.resultados || null,
       req.user!.id_usuario, data.medico_cedula || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear estudio:', err);
    res.status(500).json({ success: false, error: 'Error al crear estudio' });
  }
});

// PUT /api/estudios/:id
router.put('/estudios/:id', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  const data = req.body;

  try {
    const result = await pool.query(
      `UPDATE orden_estudio SET
        resultados = COALESCE($2, resultados),
        fecha_resultado = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE fecha_resultado END,
        updated_at = NOW()
       WHERE id_orden = $1 RETURNING *`,
      [req.params.id, data.resultados || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Estudio no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar estudio:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar estudio' });
  }
});

// ============================================================
// PERSONAL MÉDICO (catálogo)
// ============================================================

// GET /api/pacientes/catalogo/personal-medico
router.get('/catalogo/personal-medico', async (req: AuthRequest, res: Response) => {
  const { area } = req.query;
  try {
    let whereClause = '';
    const queryParams: any[] = [];
    if (area && String(area).trim() && String(area).trim() !== 'todas') {
      whereClause = 'WHERE (pm.area_hospitalizacion ILIKE $1 OR pm.especialidad ILIKE $1)';
      queryParams.push(`%${String(area).trim()}%`);
    }

    const result = await pool.query(
      `SELECT pm.id_medico, pm.nombre, pm.apellido_paterno, pm.apellido_materno, 
              pm.cedula_profesional, pm.especialidad, pm.area_hospitalizacion, pm.id_rol_sistema, pm.activo, pm.created_at,
              u.id_usuario, u.username,
              COALESCE(u.id_rol, pm.id_rol_sistema, 3) as id_rol,
              COALESCE(r.nombre, 'medico') as rol_nombre,
              u.ultimo_acceso
       FROM personal_medico pm
       LEFT JOIN (
         SELECT DISTINCT ON (id_medico) id_usuario, username, id_medico, id_rol, ultimo_acceso 
         FROM usuarios 
         WHERE id_medico IS NOT NULL 
         ORDER BY id_medico, CASE WHEN username IN ('admin', 'admision', 'medico', 'enfermeria') THEN 1 ELSE 2 END, id_usuario ASC
       ) u ON pm.id_medico = u.id_medico
       LEFT JOIN roles r ON COALESCE(u.id_rol, pm.id_rol_sistema) = r.id_rol
       ${whereClause}
       ORDER BY pm.activo DESC, pm.nombre ASC`,
      queryParams
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener personal médico:', err);
    res.status(500).json({ success: false, error: 'Error al obtener personal médico' });
  }
});

router.post('/catalogo/personal-medico', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol, username, password } = req.body;

  if (!nombre?.trim() || !apellido_paterno?.trim() || !cedula_profesional?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Nombre, apellido paterno y cédula profesional son campos obligatorios',
    });
  }

  const rolId = id_rol ? parseInt(String(id_rol), 10) : 3;

  try {
    const existing = await pool.query('SELECT id_medico FROM personal_medico WHERE cedula_profesional = $1', [cedula_profesional.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un miembro del personal registrado con esa cédula profesional' });
    }

    if (username?.trim() && password) {
      const cleanPass = String(password).trim();
      if (cleanPass.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña inicial debe tener un mínimo de 8 caracteres.',
        });
      }
      if (!/[A-Z0-9]/.test(cleanPass)) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe incluir al menos un número o una letra mayúscula.',
        });
      }
    }

    const medResult = await pool.query(
      `INSERT INTO personal_medico (nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol_sistema, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        nombre.trim(),
        apellido_paterno.trim(),
        apellido_materno?.trim() || null,
        cedula_profesional.trim(),
        especialidad?.trim() || 'Medicina General',
        area_hospitalizacion?.trim() || 'Hospitalización General',
        rolId,
      ]
    );

    const medico = medResult.rows[0];
    let usuarioCreado = null;

    if (username?.trim() && password) {
      const userExists = await pool.query('SELECT id_usuario FROM usuarios WHERE username = $1', [username.trim().toLowerCase()]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario para inicio de sesión ya está en uso',
          data: medico,
        });
      }

      const passwordHash = await bcrypt.hash(password.trim(), 10);
      const userResult = await pool.query(
        `INSERT INTO usuarios (username, password_hash, id_medico, id_rol, activo, debe_cambiar_password)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id_usuario, username, id_rol`,
        [username.trim().toLowerCase(), passwordHash, medico.id_medico, rolId]
      );
      usuarioCreado = userResult.rows[0];
    }

    await logAudit(req, 'INSERT', 'personal_medico', medico.id_medico, null, { medico, usuario: usuarioCreado });

    res.status(201).json({
      success: true,
      message: 'Personal registrado exitosamente en la plantilla',
      data: {
        ...medico,
        usuario: usuarioCreado?.username || null,
        id_rol: rolId,
      },
    });
  } catch (err: any) {
    console.error('Error al registrar personal médico:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al registrar personal' });
  }
});

router.put('/catalogo/personal-medico/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad, area_hospitalizacion, id_rol, activo, username, password } = req.body;

  try {
    const current = await pool.query('SELECT * FROM personal_medico WHERE id_medico = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Personal no encontrado' });
    }

    const rolId = id_rol ? parseInt(String(id_rol), 10) : undefined;

    const result = await pool.query(
      `UPDATE personal_medico SET
        nombre = COALESCE($2, nombre),
        apellido_paterno = COALESCE($3, apellido_paterno),
        apellido_materno = COALESCE($4, apellido_materno),
        cedula_profesional = COALESCE($5, cedula_profesional),
        especialidad = COALESCE($6, especialidad),
        area_hospitalizacion = COALESCE($7, area_hospitalizacion),
        id_rol_sistema = COALESCE($8, id_rol_sistema),
        activo = COALESCE($9, activo),
        updated_at = NOW()
       WHERE id_medico = $1
       RETURNING *`,
      [
        id,
        nombre?.trim() || null,
        apellido_paterno?.trim() || null,
        apellido_materno !== undefined ? (apellido_materno ? apellido_materno.trim() : null) : null,
        cedula_profesional?.trim() || null,
        especialidad?.trim() || null,
        area_hospitalizacion?.trim() || null,
        rolId !== undefined ? rolId : null,
        activo !== undefined ? activo : null,
      ]
    );

    if (rolId) {
      await pool.query('UPDATE usuarios SET id_rol = $1 WHERE id_medico = $2', [rolId, id]);
    }

    if (password && password.trim()) {
      const cleanPass = password.trim();
      if (cleanPass.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener un mínimo de 8 caracteres.',
        });
      }
      if (!/[A-Z0-9]/.test(cleanPass)) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe incluir al menos un número o una letra mayúscula.',
        });
      }

      const passwordHash = await bcrypt.hash(cleanPass, 10);
      const userExists = await pool.query('SELECT id_usuario FROM usuarios WHERE id_medico = $1', [id]);
      if (userExists.rows.length > 0) {
        await pool.query('UPDATE usuarios SET password_hash = $1, activo = TRUE, debe_cambiar_password = TRUE WHERE id_medico = $2', [passwordHash, id]);
      } else if (username?.trim()) {
        await pool.query(
          `INSERT INTO usuarios (username, password_hash, id_medico, id_rol, activo, debe_cambiar_password)
           VALUES ($1, $2, $3, $4, TRUE, TRUE)`,
          [username.trim().toLowerCase(), passwordHash, id, rolId || 3]
        );
      }
    }

    await logAudit(req, 'UPDATE', 'personal_medico', parseInt(id, 10), current.rows[0], result.rows[0]);

    res.json({ success: true, message: 'Datos actualizados exitosamente', data: result.rows[0] });
  } catch (err: any) {
    console.error('Error al actualizar personal:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al actualizar personal' });
  }
});

router.post('/catalogo/personal-medico/:id/restablecer-password', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT u.id_usuario, u.username, pm.nombre, pm.apellido_paterno 
       FROM usuarios u
       JOIN personal_medico pm ON u.id_medico = pm.id_medico
       WHERE pm.id_medico = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Este miembro del personal no cuenta con un usuario de inicio de sesión vinculado.',
      });
    }

    const { id_usuario, username, nombre, apellido_paterno } = userResult.rows[0];
    const usernameNorm = username.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(usernameNorm, 10);

    await pool.query(
      `UPDATE usuarios 
       SET password_hash = $1, activo = TRUE, debe_cambiar_password = TRUE 
       WHERE id_usuario = $2`,
      [passwordHash, id_usuario]
    );

    await logAudit(req, 'RESET_PASSWORD', 'usuarios', id_usuario, null, {
      username: usernameNorm,
      motivo: 'Restablecimiento administrativo NOM-004-SSA3-2012 / NOM-024-SSA3-2012',
    });

    // Marcar cualquier solicitud pendiente de este usuario como atendida
    await pool.query(
      `UPDATE solicitudes_password 
       SET estatus = 'atendida', atendido_por = $1, fecha_atencion = NOW() 
       WHERE id_usuario = $2 AND estatus = 'pendiente'`,
      [req.user?.id_usuario || null, id_usuario]
    );

    // Generar notificación directa para el usuario avisándole que su clave fue restablecida
    await pool.query(
      `INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje)
       VALUES ($1, 'password_restablecida', $2, $3)`,
      [
        id_usuario,
        'Contraseña restablecida por administración',
        `La Administración ha restablecido su contraseña a su nombre de usuario provisional (@${usernameNorm}). Puede acceder ingresando este nombre de usuario como contraseña.`,
      ]
    );

    // Marcar las notificaciones del admin asociadas como leídas
    await pool.query(
      `UPDATE notificaciones 
       SET leida = TRUE 
       WHERE para_rol = 'admin' AND titulo LIKE $1`,
      [`%@${usernameNorm}%`]
    );

    res.json({
      success: true,
      message: `Contraseña de @${usernameNorm} restablecida exitosamente a su nombre de usuario.`,
      username: usernameNorm,
      nombreCompleto: `${nombre} ${apellido_paterno}`,
    });
  } catch (err: any) {
    console.error('Error al restablecer contraseña:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al restablecer la contraseña' });
  }
});

// DELETE /api/pacientes/catalogo/personal-medico/:id — Eliminación y Baja de Usuarios / Personal (Exclusivo Administrador)
router.delete('/catalogo/personal-medico/:id', authorize('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar si existe el personal
    const medRes = await client.query('SELECT * FROM personal_medico WHERE id_medico = $1', [id]);
    if (medRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Personal no encontrado' });
    }
    const medico = medRes.rows[0];

    // 2. Obtener usuarios asociados a este id_medico
    const userRes = await client.query('SELECT id_usuario, username FROM usuarios WHERE id_medico = $1', [id]);
    const userIds = userRes.rows.map((u: any) => u.id_usuario);

    // 3. Revisar si existen registros clínicos o documentos firmados (NOM-004) vinculados
    const checkQueries: Promise<any>[] = [
      client.query('SELECT COUNT(*) FROM encuentro WHERE id_medico_responsable = $1', [id]),
      client.query('SELECT COUNT(*) FROM interconsulta WHERE medico_solicitante = $1 OR medico_receptor = $1', [id]),
      client.query('SELECT COUNT(*) FROM referencia WHERE medico_envia = $1', [id]),
    ];

    if (userIds.length > 0) {
      checkQueries.push(
        client.query('SELECT COUNT(*) FROM paciente WHERE created_by = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM encuentro WHERE created_by = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM historia_clinica WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM nota_ingreso WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM nota_urgencias WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM indicaciones_medicas WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM nota_evolucion_diaria WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM internamiento WHERE registrado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM doc_hoja_frontal WHERE firmado_por = ANY($1::int[])', [userIds]),
        client.query('SELECT COUNT(*) FROM doc_nota_egreso WHERE firmado_por = ANY($1::int[])', [userIds])
      );
    }

    const checkResults = await Promise.all(checkQueries);
    const totalClinicalRecords = checkResults.reduce((acc, curr) => acc + parseInt(curr.rows[0].count, 10), 0);

    if (totalClinicalRecords > 0) {
      // Tiene expedientes o documentos clínicos firmados: DAR DE BAJA Y REVOCAR CREDENCIALES para cumplir NOM-004-SSA3-2012
      await client.query(
        'UPDATE personal_medico SET activo = FALSE, updated_at = NOW() WHERE id_medico = $1',
        [id]
      );
      if (userIds.length > 0) {
        await client.query(
          "UPDATE usuarios SET activo = FALSE, password_hash = 'REVOKED_ACCOUNT', ultimo_acceso = NULL WHERE id_medico = $1",
          [id]
        );
      }
      await client.query('COMMIT');
      await logAudit(req, 'DEACTIVATE', 'personal_medico', parseInt(id, 10), medico, { activo: false, revocado: true });

      return res.json({
        success: true,
        tipo: 'baja_logica',
        message: `El usuario "${medico.nombre} ${medico.apellido_paterno}" fue dado de baja y sus credenciales de acceso fueron canceladas. Debido a que cuenta con ${totalClinicalRecords} registro(s) clínico(s) o documentos firmados bajo la NOM-004-SSA3-2012, su registro legal se preserva en modo inactivo.`
      });
    }

    // No tiene registros clínicos: ELIMINACIÓN DEFINITIVA
    if (userIds.length > 0) {
      await client.query('DELETE FROM usuarios WHERE id_medico = $1', [id]);
    }
    await client.query('DELETE FROM personal_medico WHERE id_medico = $1', [id]);

    await client.query('COMMIT');
    await logAudit(req, 'DELETE', 'personal_medico', parseInt(id, 10), medico, null);

    return res.json({
      success: true,
      tipo: 'eliminacion_total',
      message: `El usuario y registro de "${medico.nombre} ${medico.apellido_paterno}" ha sido eliminado definitivamente del sistema.`
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar personal:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al eliminar personal' });
  } finally {
    client.release();
  }
});

// ============================================================
// INTERNAMIENTO (1:1 por encuentro)
// ============================================================

router.get('/encuentros/:id/internamiento', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM internamiento WHERE id_encuentro = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener internamiento:', err);
    res.status(500).json({ success: false, error: 'Error al obtener internamiento' });
  }
});

router.post('/encuentros/:id/internamiento', authorize('admin', 'medico', 'enfermeria', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.area_destino) {
    return res.status(400).json({ success: false, error: 'area_destino es requerida' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO internamiento (id_encuentro, area_destino, diagnostico_resumen, cama_asignada, registrado_por)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_encuentro) DO UPDATE SET
         area_destino = EXCLUDED.area_destino,
         diagnostico_resumen = EXCLUDED.diagnostico_resumen,
         cama_asignada = EXCLUDED.cama_asignada,
         updated_at = NOW()
       RETURNING *`,
      [req.params.id, data.area_destino, data.diagnostico_resumen || null, data.cama_asignada || null, req.user!.id_usuario]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Ya existe internamiento para este encuentro' });
    console.error('Error al crear internamiento:', err);
    res.status(500).json({ success: false, error: 'Error al crear internamiento' });
  }
});

router.put('/encuentros/:id/internamiento', authorize('admin', 'medico', 'enfermeria', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE internamiento SET
        area_destino = COALESCE($2, area_destino),
        diagnostico_resumen = COALESCE($3, diagnostico_resumen),
        cama_asignada = COALESCE($4, cama_asignada),
        updated_at = NOW()
       WHERE id_encuentro = $1 RETURNING *`,
      [req.params.id, data.area_destino, data.diagnostico_resumen, data.cama_asignada]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Internamiento no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar internamiento:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar internamiento' });
  }
});

router.delete('/encuentros/:id/internamiento', authorize('admin', 'medico', 'enfermeria', 'admision'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM internamiento WHERE id_encuentro = $1 RETURNING id_internamiento', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Internamiento no encontrado' });
    res.json({ success: true, message: 'Orden de internamiento eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar internamiento:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar internamiento' });
  }
});

// ============================================================
// INDICACIONES MÉDICAS (1:N por encuentro)
// ============================================================

router.get('/encuentros/:id/indicaciones', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM indicaciones_medicas WHERE id_encuentro = $1 ORDER BY fecha_hora_registro DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener indicaciones:', err);
    res.status(500).json({ success: false, error: 'Error al obtener indicaciones' });
  }
});

router.post('/encuentros/:id/indicaciones', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.indicacion) return res.status(400).json({ success: false, error: 'indicacion es requerida' });
  try {
    const result = await pool.query(
      `INSERT INTO indicaciones_medicas (id_encuentro, tipo, turno, indicacion, observaciones, registrado_por, medico_cedula)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, data.tipo || 'adulto', data.turno || null, data.indicacion, data.observaciones || null, req.user!.id_usuario, data.medico_cedula || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear indicacion:', err);
    res.status(500).json({ success: false, error: 'Error al crear indicacion' });
  }
});

router.put('/indicaciones/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE indicaciones_medicas SET
        indicacion = COALESCE($2, indicacion),
        observaciones = COALESCE($3, observaciones),
        turno = COALESCE($4, turno),
        updated_at = NOW()
       WHERE id_indicacion = $1 RETURNING *`,
      [req.params.id, data.indicacion, data.observaciones, data.turno]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Indicacion no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar indicacion:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar indicacion' });
  }
});

router.delete('/indicaciones/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM indicaciones_medicas WHERE id_indicacion = $1 RETURNING id_indicacion', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Indicacion no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar indicacion:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar indicacion' });
  }
});

// ============================================================
// PARTOGRAMA (1:N por encuentro)
// ============================================================

// ============================================================
// PARTOGRAMA: FICHA DE INGRESO OBSTÉTRICO (PÁGINA 1 OFICIAL)
// ============================================================

router.get('/encuentros/:id/partograma/ingreso', async (req: AuthRequest, res: Response) => {
  try {
    const encId = parseInt(req.params.id);
    const q = await pool.query(
      `SELECT dpi.*,
              COALESCE(dpi.medico_responsable, CONCAT('DR. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
              COALESCE(dpi.medico_cedula, pm.cedula_profesional) as medico_cedula_val
       FROM doc_partograma_ingreso dpi
       LEFT JOIN usuarios u ON dpi.registrado_por = u.id_usuario
       LEFT JOIN personal_medico pm ON (u.id_medico = pm.id_medico OR dpi.registrado_por = pm.id_medico)
       WHERE dpi.id_encuentro = $1 LIMIT 1`,
      [encId]
    );

    const qPac = await pool.query(
      `SELECT p.nombre, p.apellido_paterno, p.apellido_materno, p.edad, p.expediente_clinico,
              e.fecha_hora_ingreso,
              CONCAT('Dr. ', pmEnc.nombre, ' ', pmEnc.apellido_paterno, ' ', COALESCE(pmEnc.apellido_materno, '')) as medico_encuentro_nombre,
              pmEnc.cedula_profesional as medico_encuentro_cedula
       FROM encuentro e
       JOIN paciente p ON e.id_paciente = p.id_paciente
       LEFT JOIN personal_medico pmEnc ON e.id_medico_responsable = pmEnc.id_medico
       WHERE e.id_encuentro = $1`,
      [encId]
    );

    const pac = qPac.rows[0] || {};
    let medicoSugerido = pac.medico_encuentro_nombre ? pac.medico_encuentro_nombre.trim() : '';
    let cedulaSugerida = pac.medico_encuentro_cedula ? pac.medico_encuentro_cedula.trim() : '';

    if (!medicoSugerido && req.user?.id_usuario) {
      const qUser = await pool.query(
        `SELECT CONCAT('Dr. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, '')) as nombre_completo,
                pm.cedula_profesional
         FROM usuarios u
         JOIN personal_medico pm ON u.id_medico = pm.id_medico
         WHERE u.id_usuario = $1`,
        [req.user.id_usuario]
      );
      if (qUser.rows.length > 0) {
        medicoSugerido = qUser.rows[0].nombre_completo.trim();
        cedulaSugerida = (qUser.rows[0].cedula_profesional || '').trim();
      }
    }

    res.json({
      success: true,
      data: q.rows[0] || null,
      paciente: pac,
      medico_sugerido: medicoSugerido,
      cedula_sugerida: cedulaSugerida,
    });
  } catch (err) {
    console.error('Error al obtener datos de ingreso de partograma:', err);
    res.status(500).json({ success: false, error: 'Error al obtener datos de ingreso de partograma' });
  }
});

router.post('/encuentros/:id/partograma/ingreso', authorize('admin', 'medico', 'enfermeria', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  try {
    const encId = parseInt(req.params.id);
    const b = req.body;
    const userId = req.user?.id_usuario || null;

    const esIntacta = (b.membranas || 'intactas') === 'intactas' && !b.ruptura_membranas;
    const membranasVal = esIntacta ? 'intactas' : (b.membranas || 'rotas');
    const liqVal = esIntacta ? null : (b.liquido_amniotico || null);
    const rpmVal = !esIntacta;

    const result = await pool.query(
      `INSERT INTO doc_partograma_ingreso (
        id_encuentro, unidad_medica, fecha, hora,
        gesta, para, cesareas, abortos, hijos_vivos,
        fecha_ultimo_parto, fecha_ultima_menstruacion, fecha_probable_parto, semanas_gestacion,
        control_prenatal, num_consultas, donde_control, consultas_este_hospital,
        complicaciones_embarazo, tratamiento_administrado,
        actividad_uterina_inicio, contracciones_10min,
        sangrado_transvaginal, sangrado_inicio,
        ruptura_membranas, ruptura_membranas_hora,
        movimiento_fetal, movimiento_fetal_tipo, movimiento_fetal_desde,
        edema, edema_inicio,
        ta, temp, fr, fc,
        fcf, fcf_ritmo, tono_uterino,
        cervix_dilatacion, cervix_borramiento, presentacion, pelvis_util,
        impresion_diagnostica, indicaciones_medicas,
        medico_responsable, medico_cedula, registrado_por,
        membranas, liquido_amniotico,
        planos_hodge, posicion, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19,
        $20, $21,
        $22, $23,
        $24, $25,
        $26, $27, $28,
        $29, $30,
        $31, $32, $33, $34,
        $35, $36, $37,
        $38, $39, $40, $41,
        $42, $43,
        $44, $45, $46,
        $47, $48,
        $49, $50, now()
      )
      ON CONFLICT (id_encuentro) DO UPDATE SET
        unidad_medica = EXCLUDED.unidad_medica,
        fecha = EXCLUDED.fecha,
        hora = EXCLUDED.hora,
        gesta = EXCLUDED.gesta,
        para = EXCLUDED.para,
        cesareas = EXCLUDED.cesareas,
        abortos = EXCLUDED.abortos,
        hijos_vivos = EXCLUDED.hijos_vivos,
        fecha_ultimo_parto = EXCLUDED.fecha_ultimo_parto,
        fecha_ultima_menstruacion = EXCLUDED.fecha_ultima_menstruacion,
        fecha_probable_parto = EXCLUDED.fecha_probable_parto,
        semanas_gestacion = EXCLUDED.semanas_gestacion,
        control_prenatal = EXCLUDED.control_prenatal,
        num_consultas = EXCLUDED.num_consultas,
        donde_control = EXCLUDED.donde_control,
        consultas_este_hospital = EXCLUDED.consultas_este_hospital,
        complicaciones_embarazo = EXCLUDED.complicaciones_embarazo,
        tratamiento_administrado = EXCLUDED.tratamiento_administrado,
        actividad_uterina_inicio = EXCLUDED.actividad_uterina_inicio,
        contracciones_10min = EXCLUDED.contracciones_10min,
        sangrado_transvaginal = EXCLUDED.sangrado_transvaginal,
        sangrado_inicio = EXCLUDED.sangrado_inicio,
        ruptura_membranas = EXCLUDED.ruptura_membranas,
        ruptura_membranas_hora = EXCLUDED.ruptura_membranas_hora,
        movimiento_fetal = EXCLUDED.movimiento_fetal,
        movimiento_fetal_tipo = EXCLUDED.movimiento_fetal_tipo,
        movimiento_fetal_desde = EXCLUDED.movimiento_fetal_desde,
        edema = EXCLUDED.edema,
        edema_inicio = EXCLUDED.edema_inicio,
        ta = EXCLUDED.ta,
        temp = EXCLUDED.temp,
        fr = EXCLUDED.fr,
        fc = EXCLUDED.fc,
        fcf = EXCLUDED.fcf,
        fcf_ritmo = EXCLUDED.fcf_ritmo,
        tono_uterino = EXCLUDED.tono_uterino,
        cervix_dilatacion = EXCLUDED.cervix_dilatacion,
        cervix_borramiento = EXCLUDED.cervix_borramiento,
        presentacion = EXCLUDED.presentacion,
        pelvis_util = EXCLUDED.pelvis_util,
        impresion_diagnostica = EXCLUDED.impresion_diagnostica,
        indicaciones_medicas = EXCLUDED.indicaciones_medicas,
        medico_responsable = EXCLUDED.medico_responsable,
        medico_cedula = EXCLUDED.medico_cedula,
        membranas = EXCLUDED.membranas,
        liquido_amniotico = EXCLUDED.liquido_amniotico,
        planos_hodge = EXCLUDED.planos_hodge,
        posicion = EXCLUDED.posicion,
        updated_at = now()
      RETURNING *`,
      [
        encId, b.unidad_medica || 'Hospital General San Felipe del Progreso', b.fecha || new Date(), b.hora || '12:00',
        parseInt(b.gesta) || 0, parseInt(b.para) || 0, parseInt(b.cesareas) || 0, parseInt(b.abortos) || 0, parseInt(b.hijos_vivos) || 0,
        b.fecha_ultimo_parto || null, b.fecha_ultima_menstruacion || null, b.fecha_probable_parto || null, b.semanas_gestacion || null,
        Boolean(b.control_prenatal), parseInt(b.num_consultas) || 0, b.donde_control || null, parseInt(b.consultas_este_hospital) || 0,
        b.complicaciones_embarazo || null, b.tratamiento_administrado || null,
        b.actividad_uterina_inicio || null, b.contracciones_10min || null,
        Boolean(b.sangrado_transvaginal), b.sangrado_inicio || null,
        rpmVal, b.ruptura_membranas_hora || null,
        b.movimiento_fetal !== false, b.movimiento_fetal_tipo || 'normal', b.movimiento_fetal_desde || null,
        Boolean(b.edema), b.edema_inicio || null,
        b.ta || null, b.temp || null, b.fr || null, b.fc || null,
        b.fcf || null, b.fcf_ritmo || 'Regular', b.tono_uterino || 'Normal',
        b.cervix_dilatacion || null, b.cervix_borramiento || null, b.presentacion || 'Cefálica', b.pelvis_util !== false,
        b.impresion_diagnostica || null, b.indicaciones_medicas || null,
        b.medico_responsable || null, b.medico_cedula || null, userId,
        membranasVal, liqVal,
        b.planos_hodge || 'Plano I', b.posicion || 'OA'
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar datos de ingreso de partograma:', err);
    res.status(500).json({ success: false, error: 'Error al guardar datos de ingreso de partograma' });
  }
});

router.get('/encuentros/:id/partograma', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM partograma WHERE id_encuentro = $1 ORDER BY fecha_medicion, hora_medicion',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener partograma:', err);
    res.status(500).json({ success: false, error: 'Error al obtener partograma' });
  }
});

router.post('/encuentros/:id/partograma', authorize('admin', 'medico', 'enfermeria', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.hora_medicion || !data.fecha_medicion) {
    return res.status(400).json({ success: false, error: 'hora_medicion y fecha_medicion son requeridas' });
  }
  try {
    const esIntacta = data.membranas && ['intactas', 'íntegras', 'integras'].includes(String(data.membranas).toLowerCase().trim());
    const liqAmniotico = esIntacta ? null : (data.liquido_amniotico || null);

    const result = await pool.query(
      `INSERT INTO partograma (id_encuentro, hora_medicion, fecha_medicion, dilatacion, borramiento, presentacion, posicion, fcf, contracciones_en_10_min, intensidad_contracciones, membranas, liquido_amniotico, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [req.params.id, data.hora_medicion, data.fecha_medicion, data.dilatacion || null, data.borramiento || null,
       data.presentacion || null, data.posicion || null, data.fcf || null, data.contracciones_en_10_min || null,
       data.intensidad_contracciones || null, data.membranas || null, liqAmniotico,
       data.observaciones || null, req.user!.id_usuario]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear partograma:', err);
    res.status(500).json({ success: false, error: 'Error al crear partograma' });
  }
});

router.put('/partograma/:id', authorize('admin', 'medico', 'enfermeria', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const esIntacta = data.membranas && ['intactas', 'íntegras', 'integras'].includes(String(data.membranas).toLowerCase().trim());
    const liqAmniotico = esIntacta ? null : (data.liquido_amniotico || null);

    const result = await pool.query(
      `UPDATE partograma SET
        hora_medicion = COALESCE($2, hora_medicion),
        fecha_medicion = COALESCE($3, fecha_medicion),
        dilatacion = COALESCE($4, dilatacion),
        borramiento = COALESCE($5, borramiento),
        presentacion = COALESCE($6, presentacion),
        posicion = COALESCE($7, posicion),
        fcf = COALESCE($8, fcf),
        contracciones_en_10_min = COALESCE($9, contracciones_en_10_min),
        intensidad_contracciones = COALESCE($10, intensidad_contracciones),
        membranas = COALESCE($11, membranas),
        liquido_amniotico = CASE
          WHEN LOWER(COALESCE($11, membranas)) IN ('intactas', 'íntegras', 'integras') THEN NULL
          ELSE COALESCE($12, liquido_amniotico)
        END,
        observaciones = COALESCE($13, observaciones)
       WHERE id_partograma = $1 RETURNING *`,
      [req.params.id, data.hora_medicion || null, data.fecha_medicion || null,
       data.dilatacion ?? null, data.borramiento ?? null, data.presentacion || null,
       data.posicion || null, data.fcf ?? null, data.contracciones_en_10_min ?? null,
       data.intensidad_contracciones ?? null, data.membranas || null, liqAmniotico,
       data.observaciones || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar partograma:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar partograma' });
  }
});

router.delete('/partograma/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM partograma WHERE id_partograma = $1 RETURNING id_partograma', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar partograma:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar partograma' });
  }
});

// ============================================================
// CONSENTIMIENTO INFORMADO (1:N por encuentro)
// ============================================================

router.get('/encuentros/:id/consentimientos', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM consentimiento_informado WHERE id_encuentro = $1 ORDER BY fecha_hora_registro DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener consentimientos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener consentimientos' });
  }
});

router.post('/encuentros/:id/consentimientos', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.procedimiento || !data.explicacion_procedimiento) {
    return res.status(400).json({ success: false, error: 'procedimiento y explicacion_procedimiento son requeridos' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO consentimiento_informado (id_encuentro, procedimiento, explicacion_procedimiento, riesgos, alternativas, firma_paciente, firma_testigo1_nombre, firma_testigo2_nombre, firma_medico_nombre, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.params.id, data.procedimiento, data.explicacion_procedimiento, data.riesgos || null,
       data.alternativas || null, data.firma_paciente || false, data.firma_testigo1_nombre || null,
       data.firma_testigo2_nombre || null, data.firma_medico_nombre || null, req.user!.id_usuario]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear consentimiento:', err);
    res.status(500).json({ success: false, error: 'Error al crear consentimiento' });
  }
});

router.put('/consentimientos/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE consentimiento_informado SET
        firma_paciente = COALESCE($2, firma_paciente),
        firma_testigo1_nombre = COALESCE($3, firma_testigo1_nombre),
        firma_testigo2_nombre = COALESCE($4, firma_testigo2_nombre),
        firma_medico_nombre = COALESCE($5, firma_medico_nombre),
        fecha_hora_firma = CASE WHEN $2 = true THEN COALESCE($6, NOW()) ELSE fecha_hora_firma END
       WHERE id_consentimiento = $1 RETURNING *`,
      [req.params.id, data.firma_paciente, data.firma_testigo1_nombre, data.firma_testigo2_nombre,
       data.firma_medico_nombre, data.fecha_hora_firma]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar consentimiento:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar consentimiento' });
  }
});

router.delete('/consentimientos/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM consentimiento_informado WHERE id_consentimiento = $1 RETURNING id_consentimiento', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar consentimiento:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar consentimiento' });
  }
});

// ============================================================
// NOTA DE EVOLUCIÓN DIARIA (1:N por encuentro)
// ============================================================

router.get('/encuentros/:id/evolucion', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nota_evolucion_diaria WHERE id_encuentro = $1 ORDER BY fecha DESC, turno',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener evolucion:', err);
    res.status(500).json({ success: false, error: 'Error al obtener evolucion' });
  }
});

router.post('/encuentros/:id/evolucion', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.fecha || !data.turno) return res.status(400).json({ success: false, error: 'fecha y turno son requeridos' });
  try {
    const result = await pool.query(
      `INSERT INTO nota_evolucion_diaria (
        id_encuentro, fecha, hora, turno, temperatura, presion_arterial,
        frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, diuresis, evacuaciones,
        peso, talla, unidad_medica, subjetivo, objetivo, analisis, plan,
        nota_evolucion_texto, registrado_por, medico_nombre, medico_cedula
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        req.params.id, data.fecha, data.hora || new Date().toTimeString().substring(0, 5), data.turno,
        data.temperatura || null, data.presion_arterial || null,
        data.frecuencia_cardiaca || null, data.frecuencia_respiratoria || null, data.saturacion_oxigeno || null,
        data.diuresis || null, data.evacuaciones || null, data.peso || null, data.talla || null,
        data.unidad_medica || 'Hospital General San Felipe del Progreso',
        data.subjetivo || null, data.objetivo || null, data.analisis || null, data.plan || null,
        data.nota_evolucion_texto || null, req.user!.id_usuario,
        data.medico_nombre || req.user?.username, data.medico_cedula || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear evolucion:', err);
    res.status(500).json({ success: false, error: 'Error al crear evolucion' });
  }
});

router.put('/evolucion/:id', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE nota_evolucion_diaria SET
        fecha = COALESCE($2, fecha),
        hora = COALESCE($3, hora),
        turno = COALESCE($4, turno),
        temperatura = COALESCE($5, temperatura),
        presion_arterial = COALESCE($6, presion_arterial),
        frecuencia_cardiaca = COALESCE($7, frecuencia_cardiaca),
        frecuencia_respiratoria = COALESCE($8, frecuencia_respiratoria),
        saturacion_oxigeno = COALESCE($9, saturacion_oxigeno),
        diuresis = COALESCE($10, diuresis),
        evacuaciones = COALESCE($11, evacuaciones),
        peso = COALESCE($12, peso),
        talla = COALESCE($13, talla),
        unidad_medica = COALESCE($14, unidad_medica),
        subjetivo = COALESCE($15, subjetivo),
        objetivo = COALESCE($16, objetivo),
        analisis = COALESCE($17, analisis),
        plan = COALESCE($18, plan),
        nota_evolucion_texto = COALESCE($19, nota_evolucion_texto),
        medico_nombre = COALESCE($20, medico_nombre),
        medico_cedula = COALESCE($21, medico_cedula),
        updated_at = NOW()
       WHERE id_nota_evolucion = $1 RETURNING *`,
      [
        req.params.id, data.fecha || null, data.hora || null, data.turno || null,
        data.temperatura || null, data.presion_arterial || null,
        data.frecuencia_cardiaca || null, data.frecuencia_respiratoria || null, data.saturacion_oxigeno || null,
        data.diuresis || null, data.evacuaciones || null, data.peso || null, data.talla || null,
        data.unidad_medica || null, data.subjetivo, data.objetivo, data.analisis, data.plan,
        data.nota_evolucion_texto, data.medico_nombre, data.medico_cedula
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Nota no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar evolucion:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar evolucion' });
  }
});

router.delete('/evolucion/:id', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM nota_evolucion_diaria WHERE id_nota_evolucion = $1 RETURNING id_nota_evolucion', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Nota no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar evolucion:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar evolucion' });
  }
});

// ============================================================
// INTERCONSULTAS (1:N por encuentro)
// ============================================================

router.get('/encuentros/:id/interconsultas', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM interconsulta WHERE id_encuentro = $1 ORDER BY fecha_solicitud DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener interconsultas:', err);
    res.status(500).json({ success: false, error: 'Error al obtener interconsultas' });
  }
});

router.post('/encuentros/:id/interconsultas', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const motivo = data.motivo_interconsulta || data.motivo;
  const esp = data.servicio_solicitado || data.especialidad_solicitada;
  if (!esp || !motivo) {
    return res.status(400).json({ success: false, error: 'especialidad_solicitada y motivo son requeridos' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO interconsulta (
        id_encuentro, especialidad_solicitada, motivo, diagnostico_sugerido, registrado_por,
        cama, servicio_solicitante, motivo_interconsulta, servicio_solicitado,
        medico_solicitante_nombre, medico_receptor_nombre, fecha_recibido, hora_recibido, unidad_medica,
        fecha_solicitud, hora_solicitud
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, CURRENT_DATE), COALESCE($16, CURRENT_TIME)) RETURNING *`,
      [
        req.params.id, esp, motivo, data.diagnostico_sugerido || null, req.user!.id_usuario,
        data.cama || 'N/A', data.servicio_solicitante || 'Hospitalización', motivo, esp,
        data.medico_solicitante_nombre || req.user?.username || null, data.medico_receptor_nombre || null,
        data.fecha_recibido || null, data.hora_recibido || null, data.unidad_medica || 'Hospital General San Felipe del Progreso',
        data.fecha_solicitud || null, data.hora_solicitud || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear interconsulta:', err);
    res.status(500).json({ success: false, error: 'Error al crear interconsulta' });
  }
});

router.put('/interconsultas/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const motivo = data.motivo_interconsulta || data.motivo;
  const esp = data.servicio_solicitado || data.especialidad_solicitada;
  try {
    const result = await pool.query(
      `UPDATE interconsulta SET
        dictamen = COALESCE($2, dictamen),
        estado = COALESCE($3, estado),
        fecha_respuesta = CASE WHEN $3 IN ('atendida', 'rechazada') THEN NOW() ELSE fecha_respuesta END,
        especialidad_solicitada = COALESCE($4, especialidad_solicitada),
        servicio_solicitado = COALESCE($4, servicio_solicitado),
        motivo = COALESCE($5, motivo),
        motivo_interconsulta = COALESCE($5, motivo_interconsulta),
        diagnostico_sugerido = COALESCE($6, diagnostico_sugerido),
        cama = COALESCE($7, cama),
        servicio_solicitante = COALESCE($8, servicio_solicitante),
        medico_solicitante_nombre = COALESCE($9, medico_solicitante_nombre),
        medico_receptor_nombre = COALESCE($10, medico_receptor_nombre),
        fecha_recibido = COALESCE($11, fecha_recibido),
        hora_recibido = COALESCE($12, hora_recibido),
        fecha_solicitud = COALESCE($13, fecha_solicitud),
        hora_solicitud = COALESCE($14, hora_solicitud),
        updated_at = NOW()
       WHERE id_interconsulta = $1 RETURNING *`,
      [
        req.params.id, data.dictamen, data.estado, esp, motivo, data.diagnostico_sugerido,
        data.cama, data.servicio_solicitante, data.medico_solicitante_nombre, data.medico_receptor_nombre,
        data.fecha_recibido || null, data.hora_recibido || null,
        data.fecha_solicitud || null, data.hora_solicitud || null
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Interconsulta no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar interconsulta:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar interconsulta' });
  }
});

router.delete('/interconsultas/:id', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM interconsulta WHERE id_interconsulta = $1 RETURNING id_interconsulta', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Interconsulta no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar interconsulta:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar interconsulta' });
  }
});

// ============================================================
// REFERENCIA (1:1 por encuentro)
// ============================================================

router.get('/encuentros/:id/referencia', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM referencia WHERE id_encuentro = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener referencia:', err);
    res.status(500).json({ success: false, error: 'Error al obtener referencia' });
  }
});

router.post('/encuentros/:id/referencia', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.hospital_receptor || !data.especialidad || !data.motivo || !data.resumen_clinico) {
    return res.status(400).json({ success: false, error: 'hospital_receptor, especialidad, motivo y resumen_clinico son requeridos' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO referencia (id_encuentro, hospital_receptor, especialidad, motivo, resumen_clinico, diagnostico, plan, medico_recibe_nombre, medico_recibe_cedula, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id_encuentro) DO UPDATE SET
         hospital_receptor = EXCLUDED.hospital_receptor,
         especialidad = EXCLUDED.especialidad,
         motivo = EXCLUDED.motivo,
         resumen_clinico = EXCLUDED.resumen_clinico,
         diagnostico = EXCLUDED.diagnostico,
         plan = EXCLUDED.plan,
         medico_recibe_nombre = EXCLUDED.medico_recibe_nombre,
         medico_recibe_cedula = EXCLUDED.medico_recibe_cedula,
         updated_at = NOW()
       RETURNING *`,
      [req.params.id, data.hospital_receptor, data.especialidad, data.motivo, data.resumen_clinico,
       data.diagnostico || null, data.plan || null, data.medico_recibe_nombre || null,
       data.medico_recibe_cedula || null, req.user!.id_usuario]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Ya existe referencia para este encuentro' });
    console.error('Error al crear referencia:', err);
    res.status(500).json({ success: false, error: 'Error al crear referencia' });
  }
});

router.put('/encuentros/:id/referencia', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE referencia SET
        estado = COALESCE($2, estado),
        diagnostico = COALESCE($3, diagnostico),
        plan = COALESCE($4, plan),
        medico_recibe_nombre = COALESCE($5, medico_recibe_nombre),
        medico_recibe_cedula = COALESCE($6, medico_recibe_cedula),
        hospital_receptor = COALESCE($7, hospital_receptor),
        especialidad = COALESCE($8, especialidad),
        motivo = COALESCE($9, motivo),
        resumen_clinico = COALESCE($10, resumen_clinico),
        updated_at = NOW()
       WHERE id_encuentro = $1 RETURNING *`,
      [req.params.id, data.estado, data.diagnostico, data.plan, data.medico_recibe_nombre, data.medico_recibe_cedula,
       data.hospital_receptor, data.especialidad, data.motivo, data.resumen_clinico]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Referencia no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar referencia:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar referencia' });
  }
});

router.delete('/encuentros/:id/referencia', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM referencia WHERE id_encuentro = $1 RETURNING id_referencia', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Referencia no encontrada' });
    res.json({ success: true, message: 'Nota de referencia eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar referencia:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar referencia' });
  }
});

// ============================================================
// ATENCIÓN DE PARTO (1:1 por encuentro)
// ============================================================

router.get('/encuentros/:id/atencion-parto', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM atencion_parto WHERE id_encuentro = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener atencion de parto:', err);
    res.status(500).json({ success: false, error: 'Error al obtener atencion de parto' });
  }
});

router.post('/encuentros/:id/atencion-parto', authorize('admin', 'medico', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const gasasCompletas = data.gasas_completas !== undefined ? data.gasas_completas : (data.gases_completas !== undefined ? data.gases_completas : null);
  const gasasContadas = (data.gasas_contadas ?? data.gases_contadas);
  const gasasEsperadas = (data.gasas_esperadas ?? data.gases_esperadas);
  try {
    const result = await pool.query(
      `INSERT INTO atencion_parto (id_encuentro, fecha_hora_parto, indicacion_parto, tecnica_quirurgica, hallazgos, perdida_hematica_ml, complicaciones, gasas_completas, gasas_contadas, gasas_esperadas, metodo_planificacion_postparto, observaciones, registrado_por, medico_cedula)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id_encuentro) DO UPDATE SET
         fecha_hora_parto = EXCLUDED.fecha_hora_parto,
         indicacion_parto = EXCLUDED.indicacion_parto,
         tecnica_quirurgica = EXCLUDED.tecnica_quirurgica,
         hallazgos = EXCLUDED.hallazgos,
         perdida_hematica_ml = EXCLUDED.perdida_hematica_ml,
         complicaciones = EXCLUDED.complicaciones,
         gasas_completas = EXCLUDED.gasas_completas,
         gasas_contadas = EXCLUDED.gasas_contadas,
         gasas_esperadas = EXCLUDED.gasas_esperadas,
         metodo_planificacion_postparto = EXCLUDED.metodo_planificacion_postparto,
         observaciones = EXCLUDED.observaciones,
         medico_cedula = EXCLUDED.medico_cedula,
         updated_at = NOW()
       RETURNING *`,
      [req.params.id, data.fecha_hora_parto || null, data.indicacion_parto || null, data.tecnica_quirurgica || null,
       data.hallazgos || null, data.perdida_hematica_ml !== '' && data.perdida_hematica_ml !== undefined ? data.perdida_hematica_ml : null, data.complicaciones || null,
       gasasCompletas, gasasContadas !== '' && gasasContadas !== undefined ? gasasContadas : null, gasasEsperadas !== '' && gasasEsperadas !== undefined ? gasasEsperadas : null,
       data.metodo_planificacion_postparto || null, data.observaciones || null,
       req.user!.id_usuario, data.medico_cedula || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Ya existe atencion de parto para este encuentro' });
    console.error('Error al crear atencion de parto:', err);
    res.status(500).json({ success: false, error: 'Error al crear atencion de parto' });
  }
});

router.put('/encuentros/:id/atencion-parto', authorize('admin', 'medico', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const gasasCompletas = data.gasas_completas !== undefined ? data.gasas_completas : data.gases_completas;
  const gasasContadas = (data.gasas_contadas ?? data.gases_contadas);
  const gasasEsperadas = (data.gasas_esperadas ?? data.gases_esperadas);
  try {
    const result = await pool.query(
      `UPDATE atencion_parto SET
        indicacion_parto = COALESCE($2, indicacion_parto),
        tecnica_quirurgica = COALESCE($3, tecnica_quirurgica),
        hallazgos = COALESCE($4, hallazgos),
        perdida_hematica_ml = COALESCE($5, perdida_hematica_ml),
        complicaciones = COALESCE($6, complicaciones),
        gasas_completas = COALESCE($7, gasas_completas),
        gasas_contadas = COALESCE($8, gasas_contadas),
        gasas_esperadas = COALESCE($9, gasas_esperadas),
        metodo_planificacion_postparto = COALESCE($10, metodo_planificacion_postparto),
        observaciones = COALESCE($11, observaciones),
        fecha_hora_parto = COALESCE($12, fecha_hora_parto),
        medico_cedula = COALESCE($13, medico_cedula),
        updated_at = NOW()
       WHERE id_encuentro = $1 RETURNING *`,
      [req.params.id, data.indicacion_parto, data.tecnica_quirurgica, data.hallazgos,
       data.perdida_hematica_ml !== '' && data.perdida_hematica_ml !== undefined ? data.perdida_hematica_ml : null,
       data.complicaciones, gasasCompletas,
       gasasContadas !== '' && gasasContadas !== undefined ? gasasContadas : null,
       gasasEsperadas !== '' && gasasEsperadas !== undefined ? gasasEsperadas : null,
       data.metodo_planificacion_postparto, data.observaciones,
       data.fecha_hora_parto || null, data.medico_cedula || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Atencion de parto no encontrada' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar atencion de parto:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar atencion de parto' });
  }
});

router.delete('/encuentros/:id/atencion-parto', authorize('admin', 'medico', 'obstetricia'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM atencion_parto WHERE id_encuentro = $1 RETURNING id_atencion_parto', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Atencion de parto no encontrada' });
    res.json({ success: true, message: 'Atención de parto eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar atencion de parto:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar atencion de parto' });
  }
});

// ============================================================
// HC PEDIÁTRICA (placeholder - se implementará con recien_nacido)
// ============================================================

router.get('/encuentros/:id/hc-pediatrica', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recien_nacido WHERE id_encuentro = $1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener HC pediatrica:', err);
    res.status(500).json({ success: false, error: 'Error al obtener HC pediatrica' });
  }
});

export default router;
