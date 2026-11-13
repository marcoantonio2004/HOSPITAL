import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interconsultas, getPdfUrl } from '../../services/api';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { Save, Plus, Trash2, Stethoscope, Edit3, CheckCircle2, Printer, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function InterconsultasMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm, promptConfirm } = useConfirm();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    cama: 'N/A',
    servicio_solicitante: 'Hospitalización',
    medico_solicitante_nombre: '',
    servicio_solicitado: '',
    motivo_interconsulta: '',
    medico_receptor_nombre: '',
    fecha_recibido: '',
    hora_recibido: '',
    diagnostico_sugerido: '',
  });

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try { const res = await interconsultas.list(parseInt(id!)); if (res.success) setLista(res.data); } catch {} finally { setLoading(false); }
  }

  function handleStartEdit(item: any) {
    setEditingId(item.id_interconsulta);
    setForm({
      cama: item.cama || 'N/A',
      servicio_solicitante: item.servicio_solicitante || 'Hospitalización',
      medico_solicitante_nombre: item.medico_solicitante_nombre || '',
      servicio_solicitado: item.servicio_solicitado || item.especialidad_solicitada || '',
      motivo_interconsulta: item.motivo_interconsulta || item.motivo || '',
      medico_receptor_nombre: item.medico_receptor_nombre || '',
      fecha_recibido: item.fecha_recibido ? String(item.fecha_recibido).substring(0, 10) : '',
      hora_recibido: item.hora_recibido ? String(item.hora_recibido).substring(0, 5) : '',
      diagnostico_sugerido: item.diagnostico_sugerido || '',
    });
    setShowForm(true);
  }

  function handleCancel() {
    setEditingId(null);
    setForm({
      cama: 'N/A',
      servicio_solicitante: 'Hospitalización',
      medico_solicitante_nombre: '',
      servicio_solicitado: '',
      motivo_interconsulta: '',
      medico_receptor_nombre: '',
      fecha_recibido: '',
      hora_recibido: '',
      diagnostico_sugerido: '',
    });
    setShowForm(false);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.servicio_solicitado.trim() || !form.motivo_interconsulta.trim()) {
      showToast('El servicio solicitado y el motivo son requeridos.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await interconsultas.update(editingId, form);
        showToast('Interconsulta actualizada exitosamente.', 'success');
      } else {
        await interconsultas.create(parseInt(id!), form);
        showToast('Interconsulta registrada exitosamente.', 'success');
      }
      setEditingId(null);
      setForm({
        cama: 'N/A',
        servicio_solicitante: 'Hospitalización',
        medico_solicitante_nombre: '',
        servicio_solicitado: '',
        motivo_interconsulta: '',
        medico_receptor_nombre: '',
        fecha_recibido: '',
        hora_recibido: '',
        diagnostico_sugerido: '',
      });
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar interconsulta.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRespuesta(idx: number) {
    const item = lista[idx];
    const dictamen = await promptConfirm({
      title: 'Dictamen de Especialidad',
      message: `Interconsulta de ${item.servicio_solicitado || item.especialidad_solicitada || 'especialidad'}:`,
      input: {
        label: 'Dictamen médico / Respuesta',
        placeholder: 'Escriba las conclusiones y conducta terapéutica recomendada...',
        multiline: true,
        required: true,
      },
      confirmText: 'Guardar Dictamen',
    });
    if (!dictamen) return;
    try {
      await interconsultas.update(item.id_interconsulta, { dictamen, estado: 'atendida' });
      showToast('Dictamen guardado exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar dictamen.', 'error');
    }
  }

  async function handleDelete(idx: number) {
    const ok = await confirm({
      title: '¿Eliminar interconsulta?',
      message: '¿Está seguro de que desea eliminar este registro de interconsulta? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await interconsultas.remove(lista[idx].id_interconsulta);
      showToast('Interconsulta eliminada exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar interconsulta.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 4, padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver al Expediente
          </button>
          <h1 style={{ display:'flex', alignItems:'center', gap:8, margin: 0, fontSize: 20 }}>
            <Stethoscope size={24} style={{ color: '#0f3f2f' }} /> 4.10 Interconsultas Médicas
          </h1>
          <p style={{ color:'var(--text-light)', fontSize:12, margin: '2px 0 0 0' }}>
            Encuentro #{id} — Solicitud y emisión de dictamen interdepartamental
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'interconsulta'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button className="btn btn-outline-primary" onClick={() => { setEditingId(null); handleCancel(); setShowForm(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Nueva Interconsulta
          </button>
          {showForm && (
            <button
              type="submit"
              form="form-interconsulta"
              className="btn btn-success"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <Save size={14} /> {saving ? 'Guardando...' : (editingId ? 'Actualizar Interconsulta' : 'Guardar y Solicitar')}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form id="form-interconsulta" onSubmit={handleCreate}>
          <div className="card" style={{ marginBottom:'var(--space-md)', border: editingId ? '2px solid #047857' : undefined }}>
            <div className="card-header" style={{ background: editingId ? '#047857' : undefined, color: editingId ? '#fff' : undefined }}>
              <h3 style={{ margin:0, color: editingId ? '#fff' : undefined, display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingId ? <><Edit3 size={18} /> Editando Interconsulta</> : 'Nueva Interconsulta'}
              </h3>
            </div>
            <div className="card-body">
              {editingId && (
                <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span style={{ fontSize: 13, color: '#065f46' }}>
                    ✏️ <strong>Modo Edición:</strong> Modificando interconsulta para corregir errores. Al guardar se actualizarán los datos.
                  </span>
                </div>
              )}
              <div className="form-grid">
                <div className="form-group">
                  <label>Servicio que solicita la interconsulta *</label>
                  <input value={form.servicio_solicitante} onChange={(e)=>setForm(p=>({...p,servicio_solicitante:e.target.value}))} placeholder="Hospitalización, Urgencias, etc." required/>
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Personal médico solicitante"
                    nombre={form.medico_solicitante_nombre}
                    onChange={(nom) => setForm(p => ({ ...p, medico_solicitante_nombre: nom }))}
                    placeholder="-- Seleccione médico solicitante --"
                  />
                </div>
                <div className="form-group">
                  <label>Cama</label>
                  <input value={form.cama} onChange={(e)=>setForm(p=>({...p,cama:e.target.value}))} placeholder="Cama o N/A"/>
                </div>
                <div className="form-group">
                  <label>Servicio al que se le solicita la interconsulta *</label>
                  <input value={form.servicio_solicitado} onChange={(e)=>setForm(p=>({...p,servicio_solicitado:e.target.value}))} placeholder="Cardiología, Cirugía General, etc." required/>
                </div>
                <div className="form-group full-width">
                  <label>Motivo de la interconsulta *</label>
                  <textarea value={form.motivo_interconsulta} onChange={(e)=>setForm(p=>({...p,motivo_interconsulta:e.target.value}))} placeholder="Describa el motivo clínico de la solicitud..." required/>
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Personal médico que recibe la solicitud"
                    nombre={form.medico_receptor_nombre}
                    onChange={(nom) => setForm(p => ({ ...p, medico_receptor_nombre: nom }))}
                    placeholder="-- Seleccione médico interconsultante --"
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de recibido</label>
                  <input type="date" value={form.fecha_recibido} onChange={(e)=>setForm(p=>({...p,fecha_recibido:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>Hora de recibido</label>
                  <input type="time" value={form.hora_recibido} onChange={(e)=>setForm(p=>({...p,hora_recibido:e.target.value}))}/>
                </div>
                <div className="form-group full-width">
                  <label>Diagnóstico sugerido</label>
                  <input value={form.diagnostico_sugerido} onChange={(e)=>setForm(p=>({...p,diagnostico_sugerido:e.target.value}))} placeholder="Diagnóstico sugerido o complementario..."/>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginBottom:'var(--space-lg)' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Guardando...' : (editingId ? <><Save size={14}/> Actualizar Interconsulta</> : <><Save size={14}/> Guardar</>)}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header"><h3>Interconsultas ({lista.length})</h3></div>
        <div className="card-body">
          {lista.length === 0 ? (
            <div className="empty-state"><p>Sin interconsultas</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Fecha</th><th>Servicio Solicitado</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {lista.map((ic: any, i: number) => (
                    <tr key={ic.id_interconsulta}>
                      <td style={{fontSize:12}}>{new Date(ic.fecha_solicitud).toLocaleDateString('es-MX')}</td>
                      <td><strong>{ic.servicio_solicitado || ic.especialidad_solicitada}</strong></td>
                      <td style={{maxWidth:300,whiteSpace:'pre-wrap'}}>{ic.motivo_interconsulta || ic.motivo}</td>
                      <td><span className={`badge badge-${ic.estado === 'pendiente' ? 'warning' : ic.estado === 'atendida' ? 'success' : 'danger'}`}>{ic.estado}</span></td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-secondary" style={{fontSize:11, display:'inline-flex', alignItems:'center', gap:3, color: '#047857', fontWeight: 600}} onClick={()=>handleStartEdit(ic)} title="Editar interconsulta">
                            <Edit3 size={12}/> Editar
                          </button>
                          {ic.estado === 'pendiente' && <button className="btn btn-success" style={{fontSize:11}} onClick={()=>handleRespuesta(i)}>Responder</button>}
                          <button className="btn btn-danger" style={{fontSize:11}} onClick={()=>handleDelete(i)}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop:'var(--space-lg)' }}><button onClick={()=>navigate(-1)} className="btn btn-secondary">Volver</button></div>
    </div>
  );
}
