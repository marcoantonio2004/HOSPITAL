import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { encuentro, historiaClinica } from '../../services/api';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { FileText, Save, CheckCircle2, Trash2, Printer, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

const APARATOS = [
  { prefix: 'int_aparato_cardiovascular', label: 'Cardiovascular' },
  { prefix: 'int_aparato_respiratorio', label: 'Respiratorio' },
  { prefix: 'int_aparato_digestivo', label: 'Gastrointestinal' },
  { prefix: 'int_aparato_genitourinario', label: 'Genitourinario' },
  { prefix: 'int_aparato_hematico', label: 'Hemático y linfático' },
  { prefix: 'int_aparato_endocrino', label: 'Endócrino' },
  { prefix: 'int_aparato_neurologico', label: 'Nervioso' },
  { prefix: 'int_aparato_musculoesqueletico', label: 'Musculoesquelético' },
  { prefix: 'int_aparato_piel_anexos', label: 'Piel, mucosas y anexos' },
];

export default function HistoriaClinica() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encData, setEncData] = useState<any>(null);
  const [, setHcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('identificacion');
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    tipo_interrogatorio: 'Directo',
    fecha: new Date().toISOString().substring(0, 10),
    hora: new Date().toTimeString().substring(0, 5),
    ocupacion: '',
    grupo_etnico: '',
    antecedentes_heredofamiliares: '',
    antecedentes_no_patologicos: '',
    antecedentes_patologicos: '',
    antecedentes_gineco_obstetricos: '',
    padecimiento_actual: '',
    int_aparato_cardiovascular_niega: true, int_aparato_cardiovascular_observaciones: '',
    int_aparato_respiratorio_niega: true, int_aparato_respiratorio_observaciones: '',
    int_aparato_digestivo_niega: true, int_aparato_digestivo_observaciones: '',
    int_aparato_genitourinario_niega: true, int_aparato_genitourinario_observaciones: '',
    int_aparato_hematico_niega: true, int_aparato_hematico_observaciones: '',
    int_aparato_endocrino_niega: true, int_aparato_endocrino_observaciones: '',
    int_aparato_neurologico_niega: true, int_aparato_neurologico_observaciones: '',
    int_aparato_musculoesqueletico_niega: true, int_aparato_musculoesqueletico_observaciones: '',
    int_aparato_piel_anexos_niega: true, int_aparato_piel_anexos_observaciones: '',
    habitus_exterior: '',
    ef_cabeza: '', ef_cuello: '', ef_torax: '', ef_abdomen: '',
    ef_genitales: '', extremidades: '', ef_piel: '', ef_pelvis: '', ef_columna: '', ef_neurologico: '',
    temperatura: '', presion_arterial_sistolica: '', presion_arterial_diastolica: '',
    frecuencia_cardiaca: '', frecuencia_respiratoria: '', peso: '', talla: '', saturacion_oxigeno: '',
    estudios_previos: '', diagnostico: '',
    tx_previo: '', tx_actual: '', plan_tratamiento: '', pronostico: '',
    medico_nombre: '', medico_cedula: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [encRes, hcRes] = await Promise.all([
        encuentro.get(parseInt(id!)),
        historiaClinica.get(parseInt(id!)),
      ]);

      if (encRes.success) setEncData(encRes.data);
      if (hcRes.success && hcRes.data) {
        setHcData(hcRes.data);
        setIsEdit(true);
        const d = hcRes.data;
        setForm({
          tipo_interrogatorio: d.tipo_interrogatorio || 'Directo',
          fecha: d.fecha ? String(d.fecha).substring(0, 10) : (d.created_at ? String(d.created_at).substring(0, 10) : new Date().toISOString().substring(0, 10)),
          hora: d.hora || (d.created_at ? String(d.created_at).substring(11, 16) : new Date().toTimeString().substring(0, 5)),
          ocupacion: d.ocupacion || encRes.data?.ocupacion || '',
          grupo_etnico: d.grupo_etnico || (encRes.data?.es_indigena ? (encRes.data.lengua_indigena || 'Mazahua') : '') || '',
          antecedentes_heredofamiliares: d.antecedentes_heredofamiliares || encRes.data?.antecedentes_heredofamiliares || '',
          antecedentes_no_patologicos: d.antecedentes_no_patologicos || '',
          antecedentes_patologicos: d.antecedentes_patologicos || '',
          antecedentes_gineco_obstetricos: d.antecedentes_gineco_obstetricos || '',
          padecimiento_actual: d.padecimiento_actual || '',
          int_aparato_cardiovascular_niega: d.int_aparato_cardiovascular_niega ?? true,
          int_aparato_cardiovascular_observaciones: d.int_aparato_cardiovascular_observaciones || '',
          int_aparato_respiratorio_niega: d.int_aparato_respiratorio_niega ?? true,
          int_aparato_respiratorio_observaciones: d.int_aparato_respiratorio_observaciones || '',
          int_aparato_digestivo_niega: d.int_aparato_digestivo_niega ?? true,
          int_aparato_digestivo_observaciones: d.int_aparato_digestivo_observaciones || '',
          int_aparato_genitourinario_niega: d.int_aparato_genitourinario_niega ?? true,
          int_aparato_genitourinario_observaciones: d.int_aparato_genitourinario_observaciones || '',
          int_aparato_hematico_niega: d.int_aparato_hematico_niega ?? true,
          int_aparato_hematico_observaciones: d.int_aparato_hematico_observaciones || '',
          int_aparato_endocrino_niega: d.int_aparato_endocrino_niega ?? true,
          int_aparato_endocrino_observaciones: d.int_aparato_endocrino_observaciones || '',
          int_aparato_neurologico_niega: d.int_aparato_neurologico_niega ?? true,
          int_aparato_neurologico_observaciones: d.int_aparato_neurologico_observaciones || '',
          int_aparato_musculoesqueletico_niega: d.int_aparato_musculoesqueletico_niega ?? true,
          int_aparato_musculoesqueletico_observaciones: d.int_aparato_musculoesqueletico_observaciones || '',
          int_aparato_piel_anexos_niega: d.int_aparato_piel_anexos_niega ?? true,
          int_aparato_piel_anexos_observaciones: d.int_aparato_piel_anexos_observaciones || '',
          habitus_exterior: d.habitus_exterior || '',
          ef_cabeza: d.ef_cabeza || '',
          ef_cuello: d.ef_cuello || '',
          ef_torax: d.ef_torax || '',
          ef_abdomen: d.ef_abdomen || '',
          ef_genitales: d.ef_genitales || '',
          extremidades: d.extremidades || '',
          ef_piel: d.ef_piel || '',
          ef_pelvis: d.ef_pelvis || '',
          ef_columna: d.ef_columna || '',
          ef_neurologico: d.ef_neurologico || '',
          temperatura: d.temperatura || '',
          presion_arterial_sistolica: d.presion_arterial_sistolica || '',
          presion_arterial_diastolica: d.presion_arterial_diastolica || '',
          frecuencia_cardiaca: d.frecuencia_cardiaca || '',
          frecuencia_respiratoria: d.frecuencia_respiratoria || '',
          peso: d.peso || '',
          talla: d.talla || '',
          saturacion_oxigeno: d.saturacion_oxigeno || '',
          estudios_previos: d.estudios_previos || '',
          diagnostico: d.diagnostico || '',
          tx_previo: d.tx_previo || '',
          tx_actual: d.tx_actual || d.plan_tratamiento || '',
          plan_tratamiento: d.plan_tratamiento || '',
          pronostico: d.pronostico || '',
          medico_nombre: d.medico_nombre || '',
          medico_cedula: d.medico_cedula || '',
        });
      } else if (encRes.data) {
        setForm(prev => ({
          ...prev,
          ocupacion: encRes.data.ocupacion || '',
          grupo_etnico: encRes.data.es_indigena ? (encRes.data.lengua_indigena || 'Mazahua') : '',
          antecedentes_heredofamiliares: encRes.data.antecedentes_heredofamiliares || '',
        }));
      }
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function calcularEdad(fechaNacimiento: string): string {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let anios = hoy.getFullYear() - nac.getFullYear();
    const meses = hoy.getMonth() - nac.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate())) anios--;
    return `${anios} años`;
  }

  async function handlePrintPDF() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/pacientes/encuentros/${id}/pdf/historia-clinica`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Error al generar el documento PDF.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      showToast(err.message || 'Error al descargar PDF.', 'error');
    }
  }

  async function handleSaveHC(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      ['temperatura', 'presion_arterial_sistolica', 'presion_arterial_diastolica',
       'frecuencia_cardiaca', 'frecuencia_respiratoria', 'saturacion_oxigeno'].forEach((k) => {
        (payload as any)[k] = (payload as any)[k] ? Number((payload as any)[k]) : null;
      });
      ['peso', 'talla'].forEach((k) => {
        (payload as any)[k] = (payload as any)[k] ? parseFloat((payload as any)[k]) : null;
      });

      if (isEdit) {
        await historiaClinica.update(parseInt(id!), payload);
      } else {
        await historiaClinica.create(parseInt(id!), payload);
      }

      showToast('Historia clínica guardada correctamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar historia clínica.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Historia Clínica?',
      message: 'Esta acción borrará permanentemente la historia clínica y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await historiaClinica.remove(parseInt(id!));
      showToast('Historia clínica eliminada correctamente.', 'success');
      navigate(`/pacientes/${encData.id_paciente}`);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar historia clínica.', 'error');
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Cargando historia clínica...</p></div>;
  }

  if (!encData) {
    return <div className="empty-state"><p>Encuentro no encontrado</p></div>;
  }

  return (
    <div>
      <div className="patient-banner">
        <div className="banner-field">
          <span className="banner-label">Expediente</span>
          <span className="banner-value highlight">{encData.expediente_clinico}</span>
        </div>
        <div className="banner-separator" />
        <div className="banner-field">
          <span className="banner-label">CURP</span>
          <span className="banner-value" style={{ fontFamily: 'monospace', fontSize: 13 }}>{encData.curp || 'S/E'}</span>
        </div>
        <div className="banner-separator" />
        <div className="banner-field">
          <span className="banner-label">Nombre</span>
          <span className="banner-value">{encData.apellido_paterno} {encData.apellido_materno || ''} {encData.nombre}</span>
        </div>
        <div className="banner-separator" />
        <div className="banner-field">
          <span className="banner-label">Edad</span>
          <span className="banner-value">{calcularEdad(encData.fecha_nacimiento)}</span>
        </div>
        <div className="banner-separator" />
        <div className="banner-field">
          <span className="banner-label">Área de ingreso</span>
          <span className="banner-value">{encData.area_ingreso}</span>
        </div>
      </div>

      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${encData.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}>
            <FileText size={24} style={{ color: '#0f3f2f' }} /> Historia clínica general
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
            <strong>Paciente:</strong> {encData.apellido_paterno} {encData.apellido_materno || ''} {encData.nombre} • <strong>Exp:</strong> {encData.expediente_clinico}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={handlePrintPDF} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Printer size={16} /> Imprimir PDF oficial
          </button>
          <button 
            type="submit" 
            form="form-historia-clinica"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Historia Clínica' : 'Guardar y Certificar')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#065f46' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Historia clínica registrada</strong>
            <div style={{ fontSize: 12 }}>El expediente cuenta con registro previo. Las modificaciones actualizarán directamente el documento oficial.</div>
          </div>
        </div>
      )}

      <div className="tabs">
        <div className={`tab ${tab === 'identificacion' ? 'active' : ''}`} onClick={() => setTab('identificacion')}>
          Ficha e interrogatorio
        </div>
        <div className={`tab ${tab === 'antecedentes' ? 'active' : ''}`} onClick={() => setTab('antecedentes')}>
          Antecedentes
        </div>
        <div className={`tab ${tab === 'padecimiento' ? 'active' : ''}`} onClick={() => setTab('padecimiento')}>
          Padecimiento actual
        </div>
        <div className={`tab ${tab === 'interrogatorio' ? 'active' : ''}`} onClick={() => setTab('interrogatorio')}>
          Aparatos y sistemas
        </div>
        <div className={`tab ${tab === 'signos' ? 'active' : ''}`} onClick={() => setTab('signos')}>
          Signos vitales
        </div>
        <div className={`tab ${tab === 'exploracion' ? 'active' : ''}`} onClick={() => setTab('exploracion')}>
          Exploración física
        </div>
        <div className={`tab ${tab === 'diagnostico' ? 'active' : ''}`} onClick={() => setTab('diagnostico')}>
          Diagnóstico y terapéutica
        </div>
      </div>

      <form id="form-historia-clinica" onSubmit={handleSaveHC}>
        {tab === 'identificacion' && (
          <div className="card">
            <div className="card-header"><h3>Ficha de identificación e interrogatorio</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de interrogatorio</label>
                  <select value={form.tipo_interrogatorio} onChange={(e) => set('tipo_interrogatorio', e.target.value)}>
                    <option value="Directo">Directo</option>
                    <option value="Indirecto">Indirecto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de elaboración</label>
                  <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Hora de elaboración</label>
                  <input type="text" value={form.hora} onChange={(e) => set('hora', e.target.value)} placeholder="Ej. 10:30" />
                </div>
                <div className="form-group">
                  <label>Ocupación del paciente</label>
                  <input type="text" value={form.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} placeholder="Ej. Hogar, Empleado, Estudiante" />
                </div>
                <div className="form-group">
                  <label>Grupo étnico</label>
                  <input type="text" value={form.grupo_etnico} onChange={(e) => set('grupo_etnico', e.target.value)} placeholder="Ej. Mazahua, Otomí, Ninguno" />
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Personal médico tratante (nombre)"
                    nombre={form.medico_nombre}
                    cedula={form.medico_cedula}
                    onChange={(nom, ced) => {
                      set('medico_nombre', nom);
                      if (ced !== undefined) set('medico_cedula', ced);
                    }}
                    placeholder="-- Seleccione personal médico tratante --"
                  />
                </div>
                <div className="form-group">
                  <label>Cédula profesional del médico</label>
                  <input type="text" value={form.medico_cedula} onChange={(e) => set('medico_cedula', e.target.value)} placeholder="Cédula profesional" />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'antecedentes' && (
          <div className="card">
            <div className="card-header"><h3>Antecedentes del paciente</h3></div>
            <div className="card-body">
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes heredo familiares</label>
                <textarea
                  value={form.antecedentes_heredofamiliares}
                  onChange={(e) => set('antecedentes_heredofamiliares', e.target.value)}
                  placeholder="Diabetes, hipertensión, cardiopatías, neoplasias en familiares..."
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes personales no patológicos</label>
                <textarea
                  value={form.antecedentes_no_patologicos}
                  onChange={(e) => set('antecedentes_no_patologicos', e.target.value)}
                  placeholder="Vivienda, servicios intradomiciliarios, zoonosis, hábitos higiénico-dietéticos, toxicomanías..."
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes personales patológicos</label>
                <textarea
                  value={form.antecedentes_patologicos}
                  onChange={(e) => set('antecedentes_patologicos', e.target.value)}
                  placeholder="Enfermedades crónicas, quirúrgicos, transfusionales, alérgicos, traumatismos..."
                  style={{ minHeight: 90 }}
                />
              </div>
              <div className="form-group full-width">
                <label>Antecedentes gineco-obstétricos</label>
                <textarea
                  value={form.antecedentes_gineco_obstetricos}
                  onChange={(e) => set('antecedentes_gineco_obstetricos', e.target.value)}
                  placeholder="Menarca, ritmo menstrual, IVSA, FUM, gestas, partos, cesáreas, abortos, método de planificación..."
                  style={{ minHeight: 90 }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'padecimiento' && (
          <div className="card">
            <div className="card-header"><h3>Padecimiento actual</h3></div>
            <div className="card-body">
              <div className="form-group full-width">
                <label>Descripción del padecimiento actual *</label>
                <textarea
                  value={form.padecimiento_actual}
                  onChange={(e) => set('padecimiento_actual', e.target.value)}
                  placeholder="Describa el motivo de consulta, evolución temporal, síntomas principales, semiología del dolor..."
                  style={{ minHeight: 160 }}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'interrogatorio' && (
          <div className="card">
            <div className="card-header"><h3>Interrogatorio por aparatos y sistemas</h3></div>
            <div className="card-body">
              <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 'var(--space-md)' }}>
                Marque la casilla si el paciente no refiere sintomatología en el aparato. Especifique las observaciones o hallazgos en caso positivo.
              </p>
              {APARATOS.map((a) => {
                const niegaKey = `${a.prefix}_niega` as string;
                const obsKey = `${a.prefix}_observaciones` as string;
                return (
                  <div className="apparatus-row" key={a.prefix}>
                    <div className="niega-check">
                      <input
                        type="checkbox"
                        checked={(form as any)[niegaKey]}
                        onChange={(e) => set(niegaKey, e.target.checked)}
                      />
                      <span>{(form as any)[niegaKey] ? 'Niega' : 'Refiere'}</span>
                    </div>
                    <div className="form-group">
                      <label style={{ color: 'var(--primary)', fontSize: 12 }}>{a.label}</label>
                      <input
                        value={(form as any)[obsKey]}
                        onChange={(e) => set(obsKey, e.target.value)}
                        placeholder={(form as any)[niegaKey] ? 'Sin alteraciones referidas' : 'Describa los hallazgos...'}
                        readOnly={(form as any)[niegaKey]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'signos' && (
          <div className="card">
            <div className="card-header"><h3>Signos vitales y antropometría</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Presión arterial (mmHg)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" placeholder="Sistólica" value={form.presion_arterial_sistolica} onChange={(e) => set('presion_arterial_sistolica', e.target.value)} style={{ width: '50%' }} />
                    <span>/</span>
                    <input type="number" placeholder="Diastólica" value={form.presion_arterial_diastolica} onChange={(e) => set('presion_arterial_diastolica', e.target.value)} style={{ width: '50%' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={form.temperatura} onChange={(e) => set('temperatura', e.target.value)} placeholder="Ej. 36.5" />
                </div>
                <div className="form-group">
                  <label>Frecuencia cardíaca (lpm)</label>
                  <input type="number" value={form.frecuencia_cardiaca} onChange={(e) => set('frecuencia_cardiaca', e.target.value)} placeholder="Ej. 72" />
                </div>
                <div className="form-group">
                  <label>Frecuencia respiratoria (rpm)</label>
                  <input type="number" value={form.frecuencia_respiratoria} onChange={(e) => set('frecuencia_respiratoria', e.target.value)} placeholder="Ej. 18" />
                </div>
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input type="number" step="0.1" value={form.peso} onChange={(e) => set('peso', e.target.value)} placeholder="Ej. 70" />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input type="number" step="0.1" value={form.talla} onChange={(e) => set('talla', e.target.value)} placeholder="Ej. 165" />
                </div>
                <div className="form-group">
                  <label>Saturación de oxígeno (%)</label>
                  <input type="number" value={form.saturacion_oxigeno} onChange={(e) => set('saturacion_oxigeno', e.target.value)} placeholder="Ej. 98" />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'exploracion' && (
          <div className="card">
            <div className="card-header"><h3>Exploración física</h3></div>
            <div className="card-body">
              <div className="form-grid">
                {[
                  { key: 'habitus_exterior', label: 'Habitus exterior' },
                  { key: 'ef_cabeza', label: 'Cabeza' },
                  { key: 'ef_cuello', label: 'Cuello' },
                  { key: 'ef_torax', label: 'Tórax' },
                  { key: 'ef_abdomen', label: 'Abdomen' },
                  { key: 'ef_genitales', label: 'Genitales' },
                  { key: 'extremidades', label: 'Extremidades' },
                  { key: 'ef_piel', label: 'Piel' },
                ].map((campo) => (
                  <div className="form-group" key={campo.key}>
                    <label>{campo.label}</label>
                    <textarea
                      value={(form as any)[campo.key]}
                      onChange={(e) => set(campo.key, e.target.value)}
                      placeholder={`Exploración de ${campo.label.toLowerCase()}...`}
                      style={{ minHeight: 70 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'diagnostico' && (
          <div className="card">
            <div className="card-header"><h3>Diagnóstico, estudios y terapéutica</h3></div>
            <div className="card-body">
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Resultados previos y actuales de laboratorio, gabinete y otros</label>
                <textarea
                  value={form.estudios_previos}
                  onChange={(e) => set('estudios_previos', e.target.value)}
                  placeholder="Biometría hemática, química sanguínea, ultrasonidos, radiografías..."
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Diagnósticos o problemas clínicos *</label>
                <textarea
                  value={form.diagnostico}
                  onChange={(e) => set('diagnostico', e.target.value)}
                  placeholder="Diagnósticos principales y secundarios..."
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Terapéutica empleada y resultados (previos)</label>
                <textarea
                  value={form.tx_previo}
                  onChange={(e) => set('tx_previo', e.target.value)}
                  placeholder="Medicamentos o tratamientos administrados con anterioridad y respuesta..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Terapéutica actual</label>
                <textarea
                  value={form.tx_actual}
                  onChange={(e) => {
                    set('tx_actual', e.target.value);
                    set('plan_tratamiento', e.target.value);
                  }}
                  placeholder="Indicaciones médicas, dosis, vía de administración y plan terapéutico en curso..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width">
                <label>Pronóstico</label>
                <textarea
                  value={form.pronostico}
                  onChange={(e) => set('pronostico', e.target.value)}
                  placeholder="Pronóstico para la vida y para la función..."
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-lg)' }}>
          <Link to={`/pacientes/${encData.id_paciente}`} className="btn btn-secondary">
            ← Volver al expediente
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Eliminar registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Guardando...' : <><Save size={14}/> {isEdit ? 'Actualizar historia clínica' : 'Guardar historia clínica'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
