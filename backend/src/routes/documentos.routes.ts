// ============================================================
// RUTAS DE LOS 15 DOCUMENTOS OFICIALES Y GENERACIÓN DE PDF
// Hospital General San Felipe del Progreso — Cumplimiento NOM-004-SSA3
// ============================================================

import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { AuthRequest } from '../types';
import { PDFGeneratorService } from '../services/pdfGenerator';
import { OfficialPdfService } from '../services/officialPdfService';

const router = Router();
router.use(authenticate);

/** Helper para obtener paciente con edad calculada de un encuentro */
async function getPacientePorEncuentro(encuentroId: string | number) {
  const query = `
    SELECT e.*, p.*
    FROM encuentro e
    JOIN v_paciente_detalle p ON e.id_paciente = p.id_paciente
    WHERE e.id_encuentro = $1
  `;
  const res = await pool.query(query, [encuentroId]);
  return res.rows[0] || null;
}

// ============================================================
// 4.1 AVISO DE PRIVACIDAD
// ============================================================
router.get('/encuentros/:id/aviso-privacidad', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_aviso_privacidad WHERE id_encuentro = $1 ORDER BY id_aviso DESC LIMIT 1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener aviso de privacidad:', err);
    res.status(500).json({ success: false, error: 'Error al obtener aviso de privacidad' });
  }
});

router.post('/encuentros/:id/aviso-privacidad', authorize('admin', 'admision', 'medico'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_aviso_privacidad (
        id_encuentro, autoriza_transferencia, unidad_medica, municipio, fecha,
        firmado, fecha_firma, firmado_por, firma_nombre, firma_parentesco,
        huella_registrada, urgencia_vital_pendiente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id_encuentro) DO UPDATE SET
        autoriza_transferencia = EXCLUDED.autoriza_transferencia,
        unidad_medica = EXCLUDED.unidad_medica,
        municipio = EXCLUDED.municipio,
        fecha = EXCLUDED.fecha,
        firmado = EXCLUDED.firmado, 
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        firma_nombre = EXCLUDED.firma_nombre,
        firma_parentesco = EXCLUDED.firma_parentesco,
        huella_registrada = EXCLUDED.huella_registrada,
        urgencia_vital_pendiente = EXCLUDED.urgencia_vital_pendiente,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id,
        data.autoriza_transferencia !== false,
        data.unidad_medica || 'Hospital General San Felipe del Progreso',
        data.municipio || 'San Felipe del Progreso',
        data.fecha || new Date(),
        data.firmado !== false,
        data.firmado ? new Date() : null,
        req.user?.id_usuario || null,
        data.firma_nombre || null,
        data.firma_parentesco || 'Titular',
        data.huella_registrada || false,
        data.urgencia_vital_pendiente || false,
      ]
    );

    await logAudit(req, 'UPSERT', 'doc_aviso_privacidad', result.rows[0].id_aviso, null, result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar aviso de privacidad:', err);
    res.status(500).json({ success: false, error: 'Error al guardar aviso de privacidad' });
  }
});

router.delete('/encuentros/:id/aviso-privacidad', authorize('admin', 'admision', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_aviso_privacidad WHERE id_encuentro = $1 RETURNING id_aviso', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Aviso de privacidad no encontrado' });
    res.json({ success: true, message: 'Aviso de privacidad eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar aviso de privacidad:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar aviso de privacidad' });
  }
});

// ============================================================
// 4.2 CONSENTIMIENTO INFORMADO
// ============================================================
router.get('/encuentros/:id/consentimientos-oficiales', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_consentimiento_informado WHERE id_encuentro = $1 ORDER BY id_consentimiento DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener consentimientos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener consentimientos' });
  }
});

router.post('/encuentros/:id/consentimientos-oficiales', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_consentimiento_informado (
        id_encuentro, unidad_medica, lugar, fecha, hora, ocupacion, servicio,
        diagnosticos_clinicos, estudios_previos, actos_anestesicos, tratamiento_medico,
        tratamiento_quirurgico, riesgos_complicaciones, personal_medico_nombre,
        personal_medico_cedula, familiar_nombre, familiar_parentesco,
        testigo1_nombre, testigo2_nombre, firmado, fecha_firma, firmado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        req.params.id,
        data.unidad_medica || 'Hospital General San Felipe del Progreso',
        data.lugar || 'San Felipe del Progreso, México',
        data.fecha || new Date(),
        data.hora || '12:00',
        data.ocupacion || null,
        data.servicio || 'Cirugía General',
        data.diagnosticos_clinicos || null,
        data.estudios_previos || null,
        data.actos_anestesicos || null,
        data.tratamiento_medico || null,
        data.tratamiento_quirurgico || null,
        data.riesgos_complicaciones || null,
        data.personal_medico_nombre || req.user?.username,
        data.personal_medico_cedula || null,
        data.familiar_nombre || null,
        data.familiar_parentesco || null,
        data.testigo1_nombre || null,
        data.testigo2_nombre || null,
        data.firmado !== false,
        new Date(),
        req.user?.id_usuario || null,
      ]
    );

    await logAudit(req, 'INSERT', 'doc_consentimiento_informado', result.rows[0].id_consentimiento, null, result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar consentimiento informado:', err);
    res.status(500).json({ success: false, error: 'Error al guardar consentimiento informado' });
  }
});

router.put('/encuentros/:id/consentimientos-oficiales/:id_consentimiento', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `UPDATE doc_consentimiento_informado SET
        unidad_medica = COALESCE($1, unidad_medica),
        lugar = COALESCE($2, lugar),
        fecha = COALESCE($3, fecha),
        hora = COALESCE($4, hora),
        ocupacion = COALESCE($5, ocupacion),
        servicio = COALESCE($6, servicio),
        diagnosticos_clinicos = COALESCE($7, diagnosticos_clinicos),
        estudios_previos = COALESCE($8, estudios_previos),
        actos_anestesicos = COALESCE($9, actos_anestesicos),
        tratamiento_medico = COALESCE($10, tratamiento_medico),
        tratamiento_quirurgico = COALESCE($11, tratamiento_quirurgico),
        riesgos_complicaciones = COALESCE($12, riesgos_complicaciones),
        personal_medico_nombre = COALESCE($13, personal_medico_nombre),
        personal_medico_cedula = COALESCE($14, personal_medico_cedula),
        familiar_nombre = COALESCE($15, familiar_nombre),
        familiar_parentesco = COALESCE($16, familiar_parentesco),
        testigo1_nombre = COALESCE($17, testigo1_nombre),
        testigo2_nombre = COALESCE($18, testigo2_nombre),
        firmado = COALESCE($19, firmado),
        updated_at = NOW()
      WHERE id_consentimiento = $20 AND id_encuentro = $21
      RETURNING *`,
      [
        data.unidad_medica || null, data.lugar || null, data.fecha || null, data.hora || null, data.ocupacion ?? null, data.servicio || null,
        data.diagnosticos_clinicos ?? null, data.estudios_previos ?? null, data.actos_anestesicos ?? null,
        data.tratamiento_medico ?? null, data.tratamiento_quirurgico ?? null, data.riesgos_complicaciones ?? null,
        data.personal_medico_nombre || null, data.personal_medico_cedula ?? null, data.familiar_nombre ?? null,
        data.familiar_parentesco ?? null, data.testigo1_nombre ?? null, data.testigo2_nombre ?? null, data.firmado,
        req.params.id_consentimiento, req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });
    }

    await logAudit(req, 'UPDATE', 'doc_consentimiento_informado', result.rows[0].id_consentimiento, null, result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar consentimiento:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar consentimiento' });
  }
});

router.delete('/encuentros/:id/consentimientos-oficiales/:id_consentimiento', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM doc_consentimiento_informado WHERE id_consentimiento = $1 AND id_encuentro = $2 RETURNING id_consentimiento',
      [req.params.id_consentimiento, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consentimiento no encontrado' });
    }
    res.json({ success: true, message: 'Consentimiento eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar consentimiento:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar consentimiento' });
  }
});

// ============================================================
// 4.3 HOJA FRONTAL
// ============================================================
router.get('/encuentros/:id/hoja-frontal', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_hoja_frontal WHERE id_encuentro = $1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener hoja frontal:', err);
    res.status(500).json({ success: false, error: 'Error al obtener hoja frontal' });
  }
});

router.post('/encuentros/:id/hoja-frontal', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_hoja_frontal (
        id_encuentro, fecha, personal_medico_tratante, cedula_profesional, diagnosticos_json,
        firmado, fecha_firma, firmado_por, unidad_medica, direccion, telefono, grupo_sanguineo, factor_rh, alergias
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id_encuentro) DO UPDATE SET
        fecha = EXCLUDED.fecha,
        personal_medico_tratante = EXCLUDED.personal_medico_tratante,
        cedula_profesional = EXCLUDED.cedula_profesional,
        diagnosticos_json = EXCLUDED.diagnosticos_json,
        firmado = EXCLUDED.firmado,
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        unidad_medica = EXCLUDED.unidad_medica,
        direccion = EXCLUDED.direccion,
        telefono = EXCLUDED.telefono,
        grupo_sanguineo = EXCLUDED.grupo_sanguineo,
        factor_rh = EXCLUDED.factor_rh,
        alergias = EXCLUDED.alergias,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id,
        data.fecha || new Date(),
        data.personal_medico_tratante || null,
        data.cedula_profesional || null,
        JSON.stringify(data.diagnosticos_json || []),
        data.firmado || false,
        data.firmado ? new Date() : null,
        req.user?.id_usuario || null,
        data.unidad_medica || null,
        data.direccion || null,
        data.telefono || null,
        data.grupo_sanguineo || null,
        data.factor_rh || null,
        data.alergias || null,
      ]
    );

    if (data.grupo_sanguineo || data.factor_rh || data.alergias !== undefined || data.direccion || data.telefono) {
      const enc = await pool.query('SELECT id_paciente FROM encuentro WHERE id_encuentro = $1', [req.params.id]);
      if (enc.rows[0]) {
        const rhCorto = data.factor_rh
          ? (String(data.factor_rh).includes('-') || String(data.factor_rh).toUpperCase().includes('NEG') ? '-' : '+')
          : null;
        await pool.query(
          `UPDATE paciente SET
            grupo_sanguineo = COALESCE($1, grupo_sanguineo),
            rh = COALESCE($2, rh),
            alergias = COALESCE($3, alergias),
            domicilio = COALESCE($4, domicilio),
            telefono = COALESCE($5, telefono)
           WHERE id_paciente = $6`,
          [
            data.grupo_sanguineo || null,
            rhCorto,
            data.alergias !== undefined ? data.alergias : null,
            data.direccion || null,
            data.telefono || null,
            enc.rows[0].id_paciente,
          ]
        );
      }
    }

    await logAudit(req, 'UPSERT', 'doc_hoja_frontal', result.rows[0].id_hoja_frontal, null, result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar hoja frontal:', err);
    res.status(500).json({ success: false, error: 'Error al guardar hoja frontal' });
  }
});

router.delete('/encuentros/:id/hoja-frontal', authorize('admin', 'medico', 'admision'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_hoja_frontal WHERE id_encuentro = $1 RETURNING id_hoja_frontal', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Hoja frontal no encontrada' });
    res.json({ success: true, message: 'Hoja frontal eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar hoja frontal:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar hoja frontal' });
  }
});

// ============================================================
// 4.5 HISTORIA CLÍNICA PEDIÁTRICA (< 18 AÑOS)
// ============================================================
router.get('/encuentros/:id/hc-pediatrica-oficial', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_historia_clinica_pediatrica WHERE id_encuentro = $1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener HC pediátrica:', err);
    res.status(500).json({ success: false, error: 'Error al obtener HC pediátrica' });
  }
});

router.post('/encuentros/:id/hc-pediatrica-oficial', authorize('admin', 'medico', 'pediatria'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_historia_clinica_pediatrica (
        id_encuentro, fecha, hora, tipo_interrogatorio, ocupacion,
        antecedentes_perinatales, alimentacion, inmunizaciones, desarrollo_psicomotor,
        antecedentes_heredofamiliares, antecedentes_no_patologicos, antecedentes_patologicos,
        padecimiento_actual, int_cardiovascular, int_respiratorio, int_gastrointestinal,
        int_genitourinario, int_hematico_linfatico, int_endocrino, int_nervioso,
        int_musculoesqueletico, int_piel_mucosas, temperatura, presion_arterial,
        frecuencia_cardiaca, frecuencia_respiratoria, peso, talla, habitus_exterior_neurologico,
        ef_cabeza, ef_cuello, ef_torax, ef_abdomen, ef_genitales, ef_extremidades, ef_piel,
        resultados_laboratorio, diagnosticos, terapeutica_empleada, pronostico,
        medico_nombre, medico_cedula, firmado, fecha_firma, firmado_por
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45
      )
      ON CONFLICT (id_encuentro) DO UPDATE SET
        fecha = EXCLUDED.fecha,
        hora = EXCLUDED.hora,
        tipo_interrogatorio = EXCLUDED.tipo_interrogatorio,
        ocupacion = EXCLUDED.ocupacion,
        antecedentes_perinatales = EXCLUDED.antecedentes_perinatales,
        alimentacion = EXCLUDED.alimentacion,
        inmunizaciones = EXCLUDED.inmunizaciones,
        desarrollo_psicomotor = EXCLUDED.desarrollo_psicomotor,
        antecedentes_heredofamiliares = EXCLUDED.antecedentes_heredofamiliares,
        antecedentes_no_patologicos = EXCLUDED.antecedentes_no_patologicos,
        antecedentes_patologicos = EXCLUDED.antecedentes_patologicos,
        padecimiento_actual = EXCLUDED.padecimiento_actual,
        int_cardiovascular = EXCLUDED.int_cardiovascular,
        int_respiratorio = EXCLUDED.int_respiratorio,
        int_gastrointestinal = EXCLUDED.int_gastrointestinal,
        int_genitourinario = EXCLUDED.int_genitourinario,
        int_hematico_linfatico = EXCLUDED.int_hematico_linfatico,
        int_endocrino = EXCLUDED.int_endocrino,
        int_nervioso = EXCLUDED.int_nervioso,
        int_musculoesqueletico = EXCLUDED.int_musculoesqueletico,
        int_piel_mucosas = EXCLUDED.int_piel_mucosas,
        temperatura = EXCLUDED.temperatura,
        presion_arterial = EXCLUDED.presion_arterial,
        frecuencia_cardiaca = EXCLUDED.frecuencia_cardiaca,
        frecuencia_respiratoria = EXCLUDED.frecuencia_respiratoria,
        peso = EXCLUDED.peso,
        talla = EXCLUDED.talla,
        habitus_exterior_neurologico = EXCLUDED.habitus_exterior_neurologico,
        ef_cabeza = EXCLUDED.ef_cabeza,
        ef_cuello = EXCLUDED.ef_cuello,
        ef_torax = EXCLUDED.ef_torax,
        ef_abdomen = EXCLUDED.ef_abdomen,
        ef_genitales = EXCLUDED.ef_genitales,
        ef_extremidades = EXCLUDED.ef_extremidades,
        ef_piel = EXCLUDED.ef_piel,
        resultados_laboratorio = EXCLUDED.resultados_laboratorio,
        diagnosticos = EXCLUDED.diagnosticos,
        terapeutica_empleada = EXCLUDED.terapeutica_empleada,
        pronostico = EXCLUDED.pronostico,
        medico_nombre = EXCLUDED.medico_nombre,
        medico_cedula = EXCLUDED.medico_cedula,
        firmado = EXCLUDED.firmado,
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id, d.fecha || new Date(), d.hora || '10:00', d.tipo_interrogatorio || 'Indirecto', d.ocupacion || null,
        d.antecedentes_perinatales || null, d.alimentacion || null, d.inmunizaciones || null, d.desarrollo_psicomotor || null,
        d.antecedentes_heredofamiliares || null, d.antecedentes_no_patologicos || null, d.antecedentes_patologicos || null,
        d.padecimiento_actual || 'Padecimiento pediátrico', d.int_cardiovascular || null, d.int_respiratorio || null, d.int_gastrointestinal || null,
        d.int_genitourinario || null, d.int_hematico_linfatico || null, d.int_endocrino || null, d.int_nervioso || null,
        d.int_musculoesqueletico || null, d.int_piel_mucosas || null, d.temperatura || null, d.presion_arterial || null,
        d.frecuencia_cardiaca || null, d.frecuencia_respiratoria || null, d.peso || null, d.talla || null, d.habitus_exterior_neurologico || null,
        d.ef_cabeza || null, d.ef_cuello || null, d.ef_torax || null, d.ef_abdomen || null, d.ef_genitales || null, d.ef_extremidades || null, d.ef_piel || null,
        d.resultados_laboratorio || null, d.diagnosticos || null, d.terapeutica_empleada || null, d.pronostico || null,
        d.medico_nombre || req.user?.username, d.medico_cedula || null, d.firmado || false, d.firmado ? new Date() : null, req.user?.id_usuario || null
      ]
    );

    await logAudit(req, 'UPSERT', 'doc_historia_clinica_pediatrica', result.rows[0].id_hc_pediatrica, null, result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar HC pediátrica:', err);
    res.status(500).json({ success: false, error: 'Error al guardar HC pediátrica' });
  }
});

router.delete('/encuentros/:id/hc-pediatrica-oficial', authorize('admin', 'medico', 'pediatria'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_historia_clinica_pediatrica WHERE id_encuentro = $1 RETURNING id_hc_pediatrica', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'HC pediátrica no encontrada' });
    res.json({ success: true, message: 'Historia clínica pediátrica eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar HC pediátrica:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar HC pediátrica' });
  }
});

// ============================================================
// 4.7 HOJA DE INDICACIONES MÉDICAS (SOLO-ANEXAR)
// ============================================================
router.get('/encuentros/:id/hoja-indicaciones', async (req: AuthRequest, res: Response) => {
  try {
    const qH = await pool.query(
      'SELECT * FROM doc_hoja_indicaciones WHERE id_encuentro = $1 ORDER BY id_hoja_indicaciones DESC LIMIT 1',
      [req.params.id]
    );

    let hoja = qH.rows[0];
    let ordenes: any[] = [];

    if (hoja?.id_hoja_indicaciones) {
      const qO = await pool.query(
        'SELECT * FROM doc_indicacion_orden WHERE id_hoja_indicaciones = $1 ORDER BY id_orden ASC',
        [hoja.id_hoja_indicaciones]
      );
      ordenes = qO.rows;
    }

    if (ordenes.length === 0) {
      const qIM = await pool.query(`
        SELECT im.id_indicacion as id_orden, im.fecha_hora_registro::date as fecha, im.fecha_hora_registro::time as hora,
               im.indicacion,
               COALESCE(CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, '')), u.username, 'Médico tratante') as medico_nombre,
               COALESCE(im.medico_cedula, pm.cedula_profesional) as medico_cedula
        FROM indicaciones_medicas im
        LEFT JOIN usuarios u ON im.registrado_por = u.id_usuario
        LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
        WHERE im.id_encuentro = $1
        ORDER BY im.id_indicacion ASC
      `, [req.params.id]);
      if (qIM.rows.length > 0) {
        ordenes = qIM.rows;
      }
    }

    if (!hoja) {
      hoja = {
        id_encuentro: parseInt(req.params.id),
        hoja_num: 1,
        servicio: 'Hospitalización General',
        fecha: new Date().toISOString().substring(0, 10),
        hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
        ta: '',
        temp: null,
        fc: null,
        fr: null,
        peso: null,
        talla: null,
        unidad_medica: 'Hospital General San Felipe del Progreso',
      };
    }

    res.json({ success: true, data: { ...hoja, ordenes } });
  } catch (err) {
    console.error('Error al obtener hoja de indicaciones:', err);
    res.status(500).json({ success: false, error: 'Error al obtener hoja de indicaciones' });
  }
});

router.post('/encuentros/:id/hoja-indicaciones', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const qCheck = await pool.query(
      'SELECT id_hoja_indicaciones FROM doc_hoja_indicaciones WHERE id_encuentro = $1 ORDER BY id_hoja_indicaciones DESC LIMIT 1',
      [req.params.id]
    );

    let result;
    if (qCheck.rows.length > 0) {
      result = await pool.query(
        `UPDATE doc_hoja_indicaciones SET
          hoja_num = COALESCE($2, hoja_num),
          servicio = COALESCE($3, servicio),
          fecha = COALESCE($4, fecha),
          hora = COALESCE($5, hora),
          ta = $6,
          temp = $7,
          fc = $8,
          fr = $9,
          peso = $10,
          talla = $11,
          unidad_medica = COALESCE($12, unidad_medica),
          updated_at = NOW()
        WHERE id_hoja_indicaciones = $1 RETURNING *`,
        [
          qCheck.rows[0].id_hoja_indicaciones,
          d.hoja_num ? parseInt(d.hoja_num) : null,
          d.servicio || null,
          d.fecha || null,
          d.hora || null,
          d.ta || null,
          d.temp ? parseFloat(d.temp) : null,
          d.fc ? parseInt(d.fc) : null,
          d.fr ? parseInt(d.fr) : null,
          d.peso ? parseFloat(d.peso) : null,
          d.talla ? parseFloat(d.talla) : null,
          d.unidad_medica || null,
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO doc_hoja_indicaciones (
          id_encuentro, hoja_num, servicio, fecha, hora, ta, temp, fc, fr, peso, talla, unidad_medica
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          req.params.id,
          d.hoja_num ? parseInt(d.hoja_num) : 1,
          d.servicio || 'Hospitalización General',
          d.fecha || new Date(),
          d.hora || '10:00',
          d.ta || null,
          d.temp ? parseFloat(d.temp) : null,
          d.fc ? parseInt(d.fc) : null,
          d.fr ? parseInt(d.fr) : null,
          d.peso ? parseFloat(d.peso) : null,
          d.talla ? parseFloat(d.talla) : null,
          d.unidad_medica || 'Hospital General San Felipe del Progreso',
        ]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar cabecera de indicaciones:', err);
    res.status(500).json({ success: false, error: 'Error al guardar cabecera de indicaciones' });
  }
});

router.post('/encuentros/:id/indicaciones-orden', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  const { indicacion, servicio, fecha, hora, medico_nombre, medico_cedula } = req.body;
  if (!indicacion) {
    return res.status(400).json({ success: false, error: 'La indicación médica es requerida' });
  }

  try {
    let hojaResult = await pool.query(
      'SELECT id_hoja_indicaciones FROM doc_hoja_indicaciones WHERE id_encuentro = $1 ORDER BY id_hoja_indicaciones DESC LIMIT 1',
      [req.params.id]
    );

    let hojaId = hojaResult.rows[0]?.id_hoja_indicaciones;
    if (!hojaId) {
      const nuevaHoja = await pool.query(
        'INSERT INTO doc_hoja_indicaciones (id_encuentro, servicio, fecha, hora) VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME) RETURNING id_hoja_indicaciones',
        [req.params.id, servicio || 'Hospitalización General']
      );
      hojaId = nuevaHoja.rows[0].id_hoja_indicaciones;
    }

    const medNombre = medico_nombre || req.user?.username || 'Médico tratante';
    const medCed = medico_cedula || null;
    const fVal = fecha || new Date().toISOString().substring(0, 10);
    const hVal = hora || new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

    const ordenResult = await pool.query(
      `INSERT INTO doc_indicacion_orden (
        id_hoja_indicaciones, fecha, hora, indicacion, medico_nombre, medico_cedula, firmado, firmado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7) RETURNING *`,
      [hojaId, fVal, hVal, indicacion, medNombre, medCed, req.user?.id_usuario || null]
    );

    await logAudit(req, 'INSERT', 'doc_indicacion_orden', ordenResult.rows[0].id_orden, null, ordenResult.rows[0]);
    res.status(201).json({ success: true, data: ordenResult.rows[0] });
  } catch (err) {
    console.error('Error al agregar orden de indicación médica:', err);
    res.status(500).json({ success: false, error: 'Error al agregar indicación médica' });
  }
});

router.put('/encuentros/:id/indicaciones-orden/:idOrden', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  const { indicacion, fecha, hora, medico_nombre, medico_cedula } = req.body;
  try {
    const result = await pool.query(
      `UPDATE doc_indicacion_orden SET
        indicacion = COALESCE($2, indicacion),
        fecha = COALESCE($3, fecha),
        hora = COALESCE($4, hora),
        medico_nombre = COALESCE($5, medico_nombre),
        medico_cedula = COALESCE($6, medico_cedula)
      WHERE id_orden = $1 RETURNING *`,
      [req.params.idOrden, indicacion || null, fecha || null, hora || null, medico_nombre || null, medico_cedula ?? null]
    );

    if (result.rows.length === 0) {
      const qIM = await pool.query(
        `UPDATE indicaciones_medicas SET
          indicacion = COALESCE($2, indicacion),
          medico_cedula = COALESCE($3, medico_cedula),
          updated_at = NOW()
        WHERE id_indicacion = $1 RETURNING *`,
        [req.params.idOrden, indicacion || null, medico_cedula ?? null]
      );
      if (qIM.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Orden no encontrada' });
      }
      return res.json({ success: true, data: qIM.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar orden de indicación médica:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar indicación médica' });
  }
});

router.delete('/encuentros/:id/indicaciones-orden/:idOrden', authorize('admin', 'medico', 'enfermeria'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'DELETE FROM doc_indicacion_orden WHERE id_orden = $1 RETURNING id_orden',
      [req.params.idOrden]
    );

    if (result.rows.length === 0) {
      await pool.query('DELETE FROM indicaciones_medicas WHERE id_indicacion = $1', [req.params.idOrden]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar orden de indicación médica:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar indicación médica' });
  }
});


// ============================================================
// 4.11 SOLICITUD DE GABINETE
// ============================================================
router.get('/encuentros/:id/gabinete-oficial', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_solicitud_gabinete WHERE id_encuentro = $1 ORDER BY id_solicitud DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener solicitudes de gabinete:', err);
    res.status(500).json({ success: false, error: 'Error al obtener solicitudes de gabinete' });
  }
});

router.post('/encuentros/:id/gabinete-oficial', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const fechaInterp = d.fecha_interpretacion ? new Date(d.fecha_interpretacion) : (d.interpretacion ? new Date() : null);
    const firmadoVal = d.firmado !== false;
    const existing = await pool.query(
      'SELECT id_solicitud FROM doc_solicitud_gabinete WHERE id_encuentro = $1 ORDER BY id_solicitud DESC LIMIT 1',
      [req.params.id]
    );

    let result;
    if (existing.rows.length > 0 && !d.nueva) {
      result = await pool.query(
        `UPDATE doc_solicitud_gabinete SET
          fecha = COALESCE($2, fecha),
          hora = COALESCE($3, hora),
          procedencia = $4,
          servicio = $5,
          cama = $6,
          tipo_paciente = $7,
          datos_clinicos = $8,
          diagnostico = $9,
          estudios_solicitados = $10,
          fecha_proxima_consulta = $11,
          medico_solicitante = $12,
          medico_cedula = $13,
          vobo_gestor = $14,
          observaciones = $15,
          placa_utilizada = $16,
          clave_estudio = $17,
          interpretacion = $18,
          fecha_interpretacion = $19,
          medico_interpreta = $20,
          medico_interpreta_cedula = $21,
          observaciones_interpretacion = $22,
          unidad_medica = $23,
          firmado = $24,
          fecha_firma = CASE WHEN $24 = true THEN COALESCE(fecha_firma, NOW()) ELSE NULL END,
          firmado_por = $25,
          updated_at = NOW()
        WHERE id_solicitud = $1
        RETURNING *`,
        [
          existing.rows[0].id_solicitud,
          d.fecha || null,
          d.hora || null,
          d.procedencia || 'Hospitalización',
          d.servicio || 'General',
          d.cama || 'N/A',
          d.tipo_paciente || '1ª vez',
          d.datos_clinicos || null,
          d.diagnostico || 'En estudio',
          d.estudios_solicitados || 'Radiografía simple',
          d.fecha_proxima_consulta || null,
          d.medico_solicitante || req.user?.username,
          d.medico_cedula || null,
          d.vobo_gestor || null,
          d.observaciones || null,
          d.placa_utilizada || null,
          d.clave_estudio || null,
          d.interpretacion || null,
          fechaInterp,
          d.medico_interpreta || null,
          d.medico_interpreta_cedula || null,
          d.observaciones_interpretacion || null,
          d.unidad_medica || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO',
          firmadoVal,
          req.user?.id_usuario || null
        ]
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    result = await pool.query(
      `INSERT INTO doc_solicitud_gabinete (
        id_encuentro, fecha, hora, procedencia, servicio, cama, tipo_paciente, datos_clinicos,
        diagnostico, estudios_solicitados, fecha_proxima_consulta, medico_solicitante,
        medico_cedula, vobo_gestor, observaciones, placa_utilizada, clave_estudio,
        interpretacion, fecha_interpretacion, medico_interpreta, medico_interpreta_cedula,
        observaciones_interpretacion, unidad_medica, firmado, fecha_firma, firmado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        req.params.id, d.fecha || new Date(), d.hora || '11:00',
        d.procedencia || 'Hospitalización', d.servicio || 'General', d.cama || 'N/A',
        d.tipo_paciente || '1ª vez', d.datos_clinicos || null, d.diagnostico || 'En estudio',
        d.estudios_solicitados || 'Radiografía simple', d.fecha_proxima_consulta || null,
        d.medico_solicitante || req.user?.username, d.medico_cedula || null, d.vobo_gestor || null,
        d.observaciones || null, d.placa_utilizada || null, d.clave_estudio || null,
        d.interpretacion || null, fechaInterp, d.medico_interpreta || null,
        d.medico_interpreta_cedula || null, d.observaciones_interpretacion || null,
        d.unidad_medica || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO',
        firmadoVal, firmadoVal ? new Date() : null, req.user?.id_usuario || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear solicitud de gabinete:', err);
    res.status(500).json({ success: false, error: 'Error al crear solicitud de gabinete' });
  }
});

router.delete('/encuentros/:id/gabinete-oficial', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_solicitud_gabinete WHERE id_encuentro = $1 RETURNING id_solicitud', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Solicitud de gabinete no encontrada' });
    res.json({ success: true, message: 'Solicitud de gabinete eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar solicitud de gabinete:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar solicitud de gabinete' });
  }
});

// ============================================================
// 4.12 SOLICITUD DE LABORATORIO (16 CATEGORÍAS)
// ============================================================
router.get('/encuentros/:id/laboratorio-oficial', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_solicitud_laboratorio WHERE id_encuentro = $1 ORDER BY id_solicitud_lab DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al obtener solicitudes de laboratorio:', err);
    res.status(500).json({ success: false, error: 'Error al obtener solicitudes de laboratorio' });
  }
});

router.post('/encuentros/:id/laboratorio-oficial', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const firmadoVal = d.firmado !== false;
    const existing = await pool.query(
      'SELECT id_solicitud_lab FROM doc_solicitud_laboratorio WHERE id_encuentro = $1 ORDER BY id_solicitud_lab DESC LIMIT 1',
      [req.params.id]
    );

    let result;
    if (existing.rows.length > 0 && !d.nueva) {
      result = await pool.query(
        `UPDATE doc_solicitud_laboratorio SET
          fecha_solicitud = COALESCE($2, fecha_solicitud),
          cama = $3,
          tipo_servicio = $4,
          especialidad_medica = $5,
          medico_solicitante = $6,
          medico_cedula = $7,
          diagnostico = $8,
          medicamentos_observaciones = $9,
          estudios_seleccionados = $10,
          otros_estudios = $11,
          sello_digital = $12,
          firmado = $13,
          fecha_firma = CASE WHEN $13 = true THEN COALESCE(fecha_firma, NOW()) ELSE NULL END,
          firmado_por = $14,
          unidad_medica = $15,
          updated_at = NOW()
        WHERE id_solicitud_lab = $1
        RETURNING *`,
        [
          existing.rows[0].id_solicitud_lab,
          d.fecha_solicitud || null,
          d.cama || 'N/A',
          d.tipo_servicio || 'Hospitalización',
          d.especialidad_medica || 'Medicina General',
          d.medico_solicitante || req.user?.username,
          d.medico_cedula || null,
          d.diagnostico || 'En protocolo',
          d.medicamentos_observaciones || null,
          JSON.stringify(d.estudios_seleccionados || []),
          d.otros_estudios || null,
          d.sello_digital || 'DIGITAL-ISEM-VALIDATED',
          firmadoVal,
          req.user?.id_usuario || null,
          d.unidad_medica || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO'
        ]
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    result = await pool.query(
      `INSERT INTO doc_solicitud_laboratorio (
        id_encuentro, fecha_solicitud, cama, tipo_servicio, especialidad_medica, medico_solicitante,
        medico_cedula, diagnostico, medicamentos_observaciones, estudios_seleccionados,
        otros_estudios, sello_digital, firmado, fecha_firma, firmado_por, unidad_medica
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.params.id, d.fecha_solicitud || new Date(),
        d.cama || 'N/A', d.tipo_servicio || 'Hospitalización', d.especialidad_medica || 'Medicina General',
        d.medico_solicitante || req.user?.username, d.medico_cedula || null, d.diagnostico || 'En protocolo',
        d.medicamentos_observaciones || null, JSON.stringify(d.estudios_seleccionados || []),
        d.otros_estudios || null, d.sello_digital || 'DIGITAL-ISEM-VALIDATED', firmadoVal, firmadoVal ? new Date() : null, req.user?.id_usuario || null,
        d.unidad_medica || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO'
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear solicitud de laboratorio:', err);
    res.status(500).json({ success: false, error: 'Error al crear solicitud de laboratorio' });
  }
});

router.delete('/encuentros/:id/laboratorio-oficial', authorize('admin', 'medico', 'laboratorio'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_solicitud_laboratorio WHERE id_encuentro = $1 RETURNING id_solicitud_lab', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Solicitud de laboratorio no encontrada' });
    res.json({ success: true, message: 'Solicitud de laboratorio eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar solicitud de laboratorio:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar solicitud de laboratorio' });
  }
});

// ============================================================
// 4.14 HOJA DE HOSPITALIZACIÓN (SINBA-14)
// ============================================================
router.get('/encuentros/:id/sinba-14', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_hoja_hospitalizacion_sinba14 WHERE id_encuentro = $1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener SINBA-14:', err);
    res.status(500).json({ success: false, error: 'Error al obtener SINBA-14' });
  }
});

router.post('/encuentros/:id/sinba-14', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_hoja_hospitalizacion_sinba14 (
        id_encuentro, clues, folio, gratuidad, nacio_en_hospital, peso_kg, talla_cm,
        tipo_servicio, fecha_ingreso, fecha_egreso, traslados_internos, dias_uti,
        dias_terapia_intermedia, procedencia, motivo_egreso, mujer_edad_fertil,
        afeccion_principal, afeccion_principal_cie, afeccion_primera_vez, comorbilidades,
        causa_externa, infeccion_intrahospitalaria, procedimientos_quirurgicos,
        tipo_anestesia, hoja_lesiones_violencia, hoja_lesiones_folio, metodo_gineco_obstetrico,
        tipo_procedimiento_aborto, tipo_parto, producto_embarazo, semanas_gestacion,
        metodo_planificacion_familiar, productos_recien_nacidos, tipo_unidad_egreso,
        medico_responsable, medico_curp, medico_cedula, firmado, fecha_firma, firmado_por,
        gesta, para, abortos, cesareas
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44
      )
      ON CONFLICT (id_encuentro) DO UPDATE SET
        clues = EXCLUDED.clues,
        folio = EXCLUDED.folio,
        gratuidad = EXCLUDED.gratuidad,
        nacio_en_hospital = EXCLUDED.nacio_en_hospital,
        peso_kg = EXCLUDED.peso_kg,
        talla_cm = EXCLUDED.talla_cm,
        tipo_servicio = EXCLUDED.tipo_servicio,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        fecha_egreso = EXCLUDED.fecha_egreso,
        traslados_internos = EXCLUDED.traslados_internos,
        dias_uti = EXCLUDED.dias_uti,
        dias_terapia_intermedia = EXCLUDED.dias_terapia_intermedia,
        procedencia = EXCLUDED.procedencia,
        motivo_egreso = EXCLUDED.motivo_egreso,
        mujer_edad_fertil = EXCLUDED.mujer_edad_fertil,
        afeccion_principal = EXCLUDED.afeccion_principal,
        afeccion_principal_cie = EXCLUDED.afeccion_principal_cie,
        afeccion_primera_vez = EXCLUDED.afeccion_primera_vez,
        comorbilidades = EXCLUDED.comorbilidades,
        causa_externa = EXCLUDED.causa_externa,
        infeccion_intrahospitalaria = EXCLUDED.infeccion_intrahospitalaria,
        procedimientos_quirurgicos = EXCLUDED.procedimientos_quirurgicos,
        tipo_anestesia = EXCLUDED.tipo_anestesia,
        hoja_lesiones_violencia = EXCLUDED.hoja_lesiones_violencia,
        hoja_lesiones_folio = EXCLUDED.hoja_lesiones_folio,
        metodo_gineco_obstetrico = EXCLUDED.metodo_gineco_obstetrico,
        tipo_procedimiento_aborto = EXCLUDED.tipo_procedimiento_aborto,
        tipo_parto = EXCLUDED.tipo_parto,
        producto_embarazo = EXCLUDED.producto_embarazo,
        semanas_gestacion = EXCLUDED.semanas_gestacion,
        metodo_planificacion_familiar = EXCLUDED.metodo_planificacion_familiar,
        productos_recien_nacidos = EXCLUDED.productos_recien_nacidos,
        tipo_unidad_egreso = EXCLUDED.tipo_unidad_egreso,
        medico_responsable = EXCLUDED.medico_responsable,
        medico_curp = EXCLUDED.medico_curp,
        medico_cedula = EXCLUDED.medico_cedula,
        firmado = EXCLUDED.firmado,
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        gesta = EXCLUDED.gesta,
        para = EXCLUDED.para,
        abortos = EXCLUDED.abortos,
        cesareas = EXCLUDED.cesareas,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id, d.clues || 'MCSSA004921', d.folio || 'HOSP-001', d.gratuidad !== false, d.nacio_en_hospital || false,
        d.peso_kg || null, d.talla_cm || null, d.tipo_servicio || 'Hospitalización', d.fecha_ingreso || new Date(), d.fecha_egreso || null,
        d.traslados_internos || null, d.dias_uti || 0, d.dias_terapia_intermedia || 0, d.procedencia || 'Consulta externa',
        d.motivo_egreso || 'Mejoría', d.mujer_edad_fertil || 'No estaba embarazada ni en puerperio',
        d.afeccion_principal || 'Estudio clínico', d.afeccion_principal_cie || 'Z00.0', d.afeccion_primera_vez !== false,
        JSON.stringify(d.comorbilidades || []), d.causa_externa || null, d.infeccion_intrahospitalaria || false,
        JSON.stringify(d.procedimientos_quirurgicos || []), d.tipo_anestesia || 'Local', d.hoja_lesiones_violencia || false,
        d.hoja_lesiones_folio || null, d.metodo_gineco_obstetrico || null, d.tipo_procedimiento_aborto || null,
        d.tipo_parto || null, d.producto_embarazo || 'Único', d.semanas_gestacion || null,
        d.metodo_planificacion_familiar || null, JSON.stringify(d.productos_recien_nacidos || []),
        d.tipo_unidad_egreso || 'Hospital General', d.medico_responsable || req.user?.username, d.medico_curp || null,
        d.medico_cedula || null, d.firmado || false, d.firmado ? new Date() : null, req.user?.id_usuario || null,
        d.gesta !== undefined ? d.gesta : null, d.para !== undefined ? d.para : null,
        d.abortos !== undefined ? d.abortos : (d.aborto !== undefined ? d.aborto : null),
        d.cesareas !== undefined ? d.cesareas : (d.cesarea !== undefined ? d.cesarea : null)
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar SINBA-14:', err);
    res.status(500).json({ success: false, error: 'Error al guardar SINBA-14' });
  }
});

router.delete('/encuentros/:id/sinba-14', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_hoja_hospitalizacion_sinba14 WHERE id_encuentro = $1 RETURNING id_sinba14', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Hoja SINBA-14 no encontrada' });
    res.json({ success: true, message: 'Hoja SINBA-14 eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar SINBA-14:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar SINBA-14' });
  }
});

// ============================================================
// 4.15 HOJA DIARIA DEL SERVICIO DE URGENCIAS (SINBA-16)
// ============================================================
router.get('/encuentros/:id/sinba-16', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM doc_hoja_diaria_urgencias_sinba16 WHERE id_encuentro = $1',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error al obtener SINBA-16:', err);
    res.status(500).json({ success: false, error: 'Error al obtener SINBA-16' });
  }
});

router.post('/encuentros/:id/sinba-16', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO doc_hoja_diaria_urgencias_sinba16 (
        id_encuentro, clues, folio, atencion_prehospitalaria, tiempo_traslado_horas,
        fecha_hora_ingreso, fecha_hora_alta, tipo_urgencia, motivo_atencion, tipo_caso,
        traslado_transferido, destino_unidad, alta_por, mujer_edad_fertil, afeccion_principal,
        afeccion_principal_cie, comorbilidades, causa_externa, hoja_lesiones_violencia,
        hoja_lesiones_folio, interconsultas_urgencias, procedimientos_realizados,
        medicamentos_administrados, seccion_menores_5_anios, medico_responsable,
        medico_curp, medico_cedula, firmado, fecha_firma, firmado_por, semanas_gestacion
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      )
      ON CONFLICT (id_encuentro) DO UPDATE SET
        clues = EXCLUDED.clues,
        folio = EXCLUDED.folio,
        atencion_prehospitalaria = EXCLUDED.atencion_prehospitalaria,
        tiempo_traslado_horas = EXCLUDED.tiempo_traslado_horas,
        fecha_hora_ingreso = EXCLUDED.fecha_hora_ingreso,
        fecha_hora_alta = EXCLUDED.fecha_hora_alta,
        tipo_urgencia = EXCLUDED.tipo_urgencia,
        motivo_atencion = EXCLUDED.motivo_atencion,
        tipo_caso = EXCLUDED.tipo_caso,
        traslado_transferido = EXCLUDED.traslado_transferido,
        destino_unidad = EXCLUDED.destino_unidad,
        alta_por = EXCLUDED.alta_por,
        mujer_edad_fertil = EXCLUDED.mujer_edad_fertil,
        afeccion_principal = EXCLUDED.afeccion_principal,
        afeccion_principal_cie = EXCLUDED.afeccion_principal_cie,
        comorbilidades = EXCLUDED.comorbilidades,
        causa_externa = EXCLUDED.causa_externa,
        hoja_lesiones_violencia = EXCLUDED.hoja_lesiones_violencia,
        hoja_lesiones_folio = EXCLUDED.hoja_lesiones_folio,
        interconsultas_urgencias = EXCLUDED.interconsultas_urgencias,
        procedimientos_realizados = EXCLUDED.procedimientos_realizados,
        medicamentos_administrados = EXCLUDED.medicamentos_administrados,
        seccion_menores_5_anios = EXCLUDED.seccion_menores_5_anios,
        medico_responsable = EXCLUDED.medico_responsable,
        medico_curp = EXCLUDED.medico_curp,
        medico_cedula = EXCLUDED.medico_cedula,
        firmado = EXCLUDED.firmado,
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        semanas_gestacion = EXCLUDED.semanas_gestacion,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id, d.clues || 'MCSSA004921', d.folio || 'URG-SINBA-001', d.atencion_prehospitalaria || false,
        d.tiempo_traslado_horas || '00:00', d.fecha_hora_ingreso || new Date(), d.fecha_hora_alta || null,
        d.tipo_urgencia || 'Urgencia calificada', d.motivo_atencion || 'Médico', d.tipo_caso || 'Caso de observación',
        d.traslado_transferido || false, d.destino_unidad || null, d.alta_por || 'Domicilio',
        d.mujer_edad_fertil || 'No estaba embarazada ni en puerperio', d.afeccion_principal || 'Causa médica',
        d.afeccion_principal_cie || 'R69', JSON.stringify(d.comorbilidades || []), d.causa_externa || null,
        d.hoja_lesiones_violencia || false, d.hoja_lesiones_folio || null, JSON.stringify(d.interconsultas_urgencias || []),
        JSON.stringify(d.procedimientos_realizados || []), JSON.stringify(d.medicamentos_administrados || []),
        JSON.stringify(d.seccion_menores_5_anios || {}), d.medico_responsable || req.user?.username,
        d.medico_curp || null, d.medico_cedula || null, d.firmado || false, d.firmado ? new Date() : null, req.user?.id_usuario || null,
        d.semanas_gestacion || null
      ]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar SINBA-16:', err);
    res.status(500).json({ success: false, error: 'Error al guardar SINBA-16' });
  }
});

router.delete('/encuentros/:id/sinba-16', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_hoja_diaria_urgencias_sinba16 WHERE id_encuentro = $1 RETURNING id_sinba16', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Hoja SINBA-16 no encontrada' });
    res.json({ success: true, message: 'Hoja SINBA-16 eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar SINBA-16:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar SINBA-16' });
  }
});

// ============================================================
// 4.8 NOTA DE EGRESO
// ============================================================
router.get('/encuentros/:id/nota-egreso', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dne.*,
             COALESCE(dne.diagnostico_ingreso, 'En estudio') as diagnostico_ingreso_val,
             COALESCE(dne.fecha_ingreso, e.fecha_hora_ingreso::date, CURRENT_DATE) as fecha_ingreso_val
      FROM doc_nota_egreso dne
      RIGHT JOIN encuentro e ON e.id_encuentro = $1
      WHERE dne.id_encuentro = $1 OR (dne.id_encuentro IS NULL AND e.id_encuentro = $1)
      LIMIT 1
    `, [req.params.id]);

    let data = result.rows[0];
    if (data) {
      if (!data.diagnostico_ingreso && data.diagnostico_ingreso_val) data.diagnostico_ingreso = data.diagnostico_ingreso_val;
      if (!data.fecha_ingreso && data.fecha_ingreso_val) data.fecha_ingreso = data.fecha_ingreso_val;
    }
    res.json({ success: true, data: data || null });
  } catch (err) {
    console.error('Error al obtener nota de egreso:', err);
    res.status(500).json({ success: false, error: 'Error al obtener nota de egreso' });
  }
});

router.post('/encuentros/:id/nota-egreso', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  const d = req.body;
  try {
    const fechaEgresoVal = d.fecha_hora_egreso ? new Date(d.fecha_hora_egreso) : new Date();
    const motivoEgreso = d.motivo_egreso || 'Mejoría';
    const estatusEncuentro =
      motivoEgreso === 'Defunción'
        ? 'defuncion'
        : motivoEgreso === 'Traslado a otra unidad'
        ? 'referido'
        : 'alta';

    const result = await pool.query(
      `INSERT INTO doc_nota_egreso (
        id_encuentro, tipo_ingreso, fecha_hora_egreso, motivo_egreso, servicio_egreso,
        diagnosticos_finales, resumen_evaluacion, tratamiento_intrahospitalario,
        problemas_pendientes, plan_manejo_egreso, recomendaciones_ambulatorias,
        factores_riesgo, pronostico, medico_responsable, medico_cedula, firmado,
        fecha_firma, firmado_por, unidad_medica, diagnostico_ingreso, fecha_ingreso
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (id_encuentro) DO UPDATE SET
        tipo_ingreso = EXCLUDED.tipo_ingreso,
        fecha_hora_egreso = EXCLUDED.fecha_hora_egreso,
        motivo_egreso = EXCLUDED.motivo_egreso,
        servicio_egreso = EXCLUDED.servicio_egreso,
        diagnosticos_finales = EXCLUDED.diagnosticos_finales,
        resumen_evaluacion = EXCLUDED.resumen_evaluacion,
        tratamiento_intrahospitalario = EXCLUDED.tratamiento_intrahospitalario,
        problemas_pendientes = EXCLUDED.problemas_pendientes,
        plan_manejo_egreso = EXCLUDED.plan_manejo_egreso,
        recomendaciones_ambulatorias = EXCLUDED.recomendaciones_ambulatorias,
        factores_riesgo = EXCLUDED.factores_riesgo,
        pronostico = EXCLUDED.pronostico,
        medico_responsable = EXCLUDED.medico_responsable,
        medico_cedula = EXCLUDED.medico_cedula,
        firmado = EXCLUDED.firmado,
        fecha_firma = EXCLUDED.fecha_firma,
        firmado_por = EXCLUDED.firmado_por,
        unidad_medica = EXCLUDED.unidad_medica,
        diagnostico_ingreso = EXCLUDED.diagnostico_ingreso,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        updated_at = NOW()
      RETURNING *`,
      [
        req.params.id, d.tipo_ingreso || 'Urgencias directo', fechaEgresoVal,
        motivoEgreso, d.servicio_egreso || 'Hospitalización General',
        d.diagnosticos_finales || '', d.resumen_evaluacion || '', d.tratamiento_intrahospitalario || '',
        d.problemas_pendientes || '', d.plan_manejo_egreso || '', d.recomendaciones_ambulatorias || '',
        d.factores_riesgo || '', d.pronostico || 'Favorable para la vida y la función', d.medico_responsable || req.user?.username,
        d.medico_cedula || null, d.firmado !== false, d.firmado ? new Date() : null, req.user?.id_usuario || null,
        d.unidad_medica || 'Hospital General San Felipe del Progreso', d.diagnostico_ingreso || null,
        d.fecha_ingreso ? new Date(d.fecha_ingreso) : null
      ]
    );

    await pool.query(
      `UPDATE encuentro SET
        estatus = $2,
        fecha_hora_alta = COALESCE($3, fecha_hora_alta, NOW()),
        diagnostico_egreso = COALESCE(NULLIF($4, ''), diagnostico_egreso),
        updated_at = NOW()
       WHERE id_encuentro = $1`,
      [req.params.id, estatusEncuentro, fechaEgresoVal, d.diagnosticos_finales || null]
    );

    await logAudit(req, 'UPSERT', 'doc_nota_egreso', result.rows[0].id_nota_egreso, null, result.rows[0]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al guardar nota de egreso:', err);
    res.status(500).json({ success: false, error: 'Error al guardar nota de egreso' });
  }
});

router.delete('/encuentros/:id/nota-egreso', authorize('admin', 'medico'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM doc_nota_egreso WHERE id_encuentro = $1 RETURNING id_nota_egreso', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Nota de egreso no encontrada' });

    // Revertir el encuentro a estado activo al eliminar la nota de egreso
    await pool.query(
      `UPDATE encuentro SET estatus = 'activo', fecha_hora_alta = NULL, updated_at = NOW() WHERE id_encuentro = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Nota de egreso eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar nota de egreso:', err);
    res.status(500).json({ success: false, error: 'Error al eliminar nota de egreso' });
  }
});

// ============================================================
// RESUMEN DE ESTATUS DE DOCUMENTOS (SEMÁFORO CLÍNICO)
// ============================================================
router.get('/encuentros/:id/resumen-documentos', async (req: AuthRequest, res: Response) => {
  try {
    const encId = parseInt(req.params.id, 10);
    const [
      aviso, consent, frontal, hcAdulto, hcPed, urgencias,
      evolucion, indicaciones, lab, gabinete, intercon,
      sinba16, sinba14, partograma, egreso,
      notaIngreso, internamiento, referencia, atencionParto
    ] = await Promise.all([
      pool.query('SELECT firmado, fecha_firma FROM doc_aviso_privacidad WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT COUNT(*) as count FROM doc_consentimiento_informado WHERE id_encuentro = $1', [encId]),
      pool.query('SELECT firmado, fecha_firma FROM doc_hoja_frontal WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_historia_clinica FROM historia_clinica WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT firmado FROM doc_historia_clinica_pediatrica WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_nota_urgencias FROM nota_urgencias WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT COUNT(*) as count, MAX(fecha) as ultima_fecha FROM nota_evolucion_diaria WHERE id_encuentro = $1', [encId]),
      pool.query('SELECT ((SELECT COUNT(*) FROM doc_indicacion_orden io JOIN doc_hoja_indicaciones hi ON io.id_hoja_indicaciones = hi.id_hoja_indicaciones WHERE hi.id_encuentro = $1) + (SELECT COUNT(*) FROM indicaciones_medicas WHERE id_encuentro = $1)) as count', [encId]),
      pool.query('SELECT COUNT(*) as count FROM doc_solicitud_laboratorio WHERE id_encuentro = $1', [encId]),
      pool.query('SELECT COUNT(*) as count FROM doc_solicitud_gabinete WHERE id_encuentro = $1', [encId]),
      pool.query('SELECT COUNT(*) as count FROM interconsulta WHERE id_encuentro = $1', [encId]),
      pool.query('SELECT firmado FROM doc_hoja_diaria_urgencias_sinba16 WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT firmado FROM doc_hoja_hospitalizacion_sinba14 WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT ((SELECT COUNT(*) FROM partograma WHERE id_encuentro = $1) + (SELECT COUNT(*) FROM doc_partograma_ingreso WHERE id_encuentro = $1)) as count', [encId]),
      pool.query('SELECT firmado FROM doc_nota_egreso WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_nota_ingreso FROM nota_ingreso WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_internamiento FROM internamiento WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_referencia FROM referencia WHERE id_encuentro = $1 LIMIT 1', [encId]),
      pool.query('SELECT id_atencion_parto FROM atencion_parto WHERE id_encuentro = $1 LIMIT 1', [encId]),
    ]);

    const data = {
      aviso_privacidad: { registrado: aviso.rows.length > 0, firmado: !!aviso.rows[0]?.firmado, count: aviso.rows.length },
      consentimiento: { registrado: parseInt(consent.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(consent.rows[0]?.count || '0') },
      hoja_frontal: { registrado: frontal.rows.length > 0, firmado: !!frontal.rows[0]?.firmado, count: frontal.rows.length },
      historia_clinica: { registrado: hcAdulto.rows.length > 0 || hcPed.rows.length > 0, firmado: hcPed.rows.length > 0 ? !!hcPed.rows[0]?.firmado : hcAdulto.rows.length > 0, count: hcAdulto.rows.length + hcPed.rows.length },
      evolucion: { registrado: parseInt(evolucion.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(evolucion.rows[0]?.count || '0'), ultima_fecha: evolucion.rows[0]?.ultima_fecha },
      indicaciones: { registrado: parseInt(indicaciones.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(indicaciones.rows[0]?.count || '0') },
      laboratorio: { registrado: parseInt(lab.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(lab.rows[0]?.count || '0') },
      gabinete: { registrado: parseInt(gabinete.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(gabinete.rows[0]?.count || '0') },
      interconsulta: { registrado: parseInt(intercon.rows[0]?.count || '0') > 0, firmado: true, count: parseInt(intercon.rows[0]?.count || '0') },
      urgencias: { registrado: urgencias.rows.length > 0, firmado: true, count: urgencias.rows.length },
      partograma: { registrado: parseInt(partograma.rows[0]?.count || '0') > 0, firmado: false, count: parseInt(partograma.rows[0]?.count || '0') },
      sinba16: { registrado: sinba16.rows.length > 0, firmado: !!sinba16.rows[0]?.firmado, count: sinba16.rows.length },
      sinba14: { registrado: sinba14.rows.length > 0, firmado: !!sinba14.rows[0]?.firmado, count: sinba14.rows.length },
      nota_egreso: { registrado: egreso.rows.length > 0, firmado: !!egreso.rows[0]?.firmado, count: egreso.rows.length },
      nota_ingreso: { registrado: notaIngreso.rows.length > 0, firmado: true, count: notaIngreso.rows.length },
      internamiento: { registrado: internamiento.rows.length > 0, firmado: true, count: internamiento.rows.length },
      referencia: { registrado: referencia.rows.length > 0, firmado: true, count: referencia.rows.length },
      atencion_parto: { registrado: atencionParto.rows.length > 0, firmado: true, count: atencionParto.rows.length },
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error al obtener resumen de documentos:', err);
    res.status(500).json({ success: false, error: 'Error al consultar resumen de documentos' });
  }
});

// ============================================================
// GENERACIÓN DE PDF OFICIAL (15 DOCUMENTOS)
// ============================================================
router.get('/encuentros/:id/pdf/:tipo', async (req: AuthRequest, res: Response) => {
  const { id, tipo } = req.params;

  try {
    const paciente = await getPacientePorEncuentro(id);
    if (!paciente) {
      return res.status(404).json({ success: false, error: 'Encuentro o paciente no encontrado' });
    }

    switch (tipo) {
      case 'aviso-privacidad': {
        const q = await pool.query('SELECT * FROM doc_aviso_privacidad WHERE id_encuentro = $1 ORDER BY id_aviso DESC LIMIT 1', [id]);
        return PDFGeneratorService.generarAvisoPrivacidad(res, q.rows[0] || {}, paciente);
      }
      case 'consentimiento': {
        const q = await pool.query('SELECT * FROM doc_consentimiento_informado WHERE id_encuentro = $1 ORDER BY id_consentimiento DESC LIMIT 1', [id]);
        return PDFGeneratorService.generarConsentimiento(res, q.rows[0] || {}, paciente);
      }
      case 'hoja-frontal': {
        const q = await pool.query('SELECT * FROM doc_hoja_frontal WHERE id_encuentro = $1', [id]);
        return PDFGeneratorService.generarHojaFrontal(res, q.rows[0] || {}, paciente);
      }
      case 'historia-clinica': {
        const q = await pool.query(`
          SELECT hc.*,
                 COALESCE(hc.medico_nombre, CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
                 COALESCE(hc.medico_cedula, pm.cedula_profesional) as medico_cedula_val
          FROM historia_clinica hc
          LEFT JOIN usuarios u ON hc.registrado_por = u.id_usuario
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE hc.id_encuentro = $1
          ORDER BY hc.id_historia_clinica DESC LIMIT 1
        `, [id]);
        const datosHC = q.rows[0] || {};
        if (datosHC.medico_nombre_completo) datosHC.medico_nombre = datosHC.medico_nombre_completo.trim();
        if (datosHC.medico_cedula_val) datosHC.medico_cedula = datosHC.medico_cedula_val;
        return PDFGeneratorService.generarHCGeneral(res, datosHC, paciente);
      }
      case 'hc-pediatrica': {
        const q = await pool.query(`
          SELECT hp.*,
                 COALESCE(hp.medico_nombre, CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
                 COALESCE(hp.medico_cedula, pm.cedula_profesional) as medico_cedula_val
          FROM doc_historia_clinica_pediatrica hp
          LEFT JOIN usuarios u ON hp.firmado_por = u.id_usuario
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE hp.id_encuentro = $1
          ORDER BY hp.id_hc_pediatrica DESC LIMIT 1
        `, [id]);
        const datosHP = q.rows[0] || {};
        if (datosHP.medico_nombre_completo) datosHP.medico_nombre = datosHP.medico_nombre_completo.trim();
        if (datosHP.medico_cedula_val) datosHP.medico_cedula = datosHP.medico_cedula_val;
        return PDFGeneratorService.generarHCPediatrica(res, datosHP, paciente);
      }
      case 'urgencias': {
        const q = await pool.query(`
          SELECT nu.*,
                 COALESCE(nu.medico_nombre, CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
                 COALESCE(nu.medico_cedula, pm.cedula_profesional) as medico_cedula_val
          FROM nota_urgencias nu
          LEFT JOIN usuarios u ON nu.registrado_por = u.id_usuario
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE nu.id_encuentro = $1
          ORDER BY nu.id_nota_urgencias DESC LIMIT 1
        `, [id]);
        const datosUrg = q.rows[0] || {};
        if (datosUrg.medico_nombre_completo) datosUrg.medico_nombre = datosUrg.medico_nombre_completo.trim();
        if (datosUrg.medico_cedula_val) datosUrg.medico_cedula = datosUrg.medico_cedula_val;
        return PDFGeneratorService.generarConsultaUrgencias(res, datosUrg, paciente);
      }
      case 'indicaciones': {
        const qH = await pool.query('SELECT * FROM doc_hoja_indicaciones WHERE id_encuentro = $1 ORDER BY id_hoja_indicaciones DESC LIMIT 1', [id]);
        const hoja = qH.rows[0] || {};
        let ordenes: any[] = [];
        if (hoja.id_hoja_indicaciones) {
          const qO = await pool.query('SELECT * FROM doc_indicacion_orden WHERE id_hoja_indicaciones = $1 ORDER BY id_orden ASC', [hoja.id_hoja_indicaciones]);
          ordenes = qO.rows;
        }
        if (ordenes.length === 0) {
          const qIM = await pool.query(`
            SELECT im.id_indicacion as id_orden, im.fecha_hora_registro::date as fecha, im.fecha_hora_registro::time as hora,
                   im.indicacion,
                   COALESCE(CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, '')), u.username, 'Médico tratante') as medico_nombre,
                   COALESCE(im.medico_cedula, pm.cedula_profesional) as medico_cedula
            FROM indicaciones_medicas im
            LEFT JOIN usuarios u ON im.registrado_por = u.id_usuario
            LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
            WHERE im.id_encuentro = $1
            ORDER BY im.id_indicacion ASC
          `, [id]);
          ordenes = qIM.rows;
        }
        hoja.ordenes = ordenes;
        return PDFGeneratorService.generarIndicaciones(res, hoja, paciente);
      }
      case 'nota-egreso': {
        const q = await pool.query(`
          SELECT dne.*,
                 COALESCE(dne.diagnostico_ingreso, 'En estudio') as diagnostico_ingreso,
                 COALESCE(dne.fecha_ingreso, e.fecha_hora_ingreso::date, CURRENT_DATE) as fecha_ingreso,
                 COALESCE(dne.unidad_medica, 'Hospital General San Felipe del Progreso') as unidad_medica,
                 COALESCE(dne.medico_responsable, CONCAT(pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
                 COALESCE(dne.medico_cedula, pm.cedula_profesional) as medico_cedula_val
          FROM doc_nota_egreso dne
          RIGHT JOIN encuentro e ON e.id_encuentro = $1
          LEFT JOIN usuarios u ON dne.firmado_por = u.id_usuario
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE dne.id_encuentro = $1
          LIMIT 1
        `, [id]);
        const datosEgreso = q.rows[0] || {};
        if (datosEgreso.medico_nombre_completo && !datosEgreso.medico_responsable) {
          datosEgreso.medico_responsable = datosEgreso.medico_nombre_completo.trim();
        }
        if (datosEgreso.medico_cedula_val && !datosEgreso.medico_cedula) {
          datosEgreso.medico_cedula = datosEgreso.medico_cedula_val;
        }
        return PDFGeneratorService.generarNotaEgreso(res, datosEgreso, paciente);
      }
      case 'evolucion': {
        const q = await pool.query('SELECT * FROM nota_evolucion_diaria WHERE id_encuentro = $1 ORDER BY id_nota_evolucion ASC', [id]);
        return PDFGeneratorService.generarNotasEvolucion(res, q.rows, paciente);
      }
      case 'partograma': {
        const qIngreso = await pool.query(`
          SELECT dpi.*,
                 COALESCE(dpi.medico_responsable, CONCAT('DR. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))) as medico_nombre_completo,
                 COALESCE(dpi.medico_cedula, pm.cedula_profesional) as medico_cedula
          FROM doc_partograma_ingreso dpi
          LEFT JOIN usuarios u ON dpi.registrado_por = u.id_usuario
          LEFT JOIN personal_medico pm ON (u.id_medico = pm.id_medico OR dpi.registrado_por = pm.id_medico)
          WHERE dpi.id_encuentro = $1
          LIMIT 1
        `, [id]);
        let datos = qIngreso.rows[0];
        if (!datos) {
          const qPart = await pool.query(`
            SELECT p.*,
                   CASE
                     WHEN pm.id_medico IS NOT NULL THEN CONCAT('DR. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))
                     ELSE NULL
                   END as medico_nombre
            FROM partograma p
            LEFT JOIN usuarios u ON p.registrado_por = u.id_usuario
            LEFT JOIN personal_medico pm ON (u.id_medico = pm.id_medico OR p.registrado_por = pm.id_medico)
            WHERE p.id_encuentro = $1
            ORDER BY p.id_partograma DESC
            LIMIT 1
          `, [id]);
          datos = qPart.rows[0] || {};
        }
        if (datos.medico_nombre_completo && !datos.medico_responsable) {
          datos.medico_responsable = datos.medico_nombre_completo;
        }
        return PDFGeneratorService.generarPartograma(res, datos, paciente);
      }
      case 'gabinete': {
        const q = await pool.query(`
          SELECT g.*,
                 CASE
                   WHEN pm.id_medico IS NOT NULL THEN CONCAT('DR. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))
                   ELSE g.medico_solicitante
                 END as medico_nombre_completo
          FROM doc_solicitud_gabinete g
          LEFT JOIN usuarios u ON (g.firmado_por = u.id_usuario OR g.medico_solicitante = u.username)
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE g.id_encuentro = $1
          ORDER BY g.id_solicitud DESC
          LIMIT 1
        `, [id]);
        const datosGab = q.rows[0] || {};
        if (datosGab.medico_nombre_completo) {
          datosGab.medico_solicitante = datosGab.medico_nombre_completo.trim();
        }
        return PDFGeneratorService.generarGabinete(res, datosGab, paciente);
      }
      case 'laboratorio': {
        const q = await pool.query(`
          SELECT l.*,
                 CASE
                   WHEN pm.id_medico IS NOT NULL THEN CONCAT('DR. ', pm.nombre, ' ', pm.apellido_paterno, ' ', COALESCE(pm.apellido_materno, ''))
                   ELSE l.medico_solicitante
                 END as medico_nombre_completo,
                 COALESCE(l.medico_cedula, pm.cedula_profesional) as medico_cedula_calc
          FROM doc_solicitud_laboratorio l
          LEFT JOIN usuarios u ON (l.firmado_por = u.id_usuario OR l.medico_solicitante = u.username)
          LEFT JOIN personal_medico pm ON u.id_medico = pm.id_medico
          WHERE l.id_encuentro = $1
          ORDER BY l.id_solicitud_lab DESC
          LIMIT 1
        `, [id]);
        const datosLab = q.rows[0] || {};
        if (datosLab.medico_nombre_completo) {
          datosLab.medico_solicitante = datosLab.medico_nombre_completo.trim();
        }
        if (datosLab.medico_cedula_calc && !datosLab.medico_cedula) {
          datosLab.medico_cedula = datosLab.medico_cedula_calc;
        }
        return PDFGeneratorService.generarLaboratorio(res, datosLab, paciente);
      }
      case 'interconsulta': {
        const q = await pool.query(`
          SELECT ic.*,
                 COALESCE(ic.medico_solicitante_nombre, CONCAT(pms.nombre, ' ', pms.apellido_paterno, ' ', COALESCE(pms.apellido_materno, ''))) as medico_solicitante_calc,
                 COALESCE(ic.medico_receptor_nombre, CONCAT(pmr.nombre, ' ', pmr.apellido_paterno, ' ', COALESCE(pmr.apellido_materno, ''))) as medico_receptor_calc
          FROM interconsulta ic
          LEFT JOIN personal_medico pms ON ic.medico_solicitante = pms.id_medico
          LEFT JOIN personal_medico pmr ON ic.medico_receptor = pmr.id_medico
          WHERE ic.id_encuentro = $1
          ORDER BY ic.id_interconsulta DESC
          LIMIT 1
        `, [id]);
        const datosIC = q.rows[0] || {};
        if (datosIC.medico_solicitante_calc && !datosIC.medico_solicitante_nombre) {
          datosIC.medico_solicitante_nombre = datosIC.medico_solicitante_calc.trim();
        }
        if (datosIC.medico_receptor_calc && !datosIC.medico_receptor_nombre) {
          datosIC.medico_receptor_nombre = datosIC.medico_receptor_calc.trim();
        }
        return PDFGeneratorService.generarInterconsulta(res, datosIC, paciente);
      }
      case 'sinba-14': {
        const q = await pool.query('SELECT * FROM doc_hoja_hospitalizacion_sinba14 WHERE id_encuentro = $1', [id]);
        return OfficialPdfService.generarSINBA14(res, q.rows[0] || {}, paciente);
      }
      case 'sinba-16': {
        const q = await pool.query('SELECT * FROM doc_hoja_diaria_urgencias_sinba16 WHERE id_encuentro = $1', [id]);
        return OfficialPdfService.generarSINBA16(res, q.rows[0] || {}, paciente);
      }
      default:
        return res.status(400).json({ success: false, error: `Tipo de documento inválido: ${tipo}` });
    }
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ success: false, error: 'Error al generar documento PDF' });
  }
});

export default router;
