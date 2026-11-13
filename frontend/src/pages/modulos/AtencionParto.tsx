import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { atencionParto } from '../../services/api';
import { Save, Baby, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function AtencionPartoMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    fecha_hora_parto: '', indicacion_parto: '', tecnica_quirurgica: '', hallazgos: '',
    perdida_hematica_ml: '', complicaciones: '', gasas_completas: false,
    gasas_contadas: '', gasas_esperadas: '', metodo_planificacion_postparto: '', observaciones: '',
  });

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const res = await atencionParto.get(parseInt(id!));
      if (res.success && res.data) {
        setData(res.data); setIsEdit(true);
        setForm({
          fecha_hora_parto: res.data.fecha_hora_parto ? String(res.data.fecha_hora_parto).substring(0, 16) : '',
          indicacion_parto: res.data.indicacion_parto || '', tecnica_quirurgica: res.data.tecnica_quirurgica || '',
          hallazgos: res.data.hallazgos || '', perdida_hematica_ml: res.data.perdida_hematica_ml || '',
          complicaciones: res.data.complicaciones || '', gasas_completas: res.data.gasas_completas || false,
          gasas_contadas: res.data.gasas_contadas || '', gasas_esperadas: res.data.gasas_esperadas || '',
          metodo_planificacion_postparto: res.data.metodo_planificacion_postparto || '',
          observaciones: res.data.observaciones || '',
        });
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        fecha_hora_parto: form.fecha_hora_parto || null,
        perdida_hematica_ml: form.perdida_hematica_ml !== '' ? parseInt(String(form.perdida_hematica_ml), 10) : null,
        gasas_contadas: form.gasas_contadas !== '' ? parseInt(String(form.gasas_contadas), 10) : null,
        gasas_esperadas: form.gasas_esperadas !== '' ? parseInt(String(form.gasas_esperadas), 10) : null,
      };
      if (isEdit) { await atencionParto.update(parseInt(id!), payload); }
      else { await atencionParto.create(parseInt(id!), payload); }
      showToast('Atención de parto guardada exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar atención de parto.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Registro de Atención de Parto?',
      message: 'Esta acción borrará permanentemente la atención de parto y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await atencionParto.remove(parseInt(id!));
      showToast('Atención de parto eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar atención de parto.', 'error');
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
            <Baby size={24} style={{ color: '#0f3f2f' }} /> Atención de Parto
          </h1>
          <p style={{ color:'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Encuentro #{id} {data ? '- Registrada' : '- Nueva'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="submit" 
            form="form-atencion-parto"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Atención' : 'Guardar Atención de Parto')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo Edición:</strong> Registro de Atención de Parto previamente guardado. Puede corregir cualquier campo y actualizar los datos.
          </span>
        </div>
      )}

      <form id="form-atencion-parto" onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header"><h3>Nota Operatoria</h3></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group"><label>Fecha y Hora del Parto</label><input type="datetime-local" value={form.fecha_hora_parto} onChange={(e)=>setForm(p=>({...p,fecha_hora_parto:e.target.value}))}/></div>
              <div className="form-group"><label>Perdida Hematica (ml)</label><input type="number" value={form.perdida_hematica_ml} onChange={(e)=>setForm(p=>({...p,perdida_hematica_ml:e.target.value}))}/></div>
              <div className="form-group full-width"><label>Indicacion del Parto</label><textarea value={form.indicacion_parto} onChange={(e)=>setForm(p=>({...p,indicacion_parto:e.target.value}))} placeholder="Indicacion medica del parto..."/></div>
              <div className="form-group full-width"><label>Tecnica Quirurgica</label><textarea value={form.tecnica_quirurgica} onChange={(e)=>setForm(p=>({...p,tecnica_quirurgica:e.target.value}))} placeholder="Descripcion de la tecnica..." style={{minHeight:80}}/></div>
              <div className="form-group full-width"><label>Hallazgos</label><textarea value={form.hallazgos} onChange={(e)=>setForm(p=>({...p,hallazgos:e.target.value}))}/></div>
              <div className="form-group full-width"><label>Complicaciones</label><textarea value={form.complicaciones} onChange={(e)=>setForm(p=>({...p,complicaciones:e.target.value}))}/></div>
              <div className="form-group"><label>Gasas Completas</label><label className="checkbox-row"><input type="checkbox" checked={form.gasas_completas} onChange={(e)=>setForm(p=>({...p,gasas_completas:e.target.checked}))}/> Si</label></div>
              <div className="form-group"><label>Gasas Contadas</label><input type="number" value={form.gasas_contadas} onChange={(e)=>setForm(p=>({...p,gasas_contadas:e.target.value}))}/></div>
              <div className="form-group"><label>Gasas Esperadas</label><input type="number" value={form.gasas_esperadas} onChange={(e)=>setForm(p=>({...p,gasas_esperadas:e.target.value}))}/></div>
              <div className="form-group full-width"><label>Metodo Planificacion Postparto</label><input value={form.metodo_planificacion_postparto} onChange={(e)=>setForm(p=>({...p,metodo_planificacion_postparto:e.target.value}))}/></div>
              <div className="form-group full-width"><label>Observaciones</label><textarea value={form.observaciones} onChange={(e)=>setForm(p=>({...p,observaciones:e.target.value}))}/></div>
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
              {saving ? 'Guardando...' : (isEdit ? <><Save size={14}/> Actualizar Atención de Parto</> : <><Save size={14}/> Guardar</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
