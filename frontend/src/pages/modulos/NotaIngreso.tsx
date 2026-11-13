import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notaIngreso } from '../../services/api';
import { Save, FileText, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function NotaIngresoMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    subjetivo: '', objetivo: '', analisis: '', plan: '',
  });

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const res = await notaIngreso.get(parseInt(id!));
      if (res.success && res.data) {
        setData(res.data);
        setIsEdit(true);
        setForm({
          subjetivo: res.data.subjetivo || '',
          objetivo: res.data.objetivo || '',
          analisis: res.data.analisis || '',
          plan: res.data.plan || '',
        });
      }
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await notaIngreso.create(parseInt(id!), form);
      showToast(isEdit ? 'Nota de ingreso actualizada exitosamente.' : 'Nota de ingreso guardada exitosamente.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar nota de ingreso.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Nota de Ingreso?',
      message: 'Esta acción borrará permanentemente la información capturada de la nota de ingreso y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await notaIngreso.remove(parseInt(id!));
      showToast('Nota de ingreso eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar nota de ingreso.', 'error');
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
            <FileText size={24} style={{ color: '#0f3f2f' }} /> Nota de Ingreso (SOAP)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Encuentro #{id} {data ? '(Registrada)' : '(Nueva)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="submit" 
            form="form-nota-ingreso"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14}/> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Nota' : 'Guardar Nota')}
          </button>
        </div>
      </div>

      {isEdit && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo Edición:</strong> Nota de Ingreso previamente registrada. Puede modificar cualquier campo clínico y actualizar el formato.
          </span>
        </div>
      )}

      <form id="form-nota-ingreso" onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header"><h3>Formato SOAP</h3></div>
          <div className="card-body">
            <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
              <label><strong>S</strong> — Subjetivo (lo que refiere el paciente)</label>
              <textarea value={form.subjetivo} onChange={(e) => setForm(p => ({...p, subjetivo: e.target.value}))}
                placeholder="Motivo de consulta, sintomas, evolucion..." style={{minHeight:100}} />
            </div>
            <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
              <label><strong>O</strong> — Objetivo (hallazgos de exploracion y estudios)</label>
              <textarea value={form.objetivo} onChange={(e) => setForm(p => ({...p, objetivo: e.target.value}))}
                placeholder="Signos vitales, hallazgos de exploracion fisica, resultados de estudios..." style={{minHeight:100}} />
            </div>
            <div className="form-group full-width" style={{ marginBottom: 'var(--space-md)' }}>
              <label><strong>A</strong> — Analisis (razonamiento clinico)</label>
              <textarea value={form.analisis} onChange={(e) => setForm(p => ({...p, analisis: e.target.value}))}
                placeholder="Correlacion clinica, diagnostico diferencial..." style={{minHeight:100}} />
            </div>
            <div className="form-group full-width">
              <label><strong>P</strong> — Plan</label>
              <textarea value={form.plan} onChange={(e) => setForm(p => ({...p, plan: e.target.value}))}
                placeholder="Plan de tratamiento, estudios, interconsultas..." style={{minHeight:100}} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'var(--space-lg)' }}>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Volver</button>
          <div style={{ display: 'flex', gap: 10 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Eliminar Registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Guardando...' : (isEdit ? <><Save size={14}/> Actualizar Nota de Ingreso</> : <><Save size={14}/> Guardar</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
