import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hcPediatricaOficial, encuentro as encuentroApi, pacientes } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { Baby, Save, Printer, ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function HCPediatricaMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [tab, setTab] = useState('identificacion');

  const [form, setForm] = useState({
    fecha: new Date().toISOString().substring(0, 10),
    hora: '10:00',
    tipo_interrogatorio: 'Indirecto',
    ocupacion: 'Estudiante / Menor de edad',

    antecedentes_heredofamiliares: '',
    antecedentes_no_patologicos: '',
    antecedentes_perinatales: '',
    alimentacion: '',
    inmunizaciones: '',
    desarrollo_psicomotor: '',
    antecedentes_patologicos: '',

    padecimiento_actual: '',

    int_cardiovascular: '',
    int_respiratorio: '',
    int_gastrointestinal: '',
    int_genitourinario: '',
    int_hematico_linfatico: '',
    int_endocrino: '',
    int_nervioso: '',
    int_musculoesqueletico: '',
    int_piel_mucosas: '',

    temperatura: '',
    presion_arterial: '',
    frecuencia_cardiaca: '',
    frecuencia_respiratoria: '',
    peso: '',
    talla: '',

    habitus_exterior_neurologico: '',
    ef_cabeza: '',
    ef_cuello: '',
    ef_torax: '',
    ef_abdomen: '',
    ef_genitales: '',
    ef_extremidades: '',
    ef_piel: '',

    resultados_laboratorio: '',
    diagnosticos: '',
    terapeutica_empleada: '',
    pronostico: 'Bueno para la vida y para la función',
    medico_nombre: '',
    medico_cedula: '',
  });

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        setEncuentroData(eRes.data);
        const pRes = await pacientes.get(eRes.data.id_paciente);
        if (pRes.success) setPacienteData(pRes.data);
      }

      const hRes = await hcPediatricaOficial.get(parseInt(id!));
      if (hRes.success && hRes.data) {
        setIsEdit(true);
        const d = hRes.data;
        setForm({
          fecha: d.fecha ? String(d.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
          hora: d.hora || '10:00',
          tipo_interrogatorio: d.tipo_interrogatorio || 'Indirecto',
          ocupacion: d.ocupacion || 'Estudiante / Menor de edad',

          antecedentes_heredofamiliares: d.antecedentes_heredofamiliares || '',
          antecedentes_no_patologicos: d.antecedentes_no_patologicos || '',
          antecedentes_perinatales: d.antecedentes_perinatales || '',
          alimentacion: d.alimentacion || '',
          inmunizaciones: d.inmunizaciones || '',
          desarrollo_psicomotor: d.desarrollo_psicomotor || '',
          antecedentes_patologicos: d.antecedentes_patologicos || '',

          padecimiento_actual: d.padecimiento_actual || '',

          int_cardiovascular: d.int_cardiovascular || '',
          int_respiratorio: d.int_respiratorio || '',
          int_gastrointestinal: d.int_gastrointestinal || '',
          int_genitourinario: d.int_genitourinario || '',
          int_hematico_linfatico: d.int_hematico_linfatico || '',
          int_endocrino: d.int_endocrino || '',
          int_nervioso: d.int_nervioso || '',
          int_musculoesqueletico: d.int_musculoesqueletico || '',
          int_piel_mucosas: d.int_piel_mucosas || '',

          temperatura: d.temperatura || '',
          presion_arterial: d.presion_arterial || '',
          frecuencia_cardiaca: d.frecuencia_cardiaca || '',
          frecuencia_respiratoria: d.frecuencia_respiratoria || '',
          peso: d.peso || '',
          talla: d.talla || '',

          habitus_exterior_neurologico: d.habitus_exterior_neurologico || '',
          ef_cabeza: d.ef_cabeza || '',
          ef_cuello: d.ef_cuello || '',
          ef_torax: d.ef_torax || '',
          ef_abdomen: d.ef_abdomen || '',
          ef_genitales: d.ef_genitales || '',
          ef_extremidades: d.ef_extremidades || '',
          ef_piel: d.ef_piel || '',

          resultados_laboratorio: d.resultados_laboratorio || '',
          diagnosticos: d.diagnosticos || '',
          terapeutica_empleada: d.terapeutica_empleada || '',
          pronostico: d.pronostico || 'Bueno para la vida y para la función',
          medico_nombre: d.medico_nombre || '',
          medico_cedula: d.medico_cedula || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePrintPDF() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/pacientes/encuentros/${id}/pdf/hc-pediatrica`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al generar el documento PDF.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      showToast(err.message || 'Error al descargar PDF.', 'error');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.padecimiento_actual.trim()) {
      showToast('El padecimiento actual es requerido.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await hcPediatricaOficial.create(parseInt(id!), {
        ...form,
        firmado: true,
      });
      showToast('Historia clínica pediátrica guardada exitosamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar historia clínica pediátrica.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar historia clínica pediátrica?',
      message: 'Esta acción borrará permanentemente la historia clínica pediátrica del encuentro.',
      confirmText: 'Eliminar registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await hcPediatricaOficial.remove(parseInt(id!));
      showToast('Historia clínica pediátrica eliminada correctamente.', 'success');
      navigate(`/pacientes/${pacienteData?.id_paciente}`);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar historia clínica pediátrica.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando historia clínica pediátrica...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <Baby size={24} style={{ color: '#0f3f2f' }} />
            Historia clínica pediátrica
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Documento clínico oficial para pacientes menores de 18 años — Formato 208C0101100000L-040-19
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handlePrintPDF}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir PDF oficial
          </button>
          <button 
            type="submit" 
            form="form-hc-pediatrica"
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
            <strong>Historia clínica pediátrica registrada</strong>
            <div style={{ fontSize: 12 }}>El expediente cuenta con registro previo. Las modificaciones actualizarán directamente el documento oficial.</div>
          </div>
        </div>
      )}

      {/* Datos del Maestro de Pacientes */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Ficha de identificación del paciente menor</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Paciente menor" value={`${pacienteData?.nombre} ${pacienteData?.apellido_paterno} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="CURP" value={pacienteData?.curp} />
            <AutoField label="Expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Edad calculada" value={`${pacienteData?.edad || 0} años (${pacienteData?.edad_meses || 0} meses)`} />
            <AutoField label="Género" value={pacienteData?.sexo} />
            <AutoField label="Padre, madre o tutor" value={pacienteData?.tutor_nombre || pacienteData?.contacto_emergencia_nombre || 'No registrado'} />
            <AutoField label="Parentesco" value={pacienteData?.tutor_parentesco || pacienteData?.contacto_emergencia_parentesco || 'Tutor'} />
            <AutoField label="Domicilio" value={pacienteData?.domicilio || `${pacienteData?.domicilio_municipio || ''}, ${pacienteData?.domicilio_entidad || ''}`} />
          </div>
        </div>
      </div>

      {/* Tabs de Secciones Oficiales */}
      <div className="tabs">
        <div className={`tab ${tab === 'identificacion' ? 'active' : ''}`} onClick={() => setTab('identificacion')}>
          Interrogatorio y datos iniciales
        </div>
        <div className={`tab ${tab === 'antecedentes' ? 'active' : ''}`} onClick={() => setTab('antecedentes')}>
          Antecedentes pediátricos
        </div>
        <div className={`tab ${tab === 'padecimiento' ? 'active' : ''}`} onClick={() => setTab('padecimiento')}>
          Padecimiento actual
        </div>
        <div className={`tab ${tab === 'aparatos' ? 'active' : ''}`} onClick={() => setTab('aparatos')}>
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

      <form id="form-hc-pediatrica" onSubmit={handleSubmit}>
        {tab === 'identificacion' && (
          <div className="card">
            <div className="card-header"><h3>Datos del interrogatorio y personal médico</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de interrogatorio</label>
                  <select value={form.tipo_interrogatorio} onChange={(e) => set('tipo_interrogatorio', e.target.value)}>
                    <option value="Indirecto">Indirecto</option>
                    <option value="Directo">Directo</option>
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
                  <label>Ocupación del paciente menor</label>
                  <input type="text" value={form.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} placeholder="Ej. Estudiante, Menor de edad" />
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Personal médico pediatra (nombre)"
                    nombre={form.medico_nombre}
                    cedula={form.medico_cedula}
                    onChange={(nom, ced) => {
                      set('medico_nombre', nom);
                      if (ced !== undefined) set('medico_cedula', ced);
                    }}
                    placeholder="-- Seleccione personal médico pediatra --"
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
            <div className="card-header"><h3>Antecedentes perinatales, generales y desarrollo</h3></div>
            <div className="card-body">
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes heredo familiares</label>
                <textarea
                  value={form.antecedentes_heredofamiliares}
                  onChange={(e) => set('antecedentes_heredofamiliares', e.target.value)}
                  placeholder="Salud de padres y hermanos, diabetes, cardiopatías, malformaciones congénitas..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes personales no patológicos</label>
                <textarea
                  value={form.antecedentes_no_patologicos}
                  onChange={(e) => set('antecedentes_no_patologicos', e.target.value)}
                  placeholder="Vivienda, servicios intradomiciliarios, convivencia con animales, higiene personal..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Antecedentes perinatales *</label>
                <textarea
                  value={form.antecedentes_perinatales}
                  onChange={(e) => set('antecedentes_perinatales', e.target.value)}
                  placeholder="Número de gesta, semanas de gestación al nacer, tipo de parto/cesárea, lloro y respiró al nacer, APGAR, peso y talla al nacer, complicaciones..."
                  style={{ minHeight: 70 }}
                  required
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Alimentación *</label>
                <textarea
                  value={form.alimentacion}
                  onChange={(e) => set('alimentacion', e.target.value)}
                  placeholder="Seno materno exclusivo (tiempo), fórmulas lácteas, edad de ablactación, integración a la dieta familiar, hábitos nutricionales..."
                  style={{ minHeight: 60 }}
                  required
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Inmunizaciones *</label>
                <textarea
                  value={form.inmunizaciones}
                  onChange={(e) => set('inmunizaciones', e.target.value)}
                  placeholder="Esquema completo o incompleto para la edad según Cartilla Nacional de Salud (BCG, Hepatitis B, Hexavalente, Rotavirus, Neumococo, SRP)..."
                  style={{ minHeight: 60 }}
                  required
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Desarrollo psicomotor *</label>
                <textarea
                  value={form.desarrollo_psicomotor}
                  onChange={(e) => set('desarrollo_psicomotor', e.target.value)}
                  placeholder="Sostén cefálico, sedestación, bipedestación, primeros pasos, lenguaje, control de esfínteres, escolaridad..."
                  style={{ minHeight: 60 }}
                  required
                />
              </div>
              <div className="form-group full-width">
                <label>Antecedentes personales patológicos</label>
                <textarea
                  value={form.antecedentes_patologicos}
                  onChange={(e) => set('antecedentes_patologicos', e.target.value)}
                  placeholder="Enfermedades exantemáticas, hospitalizaciones previas, cirugías, alergias, transfusiones..."
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'padecimiento' && (
          <div className="card">
            <div className="card-header"><h3>Padecimiento actual pediátrico</h3></div>
            <div className="card-body">
              <div className="form-group full-width">
                <label>Descripción del padecimiento actual *</label>
                <textarea
                  value={form.padecimiento_actual}
                  onChange={(e) => set('padecimiento_actual', e.target.value)}
                  placeholder="Motivo de consulta pediátrica, inicio, evolución en horas/días, semiología de síntomas, automedicación..."
                  style={{ minHeight: 160 }}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'aparatos' && (
          <div className="card">
            <div className="card-header"><h3>Interrogatorio por aparatos y sistemas</h3></div>
            <div className="card-body">
              <div className="form-grid">
                {[
                  { key: 'int_cardiovascular', label: 'Cardiovascular' },
                  { key: 'int_respiratorio', label: 'Respiratorio' },
                  { key: 'int_gastrointestinal', label: 'Gastrointestinal' },
                  { key: 'int_genitourinario', label: 'Genitourinario' },
                  { key: 'int_hematico_linfatico', label: 'Hemático y linfático' },
                  { key: 'int_endocrino', label: 'Endocrino' },
                  { key: 'int_nervioso', label: 'Nervioso' },
                  { key: 'int_musculoesqueletico', label: 'Musculoesquelético' },
                  { key: 'int_piel_mucosas', label: 'Piel y mucosas' },
                ].map((ap) => (
                  <div className="form-group full-width" key={ap.key} style={{ marginBottom: 12 }}>
                    <label>{ap.label}</label>
                    <input
                      type="text"
                      value={(form as any)[ap.key]}
                      onChange={(e) => set(ap.key, e.target.value)}
                      placeholder={`Hallazgos o sin alteraciones en ${ap.label.toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'signos' && (
          <div className="card">
            <div className="card-header"><h3>Signos vitales pediátricos</h3></div>
            <div className="card-body">
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label>Tensión arterial (T/A)</label>
                  <input type="text" value={form.presion_arterial} onChange={(e) => set('presion_arterial', e.target.value)} placeholder="Ej. 90/60" />
                </div>
                <div className="form-group">
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={form.temperatura} onChange={(e) => set('temperatura', e.target.value)} placeholder="Ej. 36.5" />
                </div>
                <div className="form-group">
                  <label>Frecuencia cardíaca (lpm)</label>
                  <input type="number" value={form.frecuencia_cardiaca} onChange={(e) => set('frecuencia_cardiaca', e.target.value)} placeholder="Ej. 105" />
                </div>
                <div className="form-group">
                  <label>Frecuencia respiratoria (rpm)</label>
                  <input type="number" value={form.frecuencia_respiratoria} onChange={(e) => set('frecuencia_respiratoria', e.target.value)} placeholder="Ej. 24" />
                </div>
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso} onChange={(e) => set('peso', e.target.value)} placeholder="Ej. 14.5" />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input type="number" step="0.1" value={form.talla} onChange={(e) => set('talla', e.target.value)} placeholder="Ej. 95" />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'exploracion' && (
          <div className="card">
            <div className="card-header"><h3>Exploración física pediátrica</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group full-width" style={{ marginBottom: 12 }}>
                  <label>Habitus exterior y estado neurológico</label>
                  <textarea
                    value={form.habitus_exterior_neurologico}
                    onChange={(e) => set('habitus_exterior_neurologico', e.target.value)}
                    placeholder="Consciente, activo, reactivo, llanto, facies, hidratación..."
                    style={{ minHeight: 60 }}
                  />
                </div>
                {[
                  { key: 'ef_cabeza', label: 'Cabeza' },
                  { key: 'ef_cuello', label: 'Cuello' },
                  { key: 'ef_torax', label: 'Tórax' },
                  { key: 'ef_abdomen', label: 'Abdomen' },
                  { key: 'ef_genitales', label: 'Genitales' },
                  { key: 'ef_extremidades', label: 'Extremidades' },
                  { key: 'ef_piel', label: 'Piel' },
                ].map((ef) => (
                  <div className="form-group" key={ef.key} style={{ marginBottom: 12 }}>
                    <label>{ef.label}</label>
                    <textarea
                      value={(form as any)[ef.key]}
                      onChange={(e) => set(ef.key, e.target.value)}
                      placeholder={`Exploración de ${ef.label.toLowerCase()}...`}
                      style={{ minHeight: 60 }}
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
                  value={form.resultados_laboratorio}
                  onChange={(e) => set('resultados_laboratorio', e.target.value)}
                  placeholder="Resultados de biometría hemática, cultivos, radiografías, ultrasonidos..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Diagnósticos o problemas clínicos *</label>
                <textarea
                  value={form.diagnosticos}
                  onChange={(e) => set('diagnosticos', e.target.value)}
                  placeholder="Diagnósticos principales y secundarios pediátricos..."
                  style={{ minHeight: 70 }}
                  required
                />
              </div>
              <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
                <label>Terapéutica empleada y resultados</label>
                <textarea
                  value={form.terapeutica_empleada}
                  onChange={(e) => set('terapeutica_empleada', e.target.value)}
                  placeholder="Medicamentos, dosis ponderal calculada por peso, vía y horarios..."
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-group full-width">
                <label>Pronóstico</label>
                <input
                  type="text"
                  value={form.pronostico}
                  onChange={(e) => set('pronostico', e.target.value)}
                  placeholder="Pronóstico para la vida y para la función..."
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-lg)' }}>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            ← Volver al expediente
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} /> Eliminar registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar historia clínica pediátrica' : 'Guardar historia clínica pediátrica')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
