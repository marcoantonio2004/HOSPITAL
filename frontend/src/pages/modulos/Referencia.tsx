import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { referencia } from '../../services/api';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { Save, RotateCcw, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function ReferenciaMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    hospital_receptor: '', especialidad: '', motivo: '', resumen_clinico: '',
    diagnostico: '', plan: '', medico_recibe_nombre: '', medico_recibe_cedula: '',
  });

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const res = await referencia.get(parseInt(id!));
      if (res.success && res.data) {
        setData(res.data); setIsEdit(true);
        setForm({
          hospital_receptor: res.data.hospital_receptor || '', especialidad: res.data.especialidad || '',
          motivo: res.data.motivo || '', resumen_clinico: res.data.resumen_clinico || '',
          diagnostico: res.data.diagnostico || '', plan: res.data.plan || '',
          medico_recibe_nombre: res.data.medico_recibe_nombre || '', medico_recibe_cedula: res.data.medico_recibe_cedula || '',
        });
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.hospital_receptor || !form.especialidad || !form.motivo || !form.resumen_clinico) {
      showToast('Hospital, especialidad, motivo y resumen clínico son requeridos.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) { await referencia.update(parseInt(id!), form); }
      else { await referencia.create(parseInt(id!), form); }
      showToast('Referencia guardada exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar referencia.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Nota de Referencia?',
      message: 'Esta acción borrará permanentemente la nota de referencia y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await referencia.remove(parseInt(id!));
      showToast('Nota de referencia eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar nota de referencia.', 'error');
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
          <h1 style={{ margin: 0, display:'flex', alignItems:'center', gap:8, fontSize: 20 }}>
            <RotateCcw size={24} style={{ color: '#0f3f2f' }} /> Nota de Referencia
          </h1>
          <p style={{ color:'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Encuentro #{id} {data ? '- Registrada' : '- Nueva'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="submit" 
            form="form-referencia"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Referencia' : 'Guardar Referencia')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo Edición:</strong> Nota de Referencia previamente registrada. Puede modificar cualquier campo y guardar los cambios.
          </span>
        </div>
      )}

      <form id="form-referencia" onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header"><h3>Datos de la Referencia</h3></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group"><label>Hospital Receptor *</label><input value={form.hospital_receptor} onChange={(e)=>setForm(p=>({...p,hospital_receptor:e.target.value}))} placeholder="Hospital de destino" required/></div>
              <div className="form-group"><label>Especialidad *</label><input value={form.especialidad} onChange={(e)=>setForm(p=>({...p,especialidad:e.target.value}))} placeholder="Especialidad solicitada" required/></div>
              <div className="form-group full-width"><label>Motivo *</label><textarea value={form.motivo} onChange={(e)=>setForm(p=>({...p,motivo:e.target.value}))} placeholder="Motivo de la referencia..." required/></div>
              <div className="form-group full-width"><label>Resumen Clinico *</label><textarea value={form.resumen_clinico} onChange={(e)=>setForm(p=>({...p,resumen_clinico:e.target.value}))} placeholder="Resumen del paciente, evolucion, estudios..." style={{minHeight:100}} required/></div>
              <div className="form-group full-width"><label>Diagnostico</label><textarea value={form.diagnostico} onChange={(e)=>setForm(p=>({...p,diagnostico:e.target.value}))}/></div>
              <div className="form-group full-width"><label>Plan</label><textarea value={form.plan} onChange={(e)=>setForm(p=>({...p,plan:e.target.value}))}/></div>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Médico que recibe"
                  nombre={form.medico_recibe_nombre}
                  cedula={form.medico_recibe_cedula}
                  onChange={(nom, ced) => {
                    setForm(p => ({
                      ...p,
                      medico_recibe_nombre: nom,
                      ...(ced !== undefined ? { medico_recibe_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico que recibe --"
                />
              </div>
              <div className="form-group"><label>Cédula médico que recibe</label><input value={form.medico_recibe_cedula} onChange={(e)=>setForm(p=>({...p,medico_recibe_cedula:e.target.value}))} placeholder="Cédula profesional"/></div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'var(--space-lg)' }}>
          <button type="button" onClick={()=>navigate(-1)} className="btn btn-secondary">Volver</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Eliminar Registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Guardando...' : (isEdit ? <><Save size={14}/> Actualizar Nota de Referencia</> : <><Save size={14}/> Guardar</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
