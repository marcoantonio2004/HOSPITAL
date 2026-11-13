import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internamiento, pacientes } from '../../services/api';
import { Save, Stethoscope, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function InternamientoMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [camasDisponibles, setCamasDisponibles] = useState<any[]>([]);

  const [form, setForm] = useState({
    area_destino: 'hospitalizacion', diagnostico_resumen: '', cama_asignada: '',
  });

  useEffect(() => {
    loadData();
    cargarCamas();
  }, [id]);

  async function cargarCamas() {
    try {
      const res = await pacientes.getCamas({ area: 'hospitalizacion', estado: 'disponible' });
      if (res?.success && res.data) {
        setCamasDisponibles(res.data.camas || []);
      }
    } catch {}
  }

  async function loadData() {
    try {
      const res = await internamiento.get(parseInt(id!));
      if (res.success && res.data) {
        setData(res.data);
        setIsEdit(true);
        setForm({
          area_destino: res.data.area_destino || 'hospitalizacion',
          diagnostico_resumen: res.data.diagnostico_resumen || '',
          cama_asignada: res.data.cama_asignada || '',
        });
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await internamiento.update(parseInt(id!), form);
      } else {
        await internamiento.create(parseInt(id!), form);
      }
      showToast('Internamiento guardado exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar internamiento.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Orden de Internamiento?',
      message: 'Esta acción borrará permanentemente la orden de internamiento y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await internamiento.remove(parseInt(id!));
      showToast('Orden de internamiento eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar orden de internamiento.', 'error');
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
            <Stethoscope size={24} style={{ color: '#0f3f2f' }} /> Orden de Internamiento
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Encuentro #{id} {data ? '- Registrado' : '- Nuevo'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="submit" 
            form="form-internamiento"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Orden' : 'Guardar Orden de Internamiento')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo Edición:</strong> Orden de Internamiento previamente registrada. Puede modificar cualquier campo y guardar los cambios.
          </span>
        </div>
      )}

      <form id="form-internamiento" onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header"><h3>Datos del Internamiento</h3></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Area Destino *</label>
                <select value={form.area_destino} onChange={(e) => setForm(p => ({...p, area_destino: e.target.value}))}>
                  <option value="hospitalizacion">Hospitalizacion</option>
                  <option value="observacion">Observacion</option>
                  <option value="terapia">Terapia Intensiva</option>
                  <option value="uci">UCI Neonatal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cama asignada</label>
                <select
                  value={form.cama_asignada}
                  onChange={(e) => setForm(p => ({ ...p, cama_asignada: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="">-- Seleccionar cama disponible --</option>
                  {form.cama_asignada && !camasDisponibles.some(c => c.numero === form.cama_asignada) && (
                    <option value={form.cama_asignada}>{form.cama_asignada} (Cama actual)</option>
                  )}
                  <optgroup label="Camas censables disponibles">
                    {camasDisponibles.filter(c => c.es_censable).map(c => (
                      <option key={c.id_cama} value={c.numero}>{c.numero} — Censable</option>
                    ))}
                  </optgroup>
                  <optgroup label="Camas no censables disponibles (tránsito / observación)">
                    {camasDisponibles.filter(c => !c.es_censable).map(c => (
                      <option key={c.id_cama} value={c.numero}>{c.numero} — No censable ({c.tipo || 'Tránsito'})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Diagnóstico resumen</label>
                <textarea value={form.diagnostico_resumen} onChange={(e) => setForm(p => ({...p, diagnostico_resumen: e.target.value}))}
                  placeholder="Resumen del diagnóstico de internamiento..." />
              </div>
              <div className="form-group full-width" style={{ marginTop: 6, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                <strong>Firma autógrafa obligatoria:</strong> Conforme a la NOM-004-SSA3-2012, la orden de internamiento requiere firma física de puño y letra del médico tratante al imprimirse. No se admiten firmas digitales.
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'var(--space-lg)' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Volver</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Eliminar registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Guardando...' : (isEdit ? <><Save size={14}/> Actualizar Orden de Internamiento</> : <><Save size={14}/> Guardar</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
