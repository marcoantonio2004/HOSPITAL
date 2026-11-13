import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sinba16, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import {
  Siren,
  Save,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Stethoscope,
  Activity,
  HeartPulse,
  Pill,
  Clock,
  Baby,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

interface ComorbilidadItem {
  diagnostico: string;
  cie10: string;
}

interface InterconsultaItem {
  especialidad: string;
  medico_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  cedula: string;
  curp: string;
}

interface ProcedimientoItem {
  procedimiento: string;
  cie9: string;
}

interface MedicamentoItem {
  medicamento: string;
  presentacion: string;
}

export default function HojaDiariaUrgenciasSINBA16Mod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    clues: 'MCSSA004921',
    folio: 'URG-SINBA-001',
    atencion_prehospitalaria: false,
    tiempo_traslado_horas: '00:30',
    fecha_hora_ingreso: new Date().toISOString().substring(0, 16),
    fecha_hora_alta: '',
    tipo_urgencia: 'Urgencia calificada',
    motivo_atencion: 'Médico',
    tipo_caso: 'Caso de observación',
    traslado_transferido: false,
    destino_unidad: '',
    alta_por: 'Domicilio',
    mujer_edad_fertil: 'No estaba embarazada ni en puerperio',
    semanas_gestacion: '',
    afeccion_principal: '',
    afeccion_principal_cie: '',
    comorbilidades: [] as ComorbilidadItem[],
    causa_externa: '',
    hoja_lesiones_violencia: false,
    hoja_lesiones_folio: '',
    interconsultas_urgencias: [] as InterconsultaItem[],
    procedimientos_realizados: [] as ProcedimientoItem[],
    medicamentos_administrados: [] as MedicamentoItem[],
    medico_responsable: '',
    medico_curp: '',
    medico_cedula: '',
  });

  useEffect(() => {
    load();
  }, [id]);

  function parseJsonArray<T>(val: any): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async function load() {
    try {
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        setEncuentroData(eRes.data);
        const pRes = await pacientes.get(eRes.data.id_paciente);
        if (pRes.success) {
          setPacienteData(pRes.data);
        }
      }

      const sRes = await sinba16.get(parseInt(id!));
      if (sRes.success && sRes.data) {
        setIsEdit(Boolean(sRes.data.id_sinba16));
        const item = sRes.data;

        // Cargar listas dinámicas
        const loadedComorbs = parseJsonArray<ComorbilidadItem>(item.comorbilidades);
        const loadedInters = parseJsonArray<InterconsultaItem>(item.interconsultas_urgencias);
        const loadedProcs = parseJsonArray<ProcedimientoItem>(item.procedimientos_realizados);
        const loadedMeds = parseJsonArray<MedicamentoItem>(item.medicamentos_administrados);

        setForm({
          clues: item.clues || 'MCSSA004921',
          folio: item.folio || `URG-${id}`,
          atencion_prehospitalaria: Boolean(item.atencion_prehospitalaria),
          tiempo_traslado_horas: item.tiempo_traslado_horas || '00:30',
          fecha_hora_ingreso: item.fecha_hora_ingreso
            ? String(item.fecha_hora_ingreso).substring(0, 16)
            : new Date().toISOString().substring(0, 16),
          fecha_hora_alta: item.fecha_hora_alta
            ? String(item.fecha_hora_alta).substring(0, 16)
            : '',
          tipo_urgencia: item.tipo_urgencia || 'Urgencia calificada',
          motivo_atencion: item.motivo_atencion || 'Médico',
          tipo_caso: item.tipo_caso || 'Caso de observación',
          traslado_transferido: Boolean(item.traslado_transferido),
          destino_unidad: item.destino_unidad || '',
          alta_por: item.alta_por || 'Domicilio',
          mujer_edad_fertil: item.mujer_edad_fertil || 'No estaba embarazada ni en puerperio',
          semanas_gestacion: item.semanas_gestacion !== null && item.semanas_gestacion !== undefined ? String(item.semanas_gestacion) : '',
          afeccion_principal: item.afeccion_principal || '',
          afeccion_principal_cie: item.afeccion_principal_cie || '',
          comorbilidades: loadedComorbs,
          causa_externa: item.causa_externa || '',
          hoja_lesiones_violencia: Boolean(item.hoja_lesiones_violencia),
          hoja_lesiones_folio: item.hoja_lesiones_folio || '',
          interconsultas_urgencias: loadedInters,
          procedimientos_realizados: loadedProcs,
          medicamentos_administrados: loadedMeds,
          medico_responsable: item.medico_responsable || '',
          medico_curp: item.medico_curp || '',
          medico_cedula: item.medico_cedula || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Manejadores para Comorbilidades
  function addComorbilidad() {
    if (form.comorbilidades.length >= 5) {
      showToast('El formato oficial DGIS admite un máximo de 5 comorbilidades.', 'warning');
      return;
    }
    setForm(p => ({
      ...p,
      comorbilidades: [...p.comorbilidades, { diagnostico: '', cie10: '' }],
    }));
  }

  function removeComorbilidad(index: number) {
    setForm(p => ({
      ...p,
      comorbilidades: p.comorbilidades.filter((_, i) => i !== index),
    }));
  }

  function updateComorbilidad(index: number, field: keyof ComorbilidadItem, val: string) {
    setForm(p => {
      const copy = [...p.comorbilidades];
      copy[index] = { ...copy[index], [field]: val };
      return { ...p, comorbilidades: copy };
    });
  }

  // Manejadores para Interconsultas
  function addInterconsulta() {
    if (form.interconsultas_urgencias.length >= 3) {
      showToast('El formato oficial DGIS admite hasta 3 interconsultas en urgencias.', 'warning');
      return;
    }
    setForm(p => ({
      ...p,
      interconsultas_urgencias: [
        ...p.interconsultas_urgencias,
        { especialidad: '', medico_nombre: '', primer_apellido: '', segundo_apellido: '', cedula: '', curp: '' },
      ],
    }));
  }

  function removeInterconsulta(index: number) {
    setForm(p => ({
      ...p,
      interconsultas_urgencias: p.interconsultas_urgencias.filter((_, i) => i !== index),
    }));
  }

  function updateInterconsulta(index: number, field: keyof InterconsultaItem, val: string) {
    setForm(p => {
      const copy = [...p.interconsultas_urgencias];
      copy[index] = { ...copy[index], [field]: val };
      return { ...p, interconsultas_urgencias: copy };
    });
  }

  // Manejadores para Procedimientos Realizados
  function addProcedimiento() {
    if (form.procedimientos_realizados.length >= 5) {
      showToast('El formato oficial DGIS admite un máximo de 5 procedimientos.', 'warning');
      return;
    }
    setForm(p => ({
      ...p,
      procedimientos_realizados: [...p.procedimientos_realizados, { procedimiento: '', cie9: '' }],
    }));
  }

  function removeProcedimiento(index: number) {
    setForm(p => ({
      ...p,
      procedimientos_realizados: p.procedimientos_realizados.filter((_, i) => i !== index),
    }));
  }

  function updateProcedimiento(index: number, field: keyof ProcedimientoItem, val: string) {
    setForm(p => {
      const copy = [...p.procedimientos_realizados];
      copy[index] = { ...copy[index], [field]: val };
      return { ...p, procedimientos_realizados: copy };
    });
  }

  // Manejadores para Medicamentos
  function addMedicamento() {
    if (form.medicamentos_administrados.length >= 6) {
      showToast('El formato oficial DGIS admite hasta 6 medicamentos en urgencias.', 'warning');
      return;
    }
    setForm(p => ({
      ...p,
      medicamentos_administrados: [...p.medicamentos_administrados, { medicamento: '', presentacion: '' }],
    }));
  }

  function removeMedicamento(index: number) {
    setForm(p => ({
      ...p,
      medicamentos_administrados: p.medicamentos_administrados.filter((_, i) => i !== index),
    }));
  }

  function updateMedicamento(index: number, field: keyof MedicamentoItem, val: string) {
    setForm(p => {
      const copy = [...p.medicamentos_administrados];
      copy[index] = { ...copy[index], [field]: val };
      return { ...p, medicamentos_administrados: copy };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        semanas_gestacion: form.semanas_gestacion ? parseInt(form.semanas_gestacion, 10) : null,
      };
      await sinba16.create(parseInt(id!), payload);
      showToast('Formato Federal SINBA-SEUL-16-P guardado correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar formato SINBA-16.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Hoja Diaria SINBA-16?',
      message: 'Esta acción borrará permanentemente la hoja SINBA-16 de urgencias y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await sinba16.remove(parseInt(id!));
      showToast('Hoja SINBA-16 eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar hoja SINBA-16.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Cargando Hoja Diaria de Urgencias SINBA-16...</p>
      </div>
    );
  }

  const esMujer = String(pacienteData?.sexo || '').toLowerCase().startsWith('m') || String(pacienteData?.sexo || '').toLowerCase().startsWith('f');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Encabezado Principal */}
      <div className="modulo-header-sticky">
        <div>
          <Link
            to={`/pacientes/${pacienteData?.id_paciente}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#0f3f2f',
              textDecoration: 'none',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 20, color: '#0f172a' }}>
            <Siren size={24} style={{ color: '#0f3f2f' }} />
            4.15 Hoja Diaria del Servicio de Urgencias (SINBA-SEUL-16-P)
          </h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0 0' }}>
            Formato Federal Oficial DGIS SEUL-2026 — Dirección General de Información en Salud / IMSS-Bienestar
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'sinba-16'), '_blank')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 13,
              color: '#0f3f2f',
              borderColor: '#0f3f2f',
            }}
          >
            <Printer size={16} /> Ver / Imprimir Formato DGIS
          </button>
          <button
            type="submit"
            form="form-sinba16"
            className="btn btn-success"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              background: '#0f3f2f',
              borderColor: '#0f3f2f',
            }}
          >
            <Save size={16} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Formato' : 'Guardar Formato')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div
          style={{
            padding: '12px 18px',
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <span style={{ fontSize: 13.5, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo Edición:</strong> Esta Hoja de Urgencias SINBA-16 ya cuenta con registro previo. Al guardar se actualizará la base de datos oficial y el documento imprimible.
          </span>
        </div>
      )}

      {/* Datos del Maestro de Pacientes (Autocompletados y Solo Lectura) */}
      <div className="card" style={{ marginBottom: 20, border: '1px solid #cbd5e1' }}>
        <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="#0f3f2f" />
              1. Identificación del Paciente y Unidad (Autocompletado desde Expediente)
            </h3>
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#e2e8f0', borderRadius: 4, color: '#475569', fontWeight: 600 }}>
              NOM-004 / DGIS SEUL-2026
            </span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <AutoField label="CLUES Unidad" value="MCSSA004921 (HG SAN FELIPE DEL PROGRESO)" />
            <AutoField label="Folio Encuentro / Expediente" value={pacienteData?.expediente_clinico || `--`} />
            <AutoField label="Nombre del Paciente" value={`${pacienteData?.nombre || ''} ${pacienteData?.apellido_paterno || ''} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="CURP" value={pacienteData?.curp || '--'} />
            <AutoField label="Fecha de Nacimiento" value={pacienteData?.fecha_nacimiento ? new Date(pacienteData.fecha_nacimiento).toLocaleDateString('es-MX') : '--'} />
            <AutoField label="Edad" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo || '--'} />
            <AutoField label="Afiliación" value={pacienteData?.afiliacion || 'IMSS BIENESTAR'} />
            <AutoField label="Gratuidad" value={pacienteData?.gratuidad !== false ? 'SÍ (100% Gratuito)' : 'NO'} />
            <AutoField label="Indígena / Afromexicano" value={`${pacienteData?.es_indigena ? 'Indígena' : 'No indígena'} / ${pacienteData?.es_afromexicano ? 'Afromexicano' : 'No'}`} />
            <AutoField label="Domicilio Registrado" value={`${pacienteData?.domicilio || ''}, CP ${pacienteData?.domicilio_cp || '50640'}`} />
            <AutoField label="Teléfono de Contacto" value={pacienteData?.telefono || '--'} />
          </div>
        </div>
      </div>

      <form id="form-sinba16" onSubmit={handleSubmit}>
        {/* BLOQUE 1: ATENCIÓN PREHOSPITALARIA Y TIEMPOS */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} /> 2. Atención Prehospitalaria, Tiempos de Traslado e Ingreso
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label>¿Recibió Atención Prehospitalaria?</label>
                <select
                  value={form.atencion_prehospitalaria ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, atencion_prehospitalaria: e.target.value === 'true' }))}
                >
                  <option value="false">1 - No (Llegó por sus propios medios)</option>
                  <option value="true">2 - Sí (Ambulancia / Paramédicos / SUMA / Cruz Roja)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tiempo de Traslado (Horas:Minutos)</label>
                <input
                  type="text"
                  value={form.tiempo_traslado_horas}
                  onChange={(e) => setForm(p => ({ ...p, tiempo_traslado_horas: e.target.value }))}
                  placeholder="00:30"
                  pattern="[0-9]{2}:[0-9]{2}"
                  title="Formato HH:MM, por ejemplo 00:45"
                />
                <small style={{ color: '#64748b', fontSize: 11 }}>Tiempo que tardó el traslado a la unidad (ej. 00:30)</small>
              </div>

              <div className="form-group">
                <label>Fecha y Hora de Ingreso / Recepción *</label>
                <input
                  type="datetime-local"
                  value={form.fecha_hora_ingreso}
                  onChange={(e) => setForm(p => ({ ...p, fecha_hora_ingreso: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha y Hora de Alta / Egreso de Urgencias</label>
                <input
                  type="datetime-local"
                  value={form.fecha_hora_alta}
                  onChange={(e) => setForm(p => ({ ...p, fecha_hora_alta: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: CLASIFICACIÓN DE TRIAGE, MOTIVO Y CAMA */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} /> 3. Triage, Clasificación del Motivo y Ubicación en Urgencias
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label>Tipo de Urgencia (Triage DGIS) *</label>
                <select
                  value={form.tipo_urgencia}
                  onChange={(e) => setForm(p => ({ ...p, tipo_urgencia: e.target.value }))}
                >
                  <option value="Urgencia calificada">1 - Urgencia calificada (Rojo / Naranja / Amarillo)</option>
                  <option value="Urgencia no calificada">2 - Urgencia no calificada (Verde / Azul)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Motivo de Atención *</label>
                <select
                  value={form.motivo_atencion}
                  onChange={(e) => setForm(p => ({ ...p, motivo_atencion: e.target.value }))}
                >
                  <option value="Médico">1 - Causa Médica general</option>
                  <option value="Accidente/envenenamiento y violencia">2 - Accidente / Violencia / Envenenamiento / Lesión</option>
                  <option value="Gineco-obstétrico">3 - Gineco-obstétrico</option>
                  <option value="Pediátrico">4 - Pediátrico</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ubicación / Cama de Urgencias *</label>
                <select
                  value={form.tipo_caso}
                  onChange={(e) => setForm(p => ({ ...p, tipo_caso: e.target.value }))}
                >
                  <option value="Caso de observación">1 - Cama de Observación adultos / pediatría</option>
                  <option value="Caso de choque">2 - Cama de Choque / Reanimación</option>
                  <option value="Sin cama">3 - Sin cama (Atención rápida ambulatoria)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Alta por (Destino al Egreso) *</label>
                <select
                  value={form.alta_por}
                  onChange={(e) => setForm(p => ({ ...p, alta_por: e.target.value }))}
                >
                  <option value="Domicilio">1 - Domicilio (Alta médica ambulatoria)</option>
                  <option value="Hospitalización">2 - Pase a Hospitalización</option>
                  <option value="Consulta externa">3 - Cita a Consulta Externa</option>
                  <option value="Traslado a otra unidad médica">4 - Traslado a otra unidad médica (Referencia)</option>
                  <option value="Defunción">5 - Defunción en urgencias</option>
                  <option value="Fuga">6 - Fuga</option>
                  <option value="Voluntad propia">7 - Alta voluntaria / Por voluntad propia</option>
                </select>
              </div>

              <div className="form-group">
                <label>¿Traslado Transitorio / Transferido?</label>
                <select
                  value={form.traslado_transferido ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, traslado_transferido: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Paciente transferido temporal o definitivamente)</option>
                </select>
              </div>

              {form.traslado_transferido && (
                <div className="form-group">
                  <label>CLUES / Unidad Médica Receptora</label>
                  <input
                    type="text"
                    value={form.destino_unidad}
                    onChange={(e) => setForm(p => ({ ...p, destino_unidad: e.target.value }))}
                    placeholder="Ej. MCSSA001234 - Hospital General Atlacomulco"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 3: SALUD REPRODUCTIVA (MUJERES EN EDAD FÉRTIL) */}
        <div className="card" style={{ marginBottom: 20, borderLeft: esMujer ? '4px solid #db2777' : undefined }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#be185d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Baby size={16} /> 4. Salud Reproductiva (Mujeres de 10 a 54 años)
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label>Condición al Momento de la Atención</label>
                <select
                  value={form.mujer_edad_fertil}
                  onChange={(e) => setForm(p => ({ ...p, mujer_edad_fertil: e.target.value }))}
                >
                  <option value="No estaba embarazada ni en puerperio">1 - No estaba embarazada ni en puerperio (o No aplica)</option>
                  <option value="Embarazo">2 - Embarazo activo</option>
                  <option value="Puerperio">3 - Puerperio (hasta 42 días postparto)</option>
                </select>
              </div>

              {form.mujer_edad_fertil === 'Embarazo' && (
                <div className="form-group">
                  <label>Semanas de Gestación (SDG)</label>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={form.semanas_gestacion}
                    onChange={(e) => setForm(p => ({ ...p, semanas_gestacion: e.target.value }))}
                    placeholder="Ej. 34"
                  />
                  <small style={{ color: '#64748b', fontSize: 11 }}>Semanas de embarazo calculadas (FUM / USG)</small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 4: DIAGNÓSTICO PRINCIPAL Y COMORBILIDADES */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} /> 5. Diagnósticos al Egreso y Codificación CIE-10 (DGIS SEUL-2026)
            </h3>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>Afección principal obligatoria + hasta 5 comorbilidades</span>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: '3fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="form-group">
                <label>Afección Principal (Diagnóstico de Mayor Consumo de Recursos) *</label>
                <input
                  type="text"
                  value={form.afeccion_principal}
                  onChange={(e) => setForm(p => ({ ...p, afeccion_principal: e.target.value }))}
                  placeholder="Ej. Apendicitis aguda no especificada / Gastroenteritis aguda"
                  required
                />
              </div>

              <div className="form-group">
                <label>Código CIE-10 Principal *</label>
                <input
                  type="text"
                  value={form.afeccion_principal_cie}
                  onChange={(e) => setForm(p => ({ ...p, afeccion_principal_cie: e.target.value.toUpperCase() }))}
                  placeholder="Ej. K35.8"
                  required
                  style={{ fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                />
              </div>
            </div>

            {/* Comorbilidades dinámicas */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                  Comorbilidades / Diagnósticos Secundarios Concurrentes ({form.comorbilidades.length} / 5)
                </span>
                {form.comorbilidades.length < 5 && (
                  <button
                    type="button"
                    onClick={addComorbilidad}
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={14} /> Agregar Comorbilidad
                  </button>
                )}
              </div>

              {form.comorbilidades.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                  Sin comorbilidades secundarias registradas. Haga clic en "+ Agregar Comorbilidad" si el paciente presenta diabetes, hipertensión u otra condición concomitante.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.comorbilidades.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 3fr 1fr 40px',
                        gap: 10,
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>#{idx + 1}</span>
                      <input
                        type="text"
                        value={item.diagnostico}
                        onChange={(e) => updateComorbilidad(idx, 'diagnostico', e.target.value)}
                        placeholder="Descripción de la comorbilidad (ej. Diabetes mellitus tipo 2)"
                        style={{ fontSize: 12.5 }}
                      />
                      <input
                        type="text"
                        value={item.cie10}
                        onChange={(e) => updateComorbilidad(idx, 'cie10', e.target.value.toUpperCase())}
                        placeholder="CIE-10 (ej. E11.9)"
                        style={{ fontSize: 12.5, fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeComorbilidad(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                        title="Eliminar fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 5: CAUSA EXTERNA Y HOJA DE LESIONES / VIOLENCIA */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#d97706" /> 6. Causa Externa de Traumatismos y Notificación de Lesiones / Violencia
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Causa Externa (Mecanismo de la Lesión o Intoxicación)</label>
                <input
                  type="text"
                  value={form.causa_externa}
                  onChange={(e) => setForm(p => ({ ...p, causa_externa: e.target.value }))}
                  placeholder="Ej. Caída de propia altura en domicilio / Colisión de vehículo automotor contra objeto fijo"
                />
                <small style={{ color: '#64748b', fontSize: 11 }}>Solo para pacientes atendidos por traumatismos, quemaduras, agresiones o accidentes</small>
              </div>

              <div className="form-group">
                <label>¿Se emitió Hoja de Lesiones o Violencia?</label>
                <select
                  value={form.hoja_lesiones_violencia ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, hoja_lesiones_violencia: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Sistema de Vigilancia Epidemiológica de Lesiones / Violencia)</option>
                </select>
              </div>

              {form.hoja_lesiones_violencia && (
                <div className="form-group">
                  <label>Folio de la Hoja de Lesiones / Notificación</label>
                  <input
                    type="text"
                    value={form.hoja_lesiones_folio}
                    onChange={(e) => setForm(p => ({ ...p, hoja_lesiones_folio: e.target.value }))}
                    placeholder="Ej. LES-2026-00412"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 6: INTERCONSULTAS SOLICITADAS EN URGENCIAS */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartPulse size={16} /> 7. Interconsultas Solicitadas en Urgencias (Hasta 3 en Formato DGIS)
            </h3>
            {form.interconsultas_urgencias.length < 3 && (
              <button
                type="button"
                onClick={addInterconsulta}
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> Agregar Interconsulta
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            {form.interconsultas_urgencias.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                No se solicitaron interconsultas durante la estancia en urgencias.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {form.interconsultas_urgencias.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f3f2f' }}>
                        Interconsulta #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInterconsulta(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                        title="Eliminar interconsulta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Especialidad Interconsultada</label>
                        <input
                          type="text"
                          value={it.especialidad}
                          onChange={(e) => updateInterconsulta(idx, 'especialidad', e.target.value)}
                          placeholder="Ej. Traumatología / Cirugía General"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Nombre(s) del Médico</label>
                        <input
                          type="text"
                          value={it.medico_nombre}
                          onChange={(e) => updateInterconsulta(idx, 'medico_nombre', e.target.value)}
                          placeholder="Nombre(s)"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Primer Apellido</label>
                        <input
                          type="text"
                          value={it.primer_apellido}
                          onChange={(e) => updateInterconsulta(idx, 'primer_apellido', e.target.value)}
                          placeholder="Apellido paterno"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Segundo Apellido</label>
                        <input
                          type="text"
                          value={it.segundo_apellido}
                          onChange={(e) => updateInterconsulta(idx, 'segundo_apellido', e.target.value)}
                          placeholder="Apellido materno"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Cédula Profesional</label>
                        <input
                          type="text"
                          value={it.cedula}
                          onChange={(e) => updateInterconsulta(idx, 'cedula', e.target.value)}
                          placeholder="Cédula"
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>CURP del Especialista</label>
                        <input
                          type="text"
                          value={it.curp}
                          onChange={(e) => updateInterconsulta(idx, 'curp', e.target.value.toUpperCase())}
                          placeholder="CURP (18 caracteres)"
                          style={{ fontSize: 12, fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 7: PROCEDIMIENTOS REALIZADOS EN URGENCIAS (CIE-9 MC) */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} /> 8. Procedimientos Realizados en Urgencias (CIE-9 MC) — Hasta 5
            </h3>
            {form.procedimientos_realizados.length < 5 && (
              <button
                type="button"
                onClick={addProcedimiento}
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> Agregar Procedimiento
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            {form.procedimientos_realizados.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                Sin procedimientos invasivos o curaciones registradas. Haga clic en "+ Agregar Procedimiento" para registrar suturas, intubación, lavado gástrico, sondaje o curación.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.procedimientos_realizados.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 3fr 1fr 40px',
                      gap: 10,
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>#{idx + 1}</span>
                    <input
                      type="text"
                      value={it.procedimiento}
                      onChange={(e) => updateProcedimiento(idx, 'procedimiento', e.target.value)}
                      placeholder="Descripción del procedimiento (ej. Sutura de herida en antebrazo / Intubación endotraqueal)"
                      style={{ fontSize: 12.5 }}
                    />
                    <input
                      type="text"
                      value={it.cie9}
                      onChange={(e) => updateProcedimiento(idx, 'cie9', e.target.value.toUpperCase())}
                      placeholder="CIE-9 MC (ej. 86.59)"
                      style={{ fontSize: 12.5, fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeProcedimiento(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      title="Eliminar fila"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 8: MEDICAMENTOS ADMINISTRADOS EN URGENCIAS */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={16} /> 9. Medicamentos Administrados en Urgencias — Hasta 6
            </h3>
            {form.medicamentos_administrados.length < 6 && (
              <button
                type="button"
                onClick={addMedicamento}
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> Agregar Medicamento
              </button>
            )}
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            {form.medicamentos_administrados.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                Sin fármacos registrados durante la atención en urgencias.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.medicamentos_administrados.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 2fr 2fr 40px',
                      gap: 10,
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>#{idx + 1}</span>
                    <input
                      type="text"
                      value={it.medicamento}
                      onChange={(e) => updateMedicamento(idx, 'medicamento', e.target.value)}
                      placeholder="Nombre del medicamento (ej. Paracetamol solución / Solución Hartman)"
                      style={{ fontSize: 12.5 }}
                    />
                    <input
                      type="text"
                      value={it.presentacion}
                      onChange={(e) => updateMedicamento(idx, 'presentacion', e.target.value)}
                      placeholder="Presentación / Dosis / Vía (ej. 1g IV DU / 1000 ml IV para 8 hrs)"
                      style={{ fontSize: 12.5 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeMedicamento(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      title="Eliminar fila"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BLOQUE 9: MÉDICO RESPONSABLE */}
        <div className="card" style={{ marginBottom: 30 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} /> 10. Médico Responsable de la Atención en Urgencias
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <SelectorPersonalMedico
                  label="Médico Responsable *"
                  nombre={form.medico_responsable}
                  cedula={form.medico_cedula}
                  onChange={(nom, ced) => {
                    setForm(p => ({
                      ...p,
                      medico_responsable: nom,
                      ...(ced !== undefined ? { medico_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico responsable del servicio de urgencias --"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cédula Profesional *</label>
                <input
                  type="text"
                  value={form.medico_cedula}
                  onChange={(e) => setForm(p => ({ ...p, medico_cedula: e.target.value }))}
                  placeholder="Ej. 12345678"
                  required
                />
              </div>

              <div className="form-group">
                <label>CURP del Médico Responsable</label>
                <input
                  type="text"
                  value={form.medico_curp}
                  onChange={(e) => setForm(p => ({ ...p, medico_curp: e.target.value.toUpperCase() }))}
                  placeholder="CURP (18 caracteres)"
                  style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES INFERIOR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Volver al Expediente
          </Link>

          <div style={{ display: 'flex', gap: 12 }}>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={16} /> Eliminar Registro
              </button>
            )}

            <button
              type="submit"
              className="btn btn-success"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 700,
                background: '#0f3f2f',
                borderColor: '#0f3f2f',
              }}
            >
              <Save size={16} /> {saving ? 'Guardando en Base de Datos...' : (isEdit ? 'Actualizar Formato SINBA-16' : 'Guardar y Certificar Formato SINBA-16')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
