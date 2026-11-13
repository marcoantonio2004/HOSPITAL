import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { consentimientos, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { FileText, Save, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ArrowLeft, Printer } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function ConsentimientoMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const defaultForm = {
    unidad_medica: 'Hospital General San Felipe del Progreso',
    lugar: 'San Felipe del Progreso, México',
    fecha: new Date().toISOString().substring(0, 10),
    hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    ocupacion: '',
    servicio: 'Cirugía General',
    diagnosticos_clinicos: '',
    estudios_previos: '',
    actos_anestesicos: '',
    tratamiento_medico: '',
    tratamiento_quirurgico: '',
    riesgos_complicaciones: '',
    personal_medico_nombre: '',
    personal_medico_cedula: '',
    familiar_nombre: '',
    familiar_parentesco: 'Titular',
    testigo1_nombre: '',
    testigo2_nombre: '',
    firmado: true,
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        setEncuentroData(eRes.data);
        const pRes = await pacientes.get(eRes.data.id_paciente);
        if (pRes.success) {
          setPacienteData(pRes.data);
          setForm(prev => ({
            ...prev,
            ocupacion: pRes.data.ocupacion || 'Hogar / Campo',
            familiar_nombre: `${pRes.data.nombre || ''} ${pRes.data.apellido_paterno || ''} ${pRes.data.apellido_materno || ''}`.trim()
          }));
        }
      }

      const res = await consentimientos.list(parseInt(id!));
      if (res.success) {
        setLista(res.data || []);
        if (res.data && res.data.length > 0 && !showForm) {
          const item = res.data[0];
          setEditingId(item.id_consentimiento);
          setForm({
            unidad_medica: item.unidad_medica || 'Hospital General San Felipe del Progreso',
            lugar: item.lugar || 'San Felipe del Progreso, México',
            fecha: item.fecha ? String(item.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
            hora: item.hora ? String(item.hora).substring(0, 5) : '12:00',
            ocupacion: item.ocupacion || '',
            servicio: item.servicio || 'Cirugía General',
            diagnosticos_clinicos: item.diagnosticos_clinicos || '',
            estudios_previos: item.estudios_previos || '',
            actos_anestesicos: item.actos_anestesicos || '',
            tratamiento_medico: item.tratamiento_medico || '',
            tratamiento_quirurgico: item.tratamiento_quirurgico || '',
            riesgos_complicaciones: item.riesgos_complicaciones || '',
            personal_medico_nombre: item.personal_medico_nombre || '',
            personal_medico_cedula: item.personal_medico_cedula || '',
            familiar_nombre: item.familiar_nombre || '',
            familiar_parentesco: item.familiar_parentesco || 'Titular',
            testigo1_nombre: item.testigo1_nombre || '',
            testigo2_nombre: item.testigo2_nombre || '',
            firmado: Boolean(item.firmado),
          });
          setShowForm(true);
        } else if (!res.data || res.data.length === 0) {
          setShowForm(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleStartNew() {
    setEditingId(null);
    setForm({
      ...defaultForm,
      ocupacion: pacienteData?.ocupacion || 'Hogar / Campo',
      familiar_nombre: `${pacienteData?.nombre || ''} ${pacienteData?.apellido_paterno || ''} ${pacienteData?.apellido_materno || ''}`.trim()
    });
    setShowForm(true);
  }

  function handleStartEdit(item: any) {
    setEditingId(item.id_consentimiento);
    setForm({
      unidad_medica: item.unidad_medica || 'Hospital General San Felipe del Progreso',
      lugar: item.lugar || 'San Felipe del Progreso, México',
      fecha: item.fecha ? String(item.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
      hora: item.hora ? String(item.hora).substring(0, 5) : '12:00',
      ocupacion: item.ocupacion || '',
      servicio: item.servicio || 'Cirugía General',
      diagnosticos_clinicos: item.diagnosticos_clinicos || '',
      estudios_previos: item.estudios_previos || '',
      actos_anestesicos: item.actos_anestesicos || '',
      tratamiento_medico: item.tratamiento_medico || '',
      tratamiento_quirurgico: item.tratamiento_quirurgico || '',
      riesgos_complicaciones: item.riesgos_complicaciones || '',
      personal_medico_nombre: item.personal_medico_nombre || '',
      personal_medico_cedula: item.personal_medico_cedula || '',
      familiar_nombre: item.familiar_nombre || '',
      familiar_parentesco: item.familiar_parentesco || 'Titular',
      testigo1_nombre: item.testigo1_nombre || '',
      testigo2_nombre: item.testigo2_nombre || '',
      firmado: Boolean(item.firmado),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.diagnosticos_clinicos.trim() && !form.tratamiento_quirurgico.trim() && !form.tratamiento_medico.trim()) {
      showToast('Debe ingresar al menos un diagnóstico o procedimiento a consentir.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await consentimientos.update(parseInt(id!), editingId, form);
        showToast('Carta de consentimiento informado actualizada correctamente.', 'success');
      } else {
        await consentimientos.create(parseInt(id!), form);
        showToast('Carta de consentimiento informado registrada exitosamente.', 'success');
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar consentimiento informado.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(idConsentimiento: number) {
    const ok = await confirm({
      title: '¿Eliminar consentimiento informado?',
      message: 'Esta acción borrará de forma permanente el consentimiento registrado.',
      confirmText: 'Eliminar Consentimiento',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await consentimientos.remove(parseInt(id!), idConsentimiento);
      showToast('Consentimiento informado eliminado exitosamente.', 'success');
      if (editingId === idConsentimiento) {
        setEditingId(null);
        setForm(defaultForm);
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar consentimiento informado.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Consentimiento Informado...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <FileText size={24} style={{ color: '#0f3f2f' }} />
            Carta de Consentimiento Informado (Formato 208C0101100000L-393-25)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Norma Oficial Mexicana NOM-004-SSA3-2012 del Expediente Clínico
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'consentimiento'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleStartNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Nuevo Consentimiento
          </button>
          {showForm && (
            <button
              type="submit"
              form="form-consentimiento"
              className="btn btn-success"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Save size={14} /> {saving ? 'Guardando...' : (editingId ? 'Actualizar Consentimiento' : 'Guardar y Firmar')}
            </button>
          )}
        </div>
      </div>

      {editingId ? (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#065f46' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Modo edición: consentimiento registrado</strong>
            <div style={{ fontSize: 12 }}>Puede actualizar los diagnósticos, actos médicos o firmas. Al guardar se sincronizarán con el documento oficial.</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde047', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#854d0e' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Nuevo registro de consentimiento informado</strong>
            <div style={{ fontSize: 12 }}>Complete los campos requeridos para expedir la carta con validez médico-legal.</div>
          </div>
        </div>
      )}

      {/* Tarjeta de Datos Maestros del Paciente */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Ficha de Identificación del Paciente (Autocompletado Oficial)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Nombre de la o del Paciente" value={`${pacienteData?.nombre || ''} ${pacienteData?.apellido_paterno || ''} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="Núm. de Expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Fecha de Nacimiento" value={pacienteData?.fecha_nacimiento ? String(pacienteData.fecha_nacimiento).substring(0, 10) : '--'} />
            <AutoField label="Edad" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo} />
            <AutoField label="Estado Civil" value={pacienteData?.estado_civil || 'No especificado'} />
            <AutoField label="Domicilio" value={pacienteData?.domicilio || `${pacienteData?.domicilio_municipio || ''}, ${pacienteData?.domicilio_entidad || ''}`} />
          </div>
        </div>
      </div>

      {showForm && (
        <form id="form-consentimiento" onSubmit={handleSubmit}>
          {/* Sección 1: Datos de la Atención */}
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Datos de la atención médica</h3>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label>Unidad médica</label>
                  <input
                    type="text"
                    value={form.unidad_medica}
                    onChange={(e) => setForm(p => ({ ...p, unidad_medica: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lugar</label>
                  <input
                    type="text"
                    value={form.lugar}
                    onChange={(e) => setForm(p => ({ ...p, lugar: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm(p => ({ ...p, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm(p => ({ ...p, hora: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Servicio tratante</label>
                  <input
                    type="text"
                    value={form.servicio}
                    onChange={(e) => setForm(p => ({ ...p, servicio: e.target.value }))}
                    placeholder="Ej. Cirugía General, Medicina Interna, Urgencias"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ocupación del paciente</label>
                  <input
                    type="text"
                    value={form.ocupacion}
                    onChange={(e) => setForm(p => ({ ...p, ocupacion: e.target.value }))}
                    placeholder="Hogar, Campo, Comerciante, etc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Procedimientos e Intervenciones Médicas */}
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Procedimientos e intervenciones médicas bajo consentimiento</h3>
            </div>
            <div className="card-body">
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
                El personal médico tratante del servicio indicado informa al paciente sobre su padecimiento, procedimientos diagnósticos,
                anestésicos, médicos y quirúrgicos indispensables, así como riesgos y complicaciones previstas según la <strong>NOM-004-SSA3-2012</strong>.
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Diagnósticos clínicos</label>
                <textarea
                  value={form.diagnosticos_clinicos}
                  onChange={(e) => setForm(p => ({ ...p, diagnosticos_clinicos: e.target.value }))}
                  placeholder="Diagnóstico clínico principal y secundarios que motivan la intervención..."
                  style={{ minHeight: 65 }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Estudios de laboratorio, gabinete e histopatológicos</label>
                <textarea
                  value={form.estudios_previos}
                  onChange={(e) => setForm(p => ({ ...p, estudios_previos: e.target.value }))}
                  placeholder="Estudios previos realizados o programados (BH, QS, Tiempos, Rayos X, USG, Biopsia, etc.)..."
                  style={{ minHeight: 65 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Actos anestésicos</label>
                <textarea
                  value={form.actos_anestesicos}
                  onChange={(e) => setForm(p => ({ ...p, actos_anestesicos: e.target.value }))}
                  placeholder="Tipo de anestesia programada (General balanceada, Bloqueo regional peridural, Sedación, Local, etc.)..."
                  style={{ minHeight: 65 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Tratamiento médico</label>
                <textarea
                  value={form.tratamiento_medico}
                  onChange={(e) => setForm(p => ({ ...p, tratamiento_medico: e.target.value }))}
                  placeholder="Esquema farmacológico, fluidoterapia o soporte médico integral..."
                  style={{ minHeight: 65 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Tratamiento quirúrgico</label>
                <textarea
                  value={form.tratamiento_quirurgico}
                  onChange={(e) => setForm(p => ({ ...p, tratamiento_quirurgico: e.target.value }))}
                  placeholder="Intervención quirúrgica planeada, técnica y alcance..."
                  style={{ minHeight: 65 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontWeight: 600 }}>Riesgos y complicaciones</label>
                <textarea
                  value={form.riesgos_complicaciones}
                  onChange={(e) => setForm(p => ({ ...p, riesgos_complicaciones: e.target.value }))}
                  placeholder="Posibles riesgos, efectos adversos y complicaciones inherentes al procedimiento..."
                  style={{ minHeight: 65 }}
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Firmas y Personal Responsable */}
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Firmas y personal responsable</h3>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Personal médico tratante"
                    nombre={form.personal_medico_nombre}
                    cedula={form.personal_medico_cedula}
                    onChange={(nom, ced) => {
                      setForm(p => ({
                        ...p,
                        personal_medico_nombre: nom,
                        ...(ced !== undefined ? { personal_medico_cedula: ced } : {}),
                      }));
                    }}
                    placeholder="-- Seleccione personal médico tratante --"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cédula profesional del médico</label>
                  <input
                    type="text"
                    value={form.personal_medico_cedula}
                    onChange={(e) => setForm(p => ({ ...p, personal_medico_cedula: e.target.value }))}
                    placeholder="Número de cédula profesional"
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del paciente y/o familiar</label>
                  <input
                    type="text"
                    value={form.familiar_nombre}
                    onChange={(e) => setForm(p => ({ ...p, familiar_nombre: e.target.value }))}
                    placeholder="Nombre completo de quien otorga el consentimiento"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Parentesco o calidad jurídica</label>
                  <select
                    value={form.familiar_parentesco}
                    onChange={(e) => setForm(p => ({ ...p, familiar_parentesco: e.target.value }))}
                  >
                    <option value="Titular">Titular (Paciente)</option>
                    <option value="Padre/Madre">Padre / Madre (Menor de edad)</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Cónyuge">Cónyuge / Pareja</option>
                    <option value="Familiar Responsable">Familiar Responsable</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del testigo 1</label>
                  <input
                    type="text"
                    value={form.testigo1_nombre}
                    onChange={(e) => setForm(p => ({ ...p, testigo1_nombre: e.target.value }))}
                    placeholder="Nombre completo del testigo 1"
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del testigo 2</label>
                  <input
                    type="text"
                    value={form.testigo2_nombre}
                    onChange={(e) => setForm(p => ({ ...p, testigo2_nombre: e.target.value }))}
                    placeholder="Nombre completo del testigo 2"
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                <strong>Firma autógrafa obligatoria:</strong> Conforme a la normativa NOM-004-SSA3-2012, la firma física de puño y letra del médico tratante, paciente/familiar y testigos es obligatoria al imprimir el documento oficial. No está permitido firmar digitalmente ni mediante huella electrónica.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
              Volver al expediente
            </Link>
            <div style={{ display: 'flex', gap: 12 }}>
              {editingId && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingId)}
                  className="btn btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={16} /> Eliminar Consentimiento
                </button>
              )}
              <button
                type="submit"
                className="btn btn-success"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Save size={16} /> {saving ? 'Guardando...' : (editingId ? 'Actualizar consentimiento' : 'Registrar y guardar consentimiento')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Historial de Consentimientos Registrados */}
      {lista.length > 0 && (
        <div className="card" style={{ marginBottom: 40 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Historial de cartas de consentimiento para este encuentro ({lista.length})</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Servicio</th>
                    <th>Diagnóstico principal</th>
                    <th>Médico tratante</th>
                    <th>Paciente / Familiar</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c: any) => (
                    <tr key={c.id_consentimiento}>
                      <td style={{ fontSize: 12 }}>
                        {c.fecha ? String(c.fecha).substring(0, 10) : '--'} {c.hora ? String(c.hora).substring(0, 5) : ''}
                      </td>
                      <td><strong>{c.servicio || 'General'}</strong></td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.diagnosticos_clinicos || c.tratamiento_quirurgico || '--'}
                      </td>
                      <td>{c.personal_medico_nombre || '--'}</td>
                      <td>{c.familiar_nombre || '--'} ({c.familiar_parentesco || 'Titular'})</td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#047857', fontWeight: 600 }}
                            onClick={() => handleStartEdit(c)}
                            title="Editar consentimiento"
                          >
                            <Edit3 size={12} /> Editar
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            onClick={() => window.open(getPdfUrl(parseInt(id!), 'consentimiento'), '_blank')}
                            title="Imprimir PDF"
                          >
                            <Printer size={12} /> PDF
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 11 }}
                            onClick={() => handleDelete(c.id_consentimiento)}
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
