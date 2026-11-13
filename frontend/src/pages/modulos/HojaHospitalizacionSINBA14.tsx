import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sinba14, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import {
  Building2,
  Save,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Stethoscope,
  Activity,
  Baby,
  AlertTriangle,
  FileText,
  Calendar,
  HeartPulse,
  Scale,
  Bed,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

interface ComorbilidadItem {
  diagnostico: string;
  cie10: string;
}

interface ProcedimientoQuirurgicoItem {
  procedimiento: string;
  cie9: string;
  en_quirofano: boolean;
}

export default function HojaHospitalizacionSINBA14Mod() {
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
    folio: 'HOSP-SINBA-001',
    gratuidad: true,
    nacio_en_hospital: false,
    peso_kg: '',
    talla_cm: '',
    tipo_servicio: 'Hospitalización',
    fecha_ingreso: new Date().toISOString().substring(0, 10),
    fecha_egreso: '',
    dias_uti: 0,
    dias_terapia_intermedia: 0,
    procedencia: 'Urgencias',
    motivo_egreso: 'Mejoría',
    mujer_edad_fertil: 'No estaba embarazada ni en puerperio',
    gesta: '',
    para: '',
    abortos: '',
    cesareas: '',
    semanas_gestacion: '',
    tipo_parto: 'No aplica',
    producto_embarazo: 'No aplica',
    metodo_planificacion_familiar: 'Ninguna',
    afeccion_principal: '',
    afeccion_principal_cie: '',
    afeccion_primera_vez: true,
    comorbilidades: [] as ComorbilidadItem[],
    causa_externa: '',
    infeccion_intrahospitalaria: false,
    procedimientos_quirurgicos: [] as ProcedimientoQuirurgicoItem[],
    tipo_anestesia: 'No usó',
    hoja_lesiones_violencia: false,
    hoja_lesiones_folio: '',
    tipo_unidad_egreso: 'Hospital General',
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

      const sRes = await sinba14.get(parseInt(id!));
      if (sRes.success && sRes.data) {
        setIsEdit(Boolean(sRes.data.id_sinba14));
        const item = sRes.data;

        // Cargar comorbilidades y procedimientos quirúrgicos
        const loadedComorbs = parseJsonArray<ComorbilidadItem>(item.comorbilidades);
        const loadedProcs = parseJsonArray<ProcedimientoQuirurgicoItem>(item.procedimientos_quirurgicos);

        setForm({
          clues: item.clues || 'MCSSA004921',
          folio: item.folio || `HOSP-${id}`,
          gratuidad: item.gratuidad !== false,
          nacio_en_hospital: Boolean(item.nacio_en_hospital),
          peso_kg: item.peso_kg !== null && item.peso_kg !== undefined ? String(item.peso_kg) : '',
          talla_cm: item.talla_cm !== null && item.talla_cm !== undefined ? String(item.talla_cm) : '',
          tipo_servicio: item.tipo_servicio || 'Hospitalización',
          fecha_ingreso: item.fecha_ingreso
            ? String(item.fecha_ingreso).substring(0, 10)
            : new Date().toISOString().substring(0, 10),
          fecha_egreso: item.fecha_egreso
            ? String(item.fecha_egreso).substring(0, 10)
            : '',
          dias_uti: item.dias_uti || 0,
          dias_terapia_intermedia: item.dias_terapia_intermedia || 0,
          procedencia: item.procedencia || 'Urgencias',
          motivo_egreso: item.motivo_egreso || 'Mejoría',
          mujer_edad_fertil: item.mujer_edad_fertil || 'No estaba embarazada ni en puerperio',
          gesta: item.gesta !== null && item.gesta !== undefined ? String(item.gesta) : '',
          para: item.para !== null && item.para !== undefined ? String(item.para) : '',
          abortos: (item.abortos ?? item.aborto) !== null && (item.abortos ?? item.aborto) !== undefined ? String(item.abortos ?? item.aborto) : '',
          cesareas: (item.cesareas ?? item.cesarea) !== null && (item.cesareas ?? item.cesarea) !== undefined ? String(item.cesareas ?? item.cesarea) : '',
          semanas_gestacion: item.semanas_gestacion !== null && item.semanas_gestacion !== undefined ? String(item.semanas_gestacion) : '',
          tipo_parto: item.tipo_parto || 'No aplica',
          producto_embarazo: item.producto_embarazo || 'No aplica',
          metodo_planificacion_familiar: item.metodo_planificacion_familiar || 'Ninguna',
          afeccion_principal: item.afeccion_principal || '',
          afeccion_principal_cie: item.afeccion_principal_cie || '',
          afeccion_primera_vez: item.afeccion_primera_vez !== false,
          comorbilidades: loadedComorbs,
          causa_externa: item.causa_externa || '',
          infeccion_intrahospitalaria: Boolean(item.infeccion_intrahospitalaria),
          procedimientos_quirurgicos: loadedProcs,
          tipo_anestesia: item.tipo_anestesia || 'No usó',
          hoja_lesiones_violencia: Boolean(item.hoja_lesiones_violencia),
          hoja_lesiones_folio: item.hoja_lesiones_folio || '',
          tipo_unidad_egreso: item.tipo_unidad_egreso || 'Hospital General',
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
    if (form.comorbilidades.length >= 6) {
      showToast('El formato oficial DGIS admite hasta 6 comorbilidades.', 'warning');
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

  // Manejadores para Procedimientos Quirúrgicos
  function addProcedimiento() {
    if (form.procedimientos_quirurgicos.length >= 8) {
      showToast('El formato oficial DGIS admite hasta 8 procedimientos.', 'warning');
      return;
    }
    setForm(p => ({
      ...p,
      procedimientos_quirurgicos: [...p.procedimientos_quirurgicos, { procedimiento: '', cie9: '', en_quirofano: true }],
    }));
  }

  function removeProcedimiento(index: number) {
    setForm(p => ({
      ...p,
      procedimientos_quirurgicos: p.procedimientos_quirurgicos.filter((_, i) => i !== index),
    }));
  }

  function updateProcedimiento(index: number, field: keyof ProcedimientoQuirurgicoItem, val: any) {
    setForm(p => {
      const copy = [...p.procedimientos_quirurgicos];
      copy[index] = { ...copy[index], [field]: val };
      return { ...p, procedimientos_quirurgicos: copy };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        talla_cm: form.talla_cm ? parseInt(form.talla_cm, 10) : null,
        dias_uti: parseInt(String(form.dias_uti), 10) || 0,
        dias_terapia_intermedia: parseInt(String(form.dias_terapia_intermedia), 10) || 0,
        gesta: form.gesta !== '' ? parseInt(String(form.gesta), 10) : null,
        para: form.para !== '' ? parseInt(String(form.para), 10) : null,
        abortos: form.abortos !== '' ? parseInt(String(form.abortos), 10) : null,
        cesareas: form.cesareas !== '' ? parseInt(String(form.cesareas), 10) : null,
        semanas_gestacion: form.semanas_gestacion !== '' ? parseInt(String(form.semanas_gestacion), 10) : null,
      };
      await sinba14.create(parseInt(id!), payload);
      showToast('Formato Federal SINBA-SEUL-14-P guardado correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar formato SINBA-14.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Hoja SINBA-14?',
      message: 'Esta acción borrará permanentemente la hoja SINBA-14 de hospitalización y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await sinba14.remove(parseInt(id!));
      showToast('Hoja SINBA-14 eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar hoja SINBA-14.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Cargando Hoja de Hospitalización SINBA-14...</p>
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
            <Building2 size={24} style={{ color: '#0f3f2f' }} />
            4.14 Hoja de Hospitalización (SINBA-SEUL-14-P DGIS)
          </h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0 0' }}>
            Formato Federal Oficial DGIS SEUL-2026 — Dirección General de Información en Salud / IMSS-Bienestar
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'sinba-14'), '_blank')}
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
            form="form-sinba14"
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
            ✏️ <strong>Modo Edición:</strong> Formato SINBA-14 previamente registrado. Puede modificar cualquier campo clínico y actualizar el reporte oficial.
          </span>
        </div>
      )}

      {/* Datos Autocompletados desde Maestro */}
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
            <AutoField label="Edad Calculada" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo || '--'} />
            <AutoField label="Estado Conyugal" value={pacienteData?.estado_civil || 'No especificado'} />
            <AutoField label="Afiliación" value={pacienteData?.afiliacion || 'IMSS BIENESTAR'} />
            <AutoField label="Gratuidad" value={pacienteData?.gratuidad !== false ? 'SÍ (100% Gratuito)' : 'NO'} />
            <AutoField label="Autoadscripción Indígena" value={pacienteData?.es_indigena ? 'SÍ' : 'NO'} />
            <AutoField label="Comunidad LGBT+" value={pacienteData?.comunidad_lgbt ? 'SÍ' : 'NO'} />
            <AutoField label="Domicilio Registrado" value={`${pacienteData?.domicilio || ''}, CP ${pacienteData?.domicilio_cp || '50640'}`} />
            <AutoField label="Teléfono de Contacto" value={pacienteData?.telefono || '--'} />
          </div>
        </div>
      </div>

      <form id="form-sinba14" onSubmit={handleSubmit}>
        {/* BLOQUE 1: ADMISIÓN, SOMATOMETRÍA Y ESTANCIA */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bed size={16} /> 2. Admisión, Somatometría y Estancia Hospitalaria
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label>Tipo de Servicio *</label>
                <select
                  value={form.tipo_servicio}
                  onChange={(e) => setForm(p => ({ ...p, tipo_servicio: e.target.value }))}
                >
                  <option value="Hospitalización">1 - Hospitalización (Normal)</option>
                  <option value="Corta estancia">2 - Corta estancia</option>
                </select>
              </div>

              <div className="form-group">
                <label>¿Nació en el Hospital?</label>
                <select
                  value={form.nacio_en_hospital ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, nacio_en_hospital: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Recién nacido en la unidad)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Peso al Ingreso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="300"
                  value={form.peso_kg}
                  onChange={(e) => setForm(p => ({ ...p, peso_kg: e.target.value }))}
                  placeholder="Ej. 65.50"
                />
              </div>

              <div className="form-group">
                <label>Talla al Ingreso (cm)</label>
                <input
                  type="number"
                  min="20"
                  max="250"
                  value={form.talla_cm}
                  onChange={(e) => setForm(p => ({ ...p, talla_cm: e.target.value }))}
                  placeholder="Ej. 162"
                />
              </div>

              <div className="form-group">
                <label>Fecha de Ingreso *</label>
                <input
                  type="date"
                  value={form.fecha_ingreso}
                  onChange={(e) => setForm(p => ({ ...p, fecha_ingreso: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha de Egreso Hospitalario</label>
                <input
                  type="date"
                  value={form.fecha_egreso}
                  onChange={(e) => setForm(p => ({ ...p, fecha_egreso: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Días en Terapia Intensiva (UTI)</label>
                <input
                  type="number"
                  min="0"
                  value={form.dias_uti}
                  onChange={(e) => setForm(p => ({ ...p, dias_uti: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label>Días en Terapia Intermedia</label>
                <input
                  type="number"
                  min="0"
                  value={form.dias_terapia_intermedia}
                  onChange={(e) => setForm(p => ({ ...p, dias_terapia_intermedia: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label>Procedencia *</label>
                <select
                  value={form.procedencia}
                  onChange={(e) => setForm(p => ({ ...p, procedencia: e.target.value }))}
                >
                  <option value="Urgencias">1 - Urgencias</option>
                  <option value="Consulta externa">2 - Consulta externa</option>
                  <option value="Referida">3 - Referida de otra unidad</option>
                  <option value="Cunero patológico">4 - Cunero patológico</option>
                  <option value="Otra">5 - Otra</option>
                </select>
              </div>

              <div className="form-group">
                <label>Motivo de Egreso *</label>
                <select
                  value={form.motivo_egreso}
                  onChange={(e) => setForm(p => ({ ...p, motivo_egreso: e.target.value }))}
                >
                  <option value="Mejoría">1 - Mejoría</option>
                  <option value="Curación">2 - Curación</option>
                  <option value="Voluntaria">3 - Alta voluntaria</option>
                  <option value="Traslado">4 - Traslado a otra unidad médica</option>
                  <option value="Defunción">5 - Defunción</option>
                  <option value="Fuga">6 - Fuga</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: SALUD REPRODUCTIVA E HISTORIA GINECO-OBSTÉTRICA */}
        <div className="card" style={{ marginBottom: 20, borderLeft: esMujer ? '4px solid #db2777' : undefined }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#be185d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Baby size={16} /> 3. Salud Reproductiva e Historia Gineco-obstétrica (Mujeres en Edad Fértil 10 a 54 años)
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Condición al Egreso (Mujer en Edad Fértil)</label>
                <select
                  value={form.mujer_edad_fertil}
                  onChange={(e) => setForm(p => ({ ...p, mujer_edad_fertil: e.target.value }))}
                >
                  <option value="No estaba embarazada ni en puerperio">1 - No estaba embarazada ni en puerperio (o No aplica)</option>
                  <option value="Embarazo">2 - Embarazo activo</option>
                  <option value="Puerperio">3 - Puerperio (hasta 42 días postparto)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Gestas (G)</label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={form.gesta}
                  onChange={(e) => setForm(p => ({ ...p, gesta: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Partos (P)</label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={form.para}
                  onChange={(e) => setForm(p => ({ ...p, para: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Abortos (A)</label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={form.abortos}
                  onChange={(e) => setForm(p => ({ ...p, abortos: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Cesáreas (C)</label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={form.cesareas}
                  onChange={(e) => setForm(p => ({ ...p, cesareas: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Semanas de Gestación</label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={form.semanas_gestacion}
                  onChange={(e) => setForm(p => ({ ...p, semanas_gestacion: e.target.value }))}
                  placeholder="Ej. 39"
                />
              </div>

              <div className="form-group">
                <label>Tipo de Parto</label>
                <select
                  value={form.tipo_parto}
                  onChange={(e) => setForm(p => ({ ...p, tipo_parto: e.target.value }))}
                >
                  <option value="No aplica">0 - No aplica</option>
                  <option value="Eutócico">1 - Eutócico (Vaginal normal)</option>
                  <option value="Distócico">2 - Distócico (Instrumentado)</option>
                  <option value="Cesárea">3 - Cesárea</option>
                </select>
              </div>

              <div className="form-group">
                <label>Producto del Embarazo</label>
                <select
                  value={form.producto_embarazo}
                  onChange={(e) => setForm(p => ({ ...p, producto_embarazo: e.target.value }))}
                >
                  <option value="No aplica">0 - No aplica</option>
                  <option value="Único">1 - Único</option>
                  <option value="Gemelar">2 - Gemelar</option>
                  <option value="Tres o más">3 - Tres o más productos</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Método de Planificación Familiar al Egreso</label>
                <select
                  value={form.metodo_planificacion_familiar}
                  onChange={(e) => setForm(p => ({ ...p, metodo_planificacion_familiar: e.target.value }))}
                >
                  <option value="Ninguna">0 - Ninguno / No aceptó método</option>
                  <option value="DIU de cobre / medicado">1 - DIU (Dispositivo Intrauterino T de cobre / medicado)</option>
                  <option value="OTB (Salpingoclasia)">2 - OTB (Oclusión Tubárica Bilateral / Salpingoclasia)</option>
                  <option value="Oral hormonal">3 - Anticonceptivo hormonal oral</option>
                  <option value="Inyectable">4 - Hormonal inyectable (mensual / bimensual)</option>
                  <option value="Implante subdérmico">5 - Implante subdérmico</option>
                  <option value="Preservativo">6 - Preservativo masculino o femenino</option>
                  <option value="Vasectomía">7 - Pareja con vasectomía</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 3: DIAGNÓSTICO PRINCIPAL Y COMORBILIDADES (CIE-10) */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} /> 4. Diagnósticos al Egreso y Codificación CIE-10 (DGIS SEUL-2026)
            </h3>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>Afección principal obligatoria + hasta 6 comorbilidades</span>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: '3fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="form-group">
                <label>Afección Principal (Diagnóstico de Mayor Consumo de Recursos) *</label>
                <input
                  type="text"
                  value={form.afeccion_principal}
                  onChange={(e) => setForm(p => ({ ...p, afeccion_principal: e.target.value }))}
                  placeholder="Ej. Colelitiasis con colecistitis crónica litiásica / Apendicitis aguda"
                  required
                />
              </div>

              <div className="form-group">
                <label>Código CIE-10 Principal *</label>
                <input
                  type="text"
                  value={form.afeccion_principal_cie}
                  onChange={(e) => setForm(p => ({ ...p, afeccion_principal_cie: e.target.value.toUpperCase() }))}
                  placeholder="Ej. K80.2"
                  required
                  style={{ fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group">
                <label>¿Atención Primera Vez en el Año?</label>
                <select
                  value={form.afeccion_primera_vez ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, afeccion_primera_vez: e.target.value === 'true' }))}
                >
                  <option value="true">1 - Primera vez</option>
                  <option value="false">2 - Subsecuente</option>
                </select>
              </div>
            </div>

            {/* Comorbilidades dinámicas */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                  Comorbilidades / Afecciones Concomitantes ({form.comorbilidades.length} / 6)
                </span>
                {form.comorbilidades.length < 6 && (
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
                  Sin comorbilidades concurrentes registradas. Haga clic en "+ Agregar Comorbilidad" si el paciente presenta diabetes, hipertensión, obesidad u otra afección secundaria.
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
                        placeholder="Descripción de la comorbilidad (ej. Hipertensión arterial esencial primaria)"
                        style={{ fontSize: 12.5 }}
                      />
                      <input
                        type="text"
                        value={item.cie10}
                        onChange={(e) => updateComorbilidad(idx, 'cie10', e.target.value.toUpperCase())}
                        placeholder="CIE-10 (ej. I10.X)"
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

            <div className="form-grid" style={{ gridTemplateColumns: '3fr 1fr', gap: 14, marginTop: 16 }}>
              <div className="form-group">
                <label>Causa Externa (Traumatismos, lesiones o intoxicaciones)</label>
                <input
                  type="text"
                  value={form.causa_externa}
                  onChange={(e) => setForm(p => ({ ...p, causa_externa: e.target.value }))}
                  placeholder="Acontecimientos o circunstancias que motivaron el traumatismo o lesión"
                />
              </div>

              <div className="form-group">
                <label>¿Infección Intrahospitalaria (IAAS)?</label>
                <select
                  value={form.infeccion_intrahospitalaria ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, infeccion_intrahospitalaria: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Infección Asociada a la Atención en Salud)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 4: PROCEDIMIENTOS QUIRÚRGICOS Y ANESTESIA (CIE-9 MC) */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} /> 5. Procedimientos Quirúrgicos y Obstétricos Realizados (CIE-9 MC) — Hasta 8
            </h3>
            {form.procedimientos_quirurgicos.length < 8 && (
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
            {form.procedimientos_quirurgicos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                Sin intervenciones quirúrgicas u obstétricas registradas durante este episodio.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.procedimientos_quirurgicos.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 3fr 1fr 140px 40px',
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
                      placeholder="Descripción del procedimiento (ej. Colecistectomía laparoscópica / Cesárea tipo Kerr)"
                      style={{ fontSize: 12.5 }}
                    />
                    <input
                      type="text"
                      value={it.cie9}
                      onChange={(e) => updateProcedimiento(idx, 'cie9', e.target.value.toUpperCase())}
                      placeholder="CIE-9 (ej. 51.23)"
                      style={{ fontSize: 12.5, fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase' }}
                    />
                    <select
                      value={it.en_quirofano ? 'true' : 'false'}
                      onChange={(e) => updateProcedimiento(idx, 'en_quirofano', e.target.value === 'true')}
                      style={{ fontSize: 12 }}
                    >
                      <option value="true">En Quirófano</option>
                      <option value="false">Fuera Quirófano</option>
                    </select>
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

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
              <div className="form-group">
                <label>Tipo de Anestesia Utilizada</label>
                <select
                  value={form.tipo_anestesia}
                  onChange={(e) => setForm(p => ({ ...p, tipo_anestesia: e.target.value }))}
                >
                  <option value="No usó">0 - No usó anestesia</option>
                  <option value="General">1 - General (Inhalatoria / Balanceada)</option>
                  <option value="Regional">2 - Regional (Bloqueo peridural / Raquídeo)</option>
                  <option value="Sedación">3 - Sedación</option>
                  <option value="Local">4 - Local</option>
                  <option value="Combinada">5 - Combinada</option>
                </select>
              </div>

              <div className="form-group">
                <label>¿Hoja de Notificación de Violencia / Lesión?</label>
                <select
                  value={form.hoja_lesiones_violencia ? 'true' : 'false'}
                  onChange={(e) => setForm(p => ({ ...p, hoja_lesiones_violencia: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Sí (Sistema de Vigilancia Epidemiológica)</option>
                </select>
              </div>

              {form.hoja_lesiones_violencia && (
                <div className="form-group">
                  <label>Folio de la Hoja de Lesiones</label>
                  <input
                    type="text"
                    value={form.hoja_lesiones_folio}
                    onChange={(e) => setForm(p => ({ ...p, hoja_lesiones_folio: e.target.value }))}
                    placeholder="Ej. LES-HOSP-2026-009"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 5: MÉDICO RESPONSABLE DEL EGRESO */}
        <div className="card" style={{ marginBottom: 30 }}>
          <div className="card-header" style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13.5, color: '#0f3f2f', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} /> 6. Médico Responsable del Egreso Hospitalario
            </h3>
          </div>
          <div className="card-body" style={{ padding: 18 }}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <SelectorPersonalMedico
                  label="Médico Responsable del Egreso *"
                  nombre={form.medico_responsable}
                  cedula={form.medico_cedula}
                  onChange={(nom, ced) => {
                    setForm(p => ({
                      ...p,
                      medico_responsable: nom,
                      ...(ced !== undefined ? { medico_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico tratante / responsable del egreso --"
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
              <Save size={16} /> {saving ? 'Guardando en Base de Datos...' : (isEdit ? 'Actualizar Formato SINBA-14' : 'Guardar y Certificar Formato SINBA-14')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
