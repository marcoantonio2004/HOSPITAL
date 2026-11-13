import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { encuentro, notasUrgencias, estudios } from '../../services/api';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { AlertTriangle, Save, FileText, Edit3, CheckCircle2, Trash2, Printer, Activity, Heart, Thermometer, User, ClipboardList, Stethoscope, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function ConsultaUrgencias() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encData, setEncData] = useState<any>(null);
  const [notas, setNotas] = useState<any[]>([]);
  const [estudiosList, setEstudiosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('nueva_nota');
  const [formSection, setFormSection] = useState<'registro' | 'signos' | 'anverso' | 'reverso' | 'firmas'>('registro');
  const [editingNotaId, setEditingNotaId] = useState<number | null>(null);

  const [form, setForm] = useState({
    folio: '',
    unidad_medica: 'Hospital General San Felipe del Progreso',
    fecha_registro: new Date().toISOString().substring(0, 10),
    hora_registro: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    codigo_triage: 'Urgencia Calificada',
    triage_color: 'amarillo',
    procedencia: '',
    urgencia_calificada_bool: true,
    responsable_nombre: '',
    responsable_parentesco: '',
    responsable_domicilio: '',
    responsable_telefono: '',
    fecha_hora_atencion: new Date().toISOString().substring(0, 16),
    ta: '',
    temp: '',
    fr: '',
    fc: '',
    peso: '',
    talla: '',
    motivo_consulta: '',
    antecedentes: '',
    padecimiento_actual: '',
    ef_urgencias: '',
    diagnosticos_presuncionales: '',
    analisis_pronosticos: '',
    tratamiento_plan: '',
    observaciones_estudios: '',
    destino_paciente: '',
    familiar_nombre: '',
    medico_nombre: '',
    medico_cedula: '',
  });

  const [estudioForm, setEstudioForm] = useState({
    tipo_estudio: 'laboratorio',
    nombre_estudio: '',
    indicacion: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [encRes, notasRes, estudiosRes] = await Promise.all([
        encuentro.get(parseInt(id!)),
        notasUrgencias.list(parseInt(id!)),
        estudios.list(parseInt(id!)),
      ]);

      if (encRes.success) {
        setEncData(encRes.data);
        const p = encRes.data;
        setForm((prev) => ({
          ...prev,
          procedencia: prev.procedencia || p.domicilio_municipio || 'San Felipe del Progreso',
          responsable_nombre: prev.responsable_nombre || p.contacto_emergencia_nombre || '',
          responsable_parentesco: prev.responsable_parentesco || p.contacto_emergencia_parentesco || '',
          responsable_domicilio: prev.responsable_domicilio || p.domicilio || '',
          responsable_telefono: prev.responsable_telefono || p.contacto_emergencia_telefono || p.telefono || '',
          familiar_nombre: prev.familiar_nombre || p.contacto_emergencia_nombre || '',
          antecedentes: prev.antecedentes || p.antecedentes_patologicos || '',
          ta: prev.ta || p.presion_arterial || '',
          temp: prev.temp || (p.temperatura ? String(p.temperatura) : ''),
          fr: prev.fr || (p.frecuencia_respiratoria ? String(p.frecuencia_respiratoria) : ''),
          fc: prev.fc || (p.frecuencia_cardiaca ? String(p.frecuencia_cardiaca) : ''),
          peso: prev.peso || (p.peso ? String(p.peso) : ''),
          talla: prev.talla || (p.talla ? String(p.talla) : ''),
        }));
      }
      if (notasRes.success) setNotas(notasRes.data);
      if (estudiosRes.success) setEstudiosList(estudiosRes.data);
    } catch {
      // Ignorar error de carga
    } finally {
      setLoading(false);
    }
  }

  function calcularEdad(fechaNacimiento: string): string {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let anios = hoy.getFullYear() - nac.getFullYear();
    const meses = hoy.getMonth() - nac.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate())) anios--;
    return `${anios} años`;
  }

  function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function handleStartEditNota(nota: any) {
    setEditingNotaId(nota.id_nota_urgencias);
    setForm({
      folio: nota.folio || '',
      unidad_medica: nota.unidad_medica || 'Hospital General San Felipe del Progreso',
      fecha_registro: nota.fecha_registro ? String(nota.fecha_registro).substring(0, 10) : new Date().toISOString().substring(0, 10),
      hora_registro: nota.hora_registro || '12:00',
      codigo_triage: nota.codigo_triage || 'Urgencia Calificada',
      triage_color: nota.triage_color || 'amarillo',
      procedencia: nota.procedencia || encData?.domicilio_municipio || '',
      urgencia_calificada_bool: nota.urgencia_calificada_bool !== false,
      responsable_nombre: nota.responsable_nombre || '',
      responsable_parentesco: nota.responsable_parentesco || '',
      responsable_domicilio: nota.responsable_domicilio || '',
      responsable_telefono: nota.responsable_telefono || '',
      fecha_hora_atencion: nota.fecha_hora_atencion ? String(nota.fecha_hora_atencion).substring(0, 16) : new Date().toISOString().substring(0, 16),
      ta: nota.ta || '',
      temp: nota.temp ? String(nota.temp) : '',
      fr: nota.fr ? String(nota.fr) : '',
      fc: nota.fc ? String(nota.fc) : '',
      peso: nota.peso ? String(nota.peso) : '',
      talla: nota.talla ? String(nota.talla) : '',
      motivo_consulta: nota.motivo_consulta || '',
      antecedentes: nota.antecedentes || '',
      padecimiento_actual: nota.padecimiento_actual || nota.evolucion || '',
      ef_urgencias: nota.ef_urgencias || nota.exploracion_fisica || '',
      diagnosticos_presuncionales: nota.diagnosticos_presuncionales || nota.diagnostico || '',
      analisis_pronosticos: nota.analisis_pronosticos || '',
      tratamiento_plan: nota.tratamiento_plan || nota.plan || '',
      observaciones_estudios: nota.observaciones_estudios || nota.resultados_estudios || '',
      destino_paciente: nota.destino_paciente || '',
      familiar_nombre: nota.familiar_nombre || '',
      medico_nombre: nota.medico_nombre || '',
      medico_cedula: nota.medico_cedula || '',
    });
    setTab('nueva_nota');
    setFormSection('registro');
  }

  function handleCancelEditNota() {
    setEditingNotaId(null);
    setForm({
      folio: '',
      unidad_medica: 'Hospital General San Felipe del Progreso',
      fecha_registro: new Date().toISOString().substring(0, 10),
      hora_registro: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      codigo_triage: 'Urgencia Calificada',
      triage_color: 'amarillo',
      procedencia: encData?.domicilio_municipio || 'San Felipe del Progreso',
      urgencia_calificada_bool: true,
      responsable_nombre: encData?.contacto_emergencia_nombre || '',
      responsable_parentesco: encData?.contacto_emergencia_parentesco || '',
      responsable_domicilio: encData?.domicilio || '',
      responsable_telefono: encData?.contacto_emergencia_telefono || encData?.telefono || '',
      fecha_hora_atencion: new Date().toISOString().substring(0, 16),
      ta: encData?.presion_arterial || '',
      temp: encData?.temperatura ? String(encData.temperatura) : '',
      fr: encData?.frecuencia_respiratoria ? String(encData.frecuencia_respiratoria) : '',
      fc: encData?.frecuencia_cardiaca ? String(encData.frecuencia_cardiaca) : '',
      peso: encData?.peso ? String(encData.peso) : '',
      talla: encData?.talla ? String(encData.talla) : '',
      motivo_consulta: '',
      antecedentes: encData?.antecedentes_patologicos || '',
      padecimiento_actual: '',
      ef_urgencias: '',
      diagnosticos_presuncionales: '',
      analisis_pronosticos: '',
      tratamiento_plan: '',
      observaciones_estudios: '',
      destino_paciente: '',
      familiar_nombre: encData?.contacto_emergencia_nombre || '',
      medico_nombre: '',
      medico_cedula: '',
    });
    setFormSection('registro');
  }

  async function handleDeleteNota(notaId: number) {
    const ok = await confirm({
      title: '¿Eliminar nota de urgencias?',
      message: 'Esta acción eliminará de forma permanente esta nota de urgencias del expediente.',
      confirmText: 'Eliminar nota',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await notasUrgencias.remove(notaId);
      showToast('Nota de urgencias eliminada correctamente.', 'success');
      if (editingNotaId === notaId) {
        handleCancelEditNota();
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar nota de urgencias.', 'error');
    }
  }

  async function handleSaveNota(e: FormEvent) {
    e.preventDefault();
    if (!form.motivo_consulta.trim() && !form.padecimiento_actual.trim()) {
      showToast('El motivo de la consulta o el padecimiento actual es requerido.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        evolucion: form.padecimiento_actual || form.motivo_consulta || 'Atención inicial de urgencias',
        diagnostico: form.diagnosticos_presuncionales,
        plan: form.tratamiento_plan,
        resultados_estudios: form.observaciones_estudios,
      };

      if (editingNotaId) {
        await notasUrgencias.update(editingNotaId, payload);
        showToast('Nota de urgencias actualizada exitosamente.', 'success');
        setEditingNotaId(null);
      } else {
        await notasUrgencias.create(parseInt(id!), payload);
        showToast('Nota de urgencias guardada exitosamente.', 'success');
      }
      handleCancelEditNota();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar nota de urgencias.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEstudio(e: FormEvent) {
    e.preventDefault();
    if (!estudioForm.nombre_estudio.trim()) {
      showToast('El nombre del estudio es requerido.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await estudios.create(parseInt(id!), estudioForm);
      showToast('Estudio registrado exitosamente.', 'success');
      setEstudioForm({ tipo_estudio: 'laboratorio', nombre_estudio: '', indicacion: '' });
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar estudio.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Cargando urgencias...</p></div>;
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
          <span className="banner-label">Encuentro</span>
          <span className="banner-value">#{encData.id_encuentro} — {encData.area_ingreso}</span>
        </div>
      </div>

      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${encData.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}>
            <AlertTriangle size={24} color="#0284c7" /> Hoja de Consulta de Urgencias (208C0101100000L-088-24)
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
            <strong>Paciente:</strong> {encData.apellido_paterno} {encData.apellido_materno || ''} {encData.nombre} • <strong>Exp:</strong> {encData.expediente_clinico}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href={`/api/pacientes/encuentros/${id}/pdf/urgencias`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <Printer size={16} /> Imprimir Hoja Oficial (PDF)
          </a>
          {tab === 'nueva_nota' && (
            <button
              type="submit"
              form="form-consulta-urgencias"
              className="btn btn-success"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Save size={16} /> {saving ? 'Guardando...' : (editingNotaId ? 'Actualizar Nota' : 'Guardar y Certificar')}
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'nueva_nota' ? 'active' : ''}`} onClick={() => setTab('nueva_nota')}>
          {editingNotaId ? '✏️ Editando Nota' : 'Nueva Consulta / Nota'}
        </div>
        <div className={`tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>
          Historial de Notas ({notas.length})
        </div>
        <div className={`tab ${tab === 'estudios' ? 'active' : ''}`} onClick={() => setTab('estudios')}>
          Estudios ({estudiosList.length})
        </div>
        <div className={`tab ${tab === 'nuevo_estudio' ? 'active' : ''}`} onClick={() => setTab('nuevo_estudio')}>
          + Solicitar Estudio
        </div>
      </div>

      {tab === 'nueva_nota' && (
        <form id="form-consulta-urgencias" onSubmit={handleSaveNota}>
          <div className="card" style={{ border: editingNotaId ? '2px solid #0284c7' : undefined }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: editingNotaId ? '#0284c7' : undefined, color: editingNotaId ? '#fff' : undefined }}>
              <h3 style={{ margin: 0, color: editingNotaId ? '#fff' : undefined, display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingNotaId ? <><Edit3 size={18} /> Editando Consulta de Urgencias</> : 'Registro de Consulta de Urgencias'}
              </h3>
              {editingNotaId && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEditNota} style={{ background: '#fff', color: '#334155' }}>
                  Cancelar Edición
                </button>
              )}
            </div>

            {editingNotaId && (
              <div style={{ padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, margin: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#0284c7" />
                <span style={{ fontSize: 13, color: '#0369a1' }}>
                  <strong>Modo edición:</strong> Modificando los campos oficiales de la consulta seleccionada. Al guardar se sincronizará el PDF oficial.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${formSection === 'registro' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormSection('registro')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ClipboardList size={14} /> 1. Registro y triage
              </button>
              <button
                type="button"
                className={`btn btn-sm ${formSection === 'signos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormSection('signos')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Activity size={14} /> 2. Responsable y signos vitales
              </button>
              <button
                type="button"
                className={`btn btn-sm ${formSection === 'anverso' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormSection('anverso')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Stethoscope size={14} /> 3. Anverso clínico
              </button>
              <button
                type="button"
                className={`btn btn-sm ${formSection === 'reverso' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormSection('reverso')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <FileText size={14} /> 4. Reverso clínico
              </button>
              <button
                type="button"
                className={`btn btn-sm ${formSection === 'firmas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormSection('firmas')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <User size={14} /> 5. Firmas y personal
              </button>
            </div>

            <div className="card-body">
              {formSection === 'registro' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Núm. folio</label>
                    <input
                      type="text"
                      value={form.folio}
                      onChange={(e) => setForm((p) => ({ ...p, folio: e.target.value }))}
                      placeholder="Ej. URG-2026-001"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Unidad médica</label>
                    <input
                      type="text"
                      value={form.unidad_medica}
                      onChange={(e) => setForm((p) => ({ ...p, unidad_medica: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de registro</label>
                    <input
                      type="date"
                      value={form.fecha_registro}
                      onChange={(e) => setForm((p) => ({ ...p, fecha_registro: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora de registro</label>
                    <input
                      type="text"
                      value={form.hora_registro}
                      onChange={(e) => setForm((p) => ({ ...p, hora_registro: e.target.value }))}
                      placeholder="12:00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Código de triage</label>
                    <select
                      value={form.codigo_triage}
                      onChange={(e) => setForm((p) => ({ ...p, codigo_triage: e.target.value }))}
                    >
                      <option value="Urgencia Inmediata">Urgencia inmediata</option>
                      <option value="Urgencia Calificada">Urgencia calificada</option>
                      <option value="Urgencia Sentida">Urgencia sentida</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Color de triage</label>
                    <select
                      value={form.triage_color}
                      onChange={(e) => setForm((p) => ({ ...p, triage_color: e.target.value }))}
                    >
                      <option value="rojo">Rojo — Muy urgente</option>
                      <option value="naranja">Naranja — Urgente</option>
                      <option value="amarillo">Amarillo — Menos urgente</option>
                      <option value="verde">Verde — No urgente</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Procedencia</label>
                    <input
                      type="text"
                      value={form.procedencia}
                      onChange={(e) => setForm((p) => ({ ...p, procedencia: e.target.value }))}
                      placeholder="Municipio o población de residencia"
                    />
                  </div>
                  <div className="form-group">
                    <label>Urgencia calificada</label>
                    <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="urgencia_calificada"
                          checked={form.urgencia_calificada_bool === true}
                          onChange={() => setForm((p) => ({ ...p, urgencia_calificada_bool: true }))}
                        /> Sí
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="urgencia_calificada"
                          checked={form.urgencia_calificada_bool === false}
                          onChange={() => setForm((p) => ({ ...p, urgencia_calificada_bool: false }))}
                        /> No
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {formSection === 'signos' && (
                <div className="form-grid">
                  <div className="form-group full-width" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 8 }}>
                    <h4 style={{ margin: 0, color: '#334155' }}>Responsable de la o del paciente</h4>
                  </div>
                  <div className="form-group full-width">
                    <label>Nombre de la o del responsable</label>
                    <input
                      type="text"
                      value={form.responsable_nombre}
                      onChange={(e) => setForm((p) => ({ ...p, responsable_nombre: e.target.value }))}
                      placeholder="Nombre y apellidos del responsable"
                    />
                  </div>
                  <div className="form-group">
                    <label>Parentesco con la o el paciente</label>
                    <input
                      type="text"
                      value={form.responsable_parentesco}
                      onChange={(e) => setForm((p) => ({ ...p, responsable_parentesco: e.target.value }))}
                      placeholder="Ej. Padre, madre, tutor, hermano"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={form.responsable_telefono}
                      onChange={(e) => setForm((p) => ({ ...p, responsable_telefono: e.target.value }))}
                      placeholder="10 dígitos"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Domicilio</label>
                    <input
                      type="text"
                      value={form.responsable_domicilio}
                      onChange={(e) => setForm((p) => ({ ...p, responsable_domicilio: e.target.value }))}
                      placeholder="Calle, número, localidad y municipio"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Fecha y hora de atención</label>
                    <input
                      type="datetime-local"
                      value={form.fecha_hora_atencion}
                      onChange={(e) => setForm((p) => ({ ...p, fecha_hora_atencion: e.target.value }))}
                    />
                  </div>

                  <div className="form-group full-width" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginTop: 12, marginBottom: 8 }}>
                    <h4 style={{ margin: 0, color: '#334155' }}>Signos vitales</h4>
                  </div>
                  <div className="form-group">
                    <label>Tensión arterial (T/A)</label>
                    <input
                      type="text"
                      value={form.ta}
                      onChange={(e) => setForm((p) => ({ ...p, ta: e.target.value }))}
                      placeholder="120/80 mmHg"
                    />
                  </div>
                  <div className="form-group">
                    <label>Temperatura (°C)</label>
                    <input
                      type="text"
                      value={form.temp}
                      onChange={(e) => setForm((p) => ({ ...p, temp: e.target.value }))}
                      placeholder="36.5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Frecuencia respiratoria (rpm)</label>
                    <input
                      type="text"
                      value={form.fr}
                      onChange={(e) => setForm((p) => ({ ...p, fr: e.target.value }))}
                      placeholder="18"
                    />
                  </div>
                  <div className="form-group">
                    <label>Frecuencia cardíaca (lpm)</label>
                    <input
                      type="text"
                      value={form.fc}
                      onChange={(e) => setForm((p) => ({ ...p, fc: e.target.value }))}
                      placeholder="75"
                    />
                  </div>
                  <div className="form-group">
                    <label>Peso (kg)</label>
                    <input
                      type="text"
                      value={form.peso}
                      onChange={(e) => setForm((p) => ({ ...p, peso: e.target.value }))}
                      placeholder="70.5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Talla (cm)</label>
                    <input
                      type="text"
                      value={form.talla}
                      onChange={(e) => setForm((p) => ({ ...p, talla: e.target.value }))}
                      placeholder="165"
                    />
                  </div>
                </div>
              )}

              {formSection === 'anverso' && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>III. Motivo de la consulta *</label>
                    <textarea
                      value={form.motivo_consulta}
                      onChange={(e) => setForm((p) => ({ ...p, motivo_consulta: e.target.value }))}
                      placeholder="Estado traumático o motivo por el que acude a urgencias..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>IV. Antecedentes</label>
                    <textarea
                      value={form.antecedentes}
                      onChange={(e) => setForm((p) => ({ ...p, antecedentes: e.target.value }))}
                      placeholder="Padecimientos previos, crónicos, quirúrgicos o alergias..."
                      rows={4}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>V. Padecimientos actual</label>
                    <textarea
                      value={form.padecimiento_actual}
                      onChange={(e) => setForm((p) => ({ ...p, padecimiento_actual: e.target.value }))}
                      placeholder="Descripción cronológica detallada de los síntomas agudos..."
                      rows={5}
                    />
                  </div>
                </div>
              )}

              {formSection === 'reverso' && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>VI. Exploración física</label>
                    <textarea
                      value={form.ef_urgencias}
                      onChange={(e) => setForm((p) => ({ ...p, ef_urgencias: e.target.value }))}
                      placeholder="Hallazgos físicos, exploración por sistemas, estado neurológico..."
                      rows={4}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>VII. Diagnóstico(s) presuncional(es) (Principal y otros)</label>
                    <textarea
                      value={form.diagnosticos_presuncionales}
                      onChange={(e) => setForm((p) => ({ ...p, diagnosticos_presuncionales: e.target.value }))}
                      placeholder="Diagnóstico principal y diagnósticos secundarios..."
                      rows={3}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>VIII. Análisis y pronósticos</label>
                    <textarea
                      value={form.analisis_pronosticos}
                      onChange={(e) => setForm((p) => ({ ...p, analisis_pronosticos: e.target.value }))}
                      placeholder="Razonamiento clínico y pronóstico para la vida y función..."
                      rows={3}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>IX. Tratamiento y plan</label>
                    <textarea
                      value={form.tratamiento_plan}
                      onChange={(e) => setForm((p) => ({ ...p, tratamiento_plan: e.target.value }))}
                      placeholder="Tratamientos aplicados, medicamentos, dosis, plan terapéutico..."
                      rows={4}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>X. Observaciones y estudios (Destino del paciente)</label>
                    <textarea
                      value={form.observaciones_estudios}
                      onChange={(e) => setForm((p) => ({ ...p, observaciones_estudios: e.target.value }))}
                      placeholder="Resultados de estudios, conducta a seguir, alta, hospitalización o traslado..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {formSection === 'firmas' && (
                <div className="form-grid">
                  <div className="form-group full-width" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 8 }}>
                    <h4 style={{ margin: 0, color: '#334155' }}>Firmas oficiales del formato</h4>
                  </div>
                  <div className="form-group full-width">
                    <label>Nombre de enterado del familiar</label>
                    <input
                      type="text"
                      value={form.familiar_nombre}
                      onChange={(e) => setForm((p) => ({ ...p, familiar_nombre: e.target.value }))}
                      placeholder="Nombre del familiar o representante legal"
                    />
                  </div>
                  <div className="form-group">
                    <SelectorPersonalMedico
                      label="Nombre del personal médico"
                      nombre={form.medico_nombre}
                      cedula={form.medico_cedula}
                      onChange={(nom, ced) => {
                        setForm((p) => ({
                          ...p,
                          medico_nombre: nom,
                          ...(ced !== undefined ? { medico_cedula: ced } : {}),
                        }));
                      }}
                      placeholder="-- Seleccione personal médico de urgencias --"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cédula profesional</label>
                    <input
                      type="text"
                      value={form.medico_cedula}
                      onChange={(e) => setForm((p) => ({ ...p, medico_cedula: e.target.value }))}
                      placeholder="Cédula profesional médica"
                    />
                  </div>
                  <div className="form-group full-width" style={{ marginTop: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                    <strong>Firma autógrafa obligatoria:</strong> Conforme a la NOM-004-SSA3-2012, las firmas físicas del personal médico tratante y familiar responsable deben plasmarse de puño y letra al imprimir el formato oficial. No está permitido firmar digitalmente.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
            <div>
              {formSection !== 'registro' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const sections: ('registro' | 'signos' | 'anverso' | 'reverso' | 'firmas')[] = ['registro', 'signos', 'anverso', 'reverso', 'firmas'];
                    const idx = sections.indexOf(formSection);
                    if (idx > 0) setFormSection(sections[idx - 1]);
                  }}
                >
                  ← Sección anterior
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {formSection !== 'firmas' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const sections: ('registro' | 'signos' | 'anverso' | 'reverso' | 'firmas')[] = ['registro', 'signos', 'anverso', 'reverso', 'firmas'];
                    const idx = sections.indexOf(formSection);
                    if (idx < sections.length - 1) setFormSection(sections[idx + 1]);
                  }}
                >
                  Siguiente sección →
                </button>
              )}
              {editingNotaId && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEditNota}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Guardando...' : (editingNotaId ? <><Save size={14} /> Actualizar nota</> : <><Save size={14} /> Guardar consulta</>)}
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === 'historial' && (
        <div>
          {notas.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <p>No hay notas de urgencias registradas</p>
                </div>
              </div>
            </div>
          ) : (
            notas.map((nota) => (
              <div className="card" key={nota.id_nota_urgencias} style={{ marginBottom: 'var(--space-md)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>
                    Consulta #{nota.id_nota_urgencias} {nota.folio ? `— Folio: ${nota.folio}` : ''}
                    {nota.triage_color && (
                      <span className={`badge badge-triage-${nota.triage_color}`} style={{ marginLeft: 8 }}>
                        Triage {nota.triage_color}
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {formatearFecha(nota.fecha_hora_registro || nota.fecha_hora_atencion)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartEditNota(nota)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, color: '#0284c7', fontWeight: 600 }}
                      title="Editar o corregir esta nota de urgencias"
                    >
                      <Edit3 size={12} /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteNota(nota.id_nota_urgencias)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11 }}
                      title="Eliminar esta nota de urgencias"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {nota.motivo_consulta && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <strong style={{ fontSize: 12, color: 'var(--text-light)' }}>MOTIVO DE LA CONSULTA:</strong>
                      <p style={{ margin: '4px 0 0' }}>{nota.motivo_consulta}</p>
                    </div>
                  )}
                  {(nota.padecimiento_actual || nota.evolucion) && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <strong style={{ fontSize: 12, color: 'var(--text-light)' }}>PADECIMIENTO ACTUAL / EVOLUCIÓN:</strong>
                      <p style={{ margin: '4px 0 0' }}>{nota.padecimiento_actual || nota.evolucion}</p>
                    </div>
                  )}
                  {(nota.exploracion_fisica || nota.ef_urgencias) && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <strong style={{ fontSize: 12, color: 'var(--text-light)' }}>EXPLORACIÓN FÍSICA:</strong>
                      <p style={{ margin: '4px 0 0' }}>{nota.exploracion_fisica || nota.ef_urgencias}</p>
                    </div>
                  )}
                  {(nota.diagnosticos_presuncionales || nota.diagnostico) && (
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <strong style={{ fontSize: 12, color: 'var(--text-light)' }}>DIAGNÓSTICO:</strong>
                      <p style={{ margin: '4px 0 0' }}>{nota.diagnosticos_presuncionales || nota.diagnostico}</p>
                    </div>
                  )}
                  {(nota.tratamiento_plan || nota.plan) && (
                    <div>
                      <strong style={{ fontSize: 12, color: 'var(--text-light)' }}>PLAN Y TRATAMIENTO:</strong>
                      <p style={{ margin: '4px 0 0' }}>{nota.tratamiento_plan || nota.plan}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'estudios' && (
        <div className="card">
          <div className="card-header"><h3>Estudios solicitados</h3></div>
          <div className="card-body">
            {estudiosList.length === 0 ? (
              <div className="empty-state"><p>No hay estudios registrados</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nombre</th>
                      <th>Indicación</th>
                      <th>Resultados</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiosList.map((est) => (
                      <tr key={est.id_orden}>
                        <td><span className="badge badge-info">{est.tipo_estudio}</span></td>
                        <td><strong>{est.nombre_estudio}</strong></td>
                        <td>{est.indicacion || '—'}</td>
                        <td>
                          {est.resultados ? (
                            <span>{est.resultados}</span>
                          ) : (
                            <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Pendiente</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{formatearFecha(est.fecha_solicitud)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'nuevo_estudio' && (
        <form onSubmit={handleSaveEstudio}>
          <div className="card">
            <div className="card-header"><h3>Solicitar nuevo estudio</h3></div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de estudio *</label>
                  <select value={estudioForm.tipo_estudio} onChange={(e) => setEstudioForm((p) => ({ ...p, tipo_estudio: e.target.value }))}>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="gabinete">Gabinete</option>
                    <option value="imagenologia">Imagenología</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del estudio *</label>
                  <input
                    value={estudioForm.nombre_estudio}
                    onChange={(e) => setEstudioForm((p) => ({ ...p, nombre_estudio: e.target.value }))}
                    placeholder="Ej. Hemograma, USG obstétrico, Rx tórax..."
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Indicación o justificación</label>
                  <textarea
                    value={estudioForm.indicacion}
                    onChange={(e) => setEstudioForm((p) => ({ ...p, indicacion: e.target.value }))}
                    placeholder="Motivo por el cual se solicita el estudio..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Registrando...' : <><FileText size={14} /> Registrar estudio</>}
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <Link to={`/pacientes/${encData.id_paciente}`} className="btn btn-secondary">
          ← Volver al expediente
        </Link>
      </div>
    </div>
  );
}
