import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { evolucion, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { FileText, Save, Plus, Printer, ArrowLeft, ShieldCheck, Edit3, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function EvolucionDiariaMod() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [form, setForm] = useState({
    fecha: today,
    hora: nowTime,
    turno: 'matutino',
    temperatura: '',
    presion_arterial: '',
    frecuencia_cardiaca: '',
    frecuencia_respiratoria: '',
    saturacion_oxigeno: '',
    diuresis: '',
    evacuaciones: '',
    peso: '',
    talla: '',
    subjetivo: '',
    objetivo: '',
    analisis: '',
    plan: '',
    nota_evolucion_texto: '',
    medico_nombre: '',
    medico_cedula: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        setEncuentroData(eRes.data);
        const pRes = await pacientes.get(eRes.data.id_paciente);
        if (pRes.success) setPacienteData(pRes.data);
      }

      const res = await evolucion.list(parseInt(id!));
      if (res.success) setLista(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const initialForm = {
    fecha: today,
    hora: nowTime,
    turno: 'matutino',
    temperatura: '',
    presion_arterial: '',
    frecuencia_cardiaca: '',
    frecuencia_respiratoria: '',
    saturacion_oxigeno: '',
    diuresis: '',
    evacuaciones: '',
    peso: '',
    talla: '',
    subjetivo: '',
    objetivo: '',
    analisis: '',
    plan: '',
    nota_evolucion_texto: '',
    medico_nombre: '',
    medico_cedula: '',
  };

  function handleStartEdit(item: any) {
    setEditingId(item.id_nota_evolucion);
    setForm({
      fecha: item.fecha ? String(item.fecha).substring(0, 10) : today,
      hora: item.hora ? String(item.hora).substring(0, 5) : nowTime,
      turno: item.turno || 'matutino',
      temperatura: item.temperatura !== null && item.temperatura !== undefined ? String(item.temperatura) : '',
      presion_arterial: item.presion_arterial || '',
      frecuencia_cardiaca: item.frecuencia_cardiaca !== null && item.frecuencia_cardiaca !== undefined ? String(item.frecuencia_cardiaca) : '',
      frecuencia_respiratoria: item.frecuencia_respiratoria !== null && item.frecuencia_respiratoria !== undefined ? String(item.frecuencia_respiratoria) : '',
      saturacion_oxigeno: item.saturacion_oxigeno !== null && item.saturacion_oxigeno !== undefined ? String(item.saturacion_oxigeno) : '',
      diuresis: item.diuresis || '',
      evacuaciones: item.evacuaciones || '',
      peso: item.peso !== null && item.peso !== undefined ? String(item.peso) : '',
      talla: item.talla !== null && item.talla !== undefined ? String(item.talla) : '',
      subjetivo: item.subjetivo || '',
      objetivo: item.objetivo || '',
      analisis: item.analisis || '',
      plan: item.plan || '',
      nota_evolucion_texto: item.nota_evolucion_texto || '',
      medico_nombre: item.medico_nombre || '',
      medico_cedula: item.medico_cedula || '',
    });
    setShowForm(true);
  }

  function handleCancelForm() {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(false);
  }

  async function handleDeleteNota(notaId: number) {
    const ok = await confirm({
      title: '¿Eliminar Nota de Evolución?',
      message: 'Esta acción eliminará de forma permanente esta nota de evolución del expediente.',
      confirmText: 'Eliminar Nota',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await evolucion.remove(notaId);
      showToast('Nota de evolución eliminada correctamente.', 'success');
      if (editingId === notaId) {
        handleCancelForm();
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar nota de evolución.', 'error');
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...form };
      ['temperatura', 'frecuencia_cardiaca', 'frecuencia_respiratoria', 'saturacion_oxigeno', 'peso', 'talla'].forEach(k => {
        payload[k] = payload[k] ? parseFloat(payload[k]) : null;
      });
      if (editingId) {
        await evolucion.update(editingId, payload);
        showToast('Nota de evolución actualizada correctamente.', 'success');
      } else {
        await evolucion.create(parseInt(id!), payload);
        showToast('Nota de evolución firmada y anexada al expediente.', 'success');
      }
      setEditingId(null);
      setForm(initialForm);
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar nota de evolución.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando notas de evolución...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <FileText size={24} style={{ color: '#0f3f2f' }} />
            4.9 Notas de Evolución Médica
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Bloque 1: Núcleo del Expediente — Registro cronológico inmutable de solo-anexar (NOM-004-SSA3)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'evolucion'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button className="btn btn-success" onClick={() => { setEditingId(null); setForm(initialForm); setShowForm(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Anexar Nota de Evolución
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Campos Autocompletados del Maestro de Pacientes (Solo Lectura)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Paciente" value={`${pacienteData?.nombre} ${pacienteData?.apellido_paterno} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="Expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="CURP" value={pacienteData?.curp} />
            <AutoField label="Edad" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo} />
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate}>
          <div className="card" style={{ marginBottom: 'var(--space-md)', border: editingId ? '2px solid #047857' : '2px solid #0f3f2f' }}>
            <div className="card-header" style={{ background: editingId ? '#047857' : '#0f3f2f', color: '#fff' }}>
              <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingId ? <><Edit3 size={18} /> Editando Nota de Evolución #{lista.findIndex(x => x.id_nota_evolucion === editingId) + 1}</> : 'Nueva Nota de Evolución (Solo-Anexar Inmutable)'}
              </h3>
            </div>
            <div className="card-body">
              {editingId && (
                <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span style={{ fontSize: 13, color: '#065f46' }}>
                    ✏️ <strong>Modo Edición:</strong> Modificando datos previamente guardados. Al guardar se actualizarán los campos clínicos de esta nota.
                  </span>
                </div>
              )}
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div className="form-group"><label>Fecha *</label><input type="date" value={form.fecha} onChange={(e) => setForm(p => ({ ...p, fecha: e.target.value }))} required /></div>
                <div className="form-group"><label>Hora *</label><input type="time" value={form.hora} onChange={(e) => setForm(p => ({ ...p, hora: e.target.value }))} required /></div>
                <div className="form-group">
                  <label>Turno *</label>
                  <select value={form.turno} onChange={(e) => setForm(p => ({ ...p, turno: e.target.value }))}>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="nocturno">Nocturno</option>
                  </select>
                </div>
                <div className="form-group"><label>Temp. (°C)</label><input type="number" step="0.1" value={form.temperatura} onChange={(e) => setForm(p => ({ ...p, temperatura: e.target.value }))} placeholder="36.5" /></div>
                <div className="form-group"><label>TA (mmHg)</label><input value={form.presion_arterial} onChange={(e) => setForm(p => ({ ...p, presion_arterial: e.target.value }))} placeholder="120/80" /></div>
                <div className="form-group"><label>FC (lpm)</label><input type="number" value={form.frecuencia_cardiaca} onChange={(e) => setForm(p => ({ ...p, frecuencia_cardiaca: e.target.value }))} placeholder="75" /></div>
                <div className="form-group"><label>FR (rpm)</label><input type="number" value={form.frecuencia_respiratoria} onChange={(e) => setForm(p => ({ ...p, frecuencia_respiratoria: e.target.value }))} placeholder="18" /></div>
                <div className="form-group"><label>SatO2 (%)</label><input type="number" value={form.saturacion_oxigeno} onChange={(e) => setForm(p => ({ ...p, saturacion_oxigeno: e.target.value }))} placeholder="98" /></div>
                <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" value={form.peso} onChange={(e) => setForm(p => ({ ...p, peso: e.target.value }))} placeholder="70" /></div>
                <div className="form-group"><label>Talla (cm)</label><input type="number" step="0.5" value={form.talla} onChange={(e) => setForm(p => ({ ...p, talla: e.target.value }))} placeholder="165" /></div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div className="form-group full-width">
                  <label>Nota de evolución médica (Observaciones clínicas generales)</label>
                  <textarea value={form.nota_evolucion_texto} onChange={(e) => setForm(p => ({ ...p, nota_evolucion_texto: e.target.value }))} placeholder="Resumen clínico de la evolución, estado general, tolerancia..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-group full-width">
                  <label>S - Subjetivo (Síntomas manifestados por el paciente)</label>
                  <textarea value={form.subjetivo} onChange={(e) => setForm(p => ({ ...p, subjetivo: e.target.value }))} placeholder="Refiere mejoría en dolor, tolerancia a vía oral..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-group full-width">
                  <label>O - Objetivo (Exploración física y paraclínicos actuales)</label>
                  <textarea value={form.objetivo} onChange={(e) => setForm(p => ({ ...p, objetivo: e.target.value }))} placeholder="Abdomen blando, heridas quirúrgicas limpias, ruidos presentes..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-group full-width">
                  <label>A - Análisis (Juicio clínico, diagnóstico de evolución y pronóstico)</label>
                  <textarea value={form.analisis} onChange={(e) => setForm(p => ({ ...p, analisis: e.target.value }))} placeholder="Evolución hacia la mejoría, sin datos de choque o infección..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-group full-width">
                  <label>P - Plan (Ajustes terapéuticos, medicamentos y metas)</label>
                  <textarea value={form.plan} onChange={(e) => setForm(p => ({ ...p, plan: e.target.value }))} placeholder="Continuar esquema antibiótico, retiro de sonda, egreso programado..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Médico Tratante"
                    nombre={form.medico_nombre}
                    cedula={form.medico_cedula}
                    onChange={(nom, ced) => {
                      setForm(p => ({
                        ...p,
                        medico_nombre: nom,
                        ...(ced !== undefined ? { medico_cedula: ced } : {}),
                      }));
                    }}
                    placeholder="-- Seleccione médico tratante --"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cédula Profesional</label>
                  <input type="text" value={form.medico_cedula} onChange={(e) => setForm(p => ({ ...p, medico_cedula: e.target.value }))} placeholder="Cédula" required />
                </div>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                <strong>Firma autógrafa obligatoria:</strong> Conforme a la NOM-004-SSA3-2012, la firma física y sello del médico tratante son obligatorios al imprimir la nota de evolución. No se admiten firmas digitales.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>Cancelar</button>
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Guardando...' : (editingId ? <><Save size={14} /> Actualizar nota de evolución</> : <><Save size={14} /> Guardar y anexar nota</>)}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Historial de Notas de Evolución */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Historial Cronológico de Notas ({lista.length})</h3>
        </div>
        <div className="card-body">
          {lista.length === 0 ? (
            <div className="empty-state"><p>Sin notas de evolución registradas para este encuentro</p></div>
          ) : (
            lista.map((n: any, idx: number) => (
              <div key={n.id_nota_evolucion || idx} className="card" style={{ marginBottom: 'var(--space-md)', border: '1px solid #e2e8f0' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <h3 style={{ margin: 0, fontSize: 13, color: '#0f3f2f' }}>
                    NOTA #{idx + 1} — {n.fecha} ({n.turno ? n.turno.toUpperCase() : 'GENERAL'})
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={12} /> Registrada
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartEdit(n)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, color: '#047857', fontWeight: 600 }}
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteNota(n.id_nota_evolucion)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 12 }}
                      title="Eliminar esta nota de evolución"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
                <div className="card-body" style={{ fontSize: 13 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 12 }}>
                    {n.temperatura && <span><strong>Temp:</strong> {n.temperatura} °C</span>}
                    {n.presion_arterial && <span><strong>TA:</strong> {n.presion_arterial} mmHg</span>}
                    {n.frecuencia_cardiaca && <span><strong>FC:</strong> {n.frecuencia_cardiaca} lpm</span>}
                    {n.frecuencia_respiratoria && <span><strong>FR:</strong> {n.frecuencia_respiratoria} rpm</span>}
                    {n.saturacion_oxigeno && <span><strong>SatO2:</strong> {n.saturacion_oxigeno} %</span>}
                    {n.peso && <span><strong>Peso:</strong> {n.peso} kg</span>}
                  </div>

                  {n.subjetivo && <p style={{ margin: '4px 0' }}><strong>Subjetivo:</strong> {n.subjetivo}</p>}
                  {n.objetivo && <p style={{ margin: '4px 0' }}><strong>Objetivo:</strong> {n.objetivo}</p>}
                  {n.analisis && <p style={{ margin: '4px 0' }}><strong>Análisis:</strong> {n.analisis}</p>}
                  {n.plan && <p style={{ margin: '4px 0' }}><strong>Plan:</strong> {n.plan}</p>}
                  {n.nota_evolucion_texto && <p style={{ margin: '4px 0' }}>{n.nota_evolucion_texto}</p>}

                  <div style={{ marginTop: 10, paddingTop: 6, borderTop: '1px dashed #e2e8f0', fontSize: 11, color: '#64748b' }}>
                    Registrado por: {n.medico_nombre || 'Médico tratante'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
