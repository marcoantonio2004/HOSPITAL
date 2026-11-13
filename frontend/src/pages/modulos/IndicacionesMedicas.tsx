import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hojaIndicaciones, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { Syringe, Save, Plus, Printer, ArrowLeft, ShieldAlert, Edit3, Trash2, Activity } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function IndicacionesMedicasMod() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingOrden, setSavingOrden] = useState(false);
  const [showOrdenForm, setShowOrdenForm] = useState(false);
  const [editingOrdenId, setEditingOrdenId] = useState<number | null>(null);

  const [headerForm, setHeaderForm] = useState({
    hoja_num: 1,
    unidad_medica: 'Hospital General San Felipe del Progreso',
    servicio: 'Hospitalización General',
    fecha: new Date().toISOString().substring(0, 10),
    hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    ta: '',
    temp: '',
    fc: '',
    fr: '',
    peso: '',
    talla: '',
  });

  const [ordenesList, setOrdenesList] = useState<any[]>([]);

  const [ordenForm, setOrdenForm] = useState({
    fecha: new Date().toISOString().substring(0, 10),
    hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    indicacion: '',
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
        if (pRes.success) {
          setPacienteData(pRes.data);
        }
      }

      const hRes = await hojaIndicaciones.get(parseInt(id!));
      if (hRes.success && hRes.data) {
        const d = hRes.data;
        setHeaderForm({
          hoja_num: d.hoja_num || 1,
          unidad_medica: d.unidad_medica || 'Hospital General San Felipe del Progreso',
          servicio: d.servicio || 'Hospitalización General',
          fecha: d.fecha ? String(d.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
          hora: d.hora ? String(d.hora).substring(0, 5) : new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
          ta: d.ta || '',
          temp: d.temp != null ? String(d.temp) : '',
          fc: d.fc != null ? String(d.fc) : '',
          fr: d.fr != null ? String(d.fr) : '',
          peso: d.peso != null ? String(d.peso) : '',
          talla: d.talla != null ? String(d.talla) : '',
        });
        setOrdenesList(Array.isArray(d.ordenes) ? d.ordenes : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveHeader(e: FormEvent) {
    e.preventDefault();
    setSavingHeader(true);
    try {
      await hojaIndicaciones.save(parseInt(id!), headerForm);
      showToast('Encabezado y signos vitales actualizados correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar encabezado.', 'error');
    } finally {
      setSavingHeader(false);
    }
  }

  function handleStartNewOrden() {
    setEditingOrdenId(null);
    setOrdenForm({
      fecha: new Date().toISOString().substring(0, 10),
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      indicacion: '',
      medico_nombre: '',
      medico_cedula: '',
    });
    setShowOrdenForm(true);
  }

  function handleStartEditOrden(item: any) {
    const ordenId = item.id_orden || item.id_indicacion;
    setEditingOrdenId(ordenId);
    setOrdenForm({
      fecha: item.fecha ? String(item.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
      hora: item.hora ? String(item.hora).substring(0, 5) : new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      indicacion: item.indicacion || '',
      medico_nombre: item.medico_nombre || '',
      medico_cedula: item.medico_cedula || '',
    });
    setShowOrdenForm(true);
  }

  function handleCancelOrden() {
    setEditingOrdenId(null);
    setShowOrdenForm(false);
  }

  async function handleSaveOrden(e: FormEvent) {
    e.preventDefault();
    if (!ordenForm.indicacion.trim()) {
      showToast('La indicación médica es requerida.', 'warning');
      return;
    }
    setSavingOrden(true);
    try {
      if (editingOrdenId) {
        await hojaIndicaciones.updateOrden(parseInt(id!), editingOrdenId, ordenForm);
        showToast('Indicación médica actualizada exitosamente.', 'success');
      } else {
        await hojaIndicaciones.createOrden(parseInt(id!), {
          ...ordenForm,
          servicio: headerForm.servicio,
        });
        showToast('Nueva indicación médica anexada a la hoja oficial.', 'success');
      }
      handleCancelOrden();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar indicación médica.', 'error');
    } finally {
      setSavingOrden(false);
    }
  }

  async function handleDeleteOrden(item: any) {
    const targetId = item.id_orden || item.id_indicacion;
    const ok = await confirm({
      title: '¿Eliminar indicación médica?',
      message: 'Esta acción eliminará de forma permanente esta indicación del expediente clínico.',
      confirmText: 'Eliminar indicación',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await hojaIndicaciones.deleteOrden(parseInt(id!), targetId);
      showToast('Indicación médica eliminada correctamente.', 'success');
      if (editingOrdenId === targetId) {
        handleCancelOrden();
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar indicación médica.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Hoja de Indicaciones Médicas...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <Syringe size={24} style={{ color: '#0f3f2f' }} />
            Hoja de Indicaciones Médicas (Formato 208C0101100000L-047-19)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Registro cronológico inmutable de órdenes para el personal médico adscrito y personal de enfermería (NOM-004-SSA3)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'indicaciones'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="button"
            className="btn btn-success" 
            onClick={handleStartNewOrden} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Anexar nueva indicación
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Identificación de la o el paciente (autocompletado del expediente)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Nombre completo" value={`${pacienteData?.nombre || ''} ${pacienteData?.apellido_paterno || ''} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="Núm. expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Edad" value={pacienteData?.edad ? `${pacienteData.edad} años` : '--'} />
            <AutoField label="Género" value={pacienteData?.sexo || '--'} />
            <AutoField label="CURP" value={pacienteData?.curp} />
            <AutoField label="Alergias" value={pacienteData?.alergias || 'Negadas'} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveHeader}>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} />
              Datos de la hoja y signos vitales
            </h3>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingHeader} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {savingHeader ? 'Guardando...' : 'Guardar datos de la hoja'}
            </button>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="form-group">
                <label>Hoja núm.</label>
                <input
                  type="number"
                  min="1"
                  value={headerForm.hoja_num}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, hoja_num: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Unidad médica</label>
                <input
                  type="text"
                  value={headerForm.unidad_medica}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, unidad_medica: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Servicio</label>
                <input
                  type="text"
                  value={headerForm.servicio}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, servicio: e.target.value }))}
                  placeholder="Hospitalización General"
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={headerForm.fecha}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, fecha: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora</label>
                <input
                  type="time"
                  value={headerForm.hora}
                  onChange={(e) => setHeaderForm((p) => ({ ...p, hora: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>
                Signos vitales al momento de las indicaciones
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div className="form-group">
                  <label>Tensión arterial (T/A)</label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={headerForm.ta}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, ta: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={headerForm.temp}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, temp: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Frecuencia cardíaca (lpm)</label>
                  <input
                    type="number"
                    placeholder="75"
                    value={headerForm.fc}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, fc: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Frecuencia respiratoria (rpm)</label>
                  <input
                    type="number"
                    placeholder="18"
                    value={headerForm.fr}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, fr: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="68.0"
                    value={headerForm.peso}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, peso: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="165.0"
                    value={headerForm.talla}
                    onChange={(e) => setHeaderForm((p) => ({ ...p, talla: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showOrdenForm && (
        <form onSubmit={handleSaveOrden}>
          <div className="card" style={{ marginBottom: 'var(--space-md)', border: '2px solid #0f3f2f' }}>
            <div className="card-header" style={{ background: '#0f3f2f', color: '#fff' }}>
              <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingOrdenId ? <><Edit3 size={18} /> Modificar indicación médica</> : <><Plus size={18} /> Anexar nueva indicación médica</>}
              </h3>
            </div>
            <div className="card-body">
              <div style={{ padding: 10, background: '#f1f5f9', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} color="#0f3f2f" />
                Conforme a la NOM-004-SSA3, cada indicación médica queda registrada en el sistema. La firma física autógrafa del médico tratante es obligatoria al imprimir el formato oficial. No está permitido firmar digitalmente.
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={ordenForm.fecha}
                    onChange={(e) => setOrdenForm((p) => ({ ...p, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora</label>
                  <input
                    type="time"
                    value={ordenForm.hora}
                    onChange={(e) => setOrdenForm((p) => ({ ...p, hora: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <SelectorPersonalMedico
                    label="Médico que prescribe"
                    nombre={ordenForm.medico_nombre}
                    cedula={ordenForm.medico_cedula}
                    onChange={(nom, ced) => {
                      setOrdenForm((p) => ({
                        ...p,
                        medico_nombre: nom,
                        ...(ced !== undefined ? { medico_cedula: ced } : {}),
                      }));
                    }}
                    placeholder="-- Seleccione médico que prescribe --"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cédula profesional</label>
                  <input
                    type="text"
                    value={ordenForm.medico_cedula}
                    onChange={(e) => setOrdenForm((p) => ({ ...p, medico_cedula: e.target.value }))}
                    placeholder="Cédula profesional"
                    required
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Indicaciones médicas (dieta, soluciones, medicamentos, medidas generales)</label>
                <textarea
                  value={ordenForm.indicacion}
                  onChange={(e) => setOrdenForm((p) => ({ ...p, indicacion: e.target.value }))}
                  placeholder="Describa la prescripción: dieta, soluciones parenterales (volumen, goteo), medicamentos (nombre genérico, dosis, vía, intervalo), cuidados generales..."
                  style={{ minHeight: 90 }}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancelOrden}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-success" disabled={savingOrden}>
                {savingOrden ? 'Guardando...' : (editingOrdenId ? 'Actualizar indicación' : 'Guardar y anexar indicación')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Indicaciones médicas registradas ({ordenesList.length})</h3>
          <span style={{ fontSize: 12, color: '#64748b' }}>Formato oficial 208C0101100000L-047-19</span>
        </div>
        <div className="card-body">
          {ordenesList.length === 0 ? (
            <div className="empty-state">
              <p>Sin indicaciones médicas registradas para esta hoja</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Fecha</th>
                    <th style={{ width: 90 }}>Hora</th>
                    <th>Indicaciones médicas</th>
                    <th style={{ width: 220 }}>Nombre y firma del personal médico tratante</th>
                    <th style={{ width: 130 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesList.map((item: any, i: number) => {
                    const rowKey = item.id_orden || item.id_indicacion || i;
                    const fVal = item.fecha ? String(item.fecha).substring(0, 10) : (item.created_at ? new Date(item.created_at).toISOString().substring(0, 10) : '--');
                    const hVal = item.hora ? String(item.hora).substring(0, 5) : (item.created_at ? new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--');

                    return (
                      <tr key={rowKey}>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{fVal}</td>
                        <td style={{ fontSize: 12 }}>{hVal}</td>
                        <td style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {item.indicacion}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600 }}>{item.medico_nombre || 'Médico tratante'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Céd. {item.medico_cedula || '--'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStartEditOrden(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11 }}
                              title="Editar indicación"
                            >
                              <Edit3 size={11} /> Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteOrden(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11 }}
                              title="Eliminar indicación"
                            >
                              <Trash2 size={11} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 20, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#475569' }}>
            <span><strong>Nota:</strong> Todas las notas médicas deberán estar firmadas por el personal médico adscrito del servicio.</span>
            <span style={{ fontWeight: 600 }}>208C0101100000L-047-19</span>
          </div>
        </div>
      </div>
    </div>
  );
}

