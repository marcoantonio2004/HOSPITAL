import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { avisoPrivacidad, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import { ShieldCheck, Save, Printer, ArrowLeft, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function AvisoPrivacidadMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    autoriza_transferencia: true,
    unidad_medica: 'Hospital General San Felipe del Progreso',
    municipio: 'San Felipe del Progreso',
    fecha: new Date().toISOString().substring(0, 10),
    firma_nombre: '',
    firma_parentesco: 'Titular',
    urgencia_vital_pendiente: false,
    firmado: false,
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
        if (pRes.success) {
          setPacienteData(pRes.data);
          setForm(prev => ({
            ...prev,
            firma_nombre: `${pRes.data.nombre} ${pRes.data.apellido_paterno} ${pRes.data.apellido_materno || ''}`.trim()
          }));
        }
      }

      const aRes = await avisoPrivacidad.get(parseInt(id!));
      if (aRes.success && aRes.data) {
        setForm({
          autoriza_transferencia: aRes.data.autoriza_transferencia,
          unidad_medica: aRes.data.unidad_medica,
          municipio: aRes.data.municipio,
          fecha: aRes.data.fecha ? String(aRes.data.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10),
          firma_nombre: aRes.data.firma_nombre || '',
          firma_parentesco: aRes.data.firma_parentesco || 'Titular',
          urgencia_vital_pendiente: aRes.data.urgencia_vital_pendiente || false,
          firmado: aRes.data.firmado,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await avisoPrivacidad.create(parseInt(id!), {
        ...form,
        firmado: true,
      });
      showToast('Aviso de Privacidad guardado y firmado correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar aviso de privacidad.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Aviso de Privacidad?',
      message: 'Esta acción borrará permanentemente el aviso de privacidad y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await avisoPrivacidad.remove(parseInt(id!));
      showToast('Aviso de Privacidad eliminado correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar aviso de privacidad.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Aviso de Privacidad...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <ShieldCheck size={24} style={{ color: '#0f3f2f' }} />
            4.1 Aviso de Privacidad y Autorización (LGPDPPSO)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Bloque 0: Ingreso — Requisito legal obligatorio previo a captura clínica (NOM-004-SSA3 / Ley General de Protección de Datos)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'aviso-privacidad'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-aviso-privacidad"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (form.firmado ? 'Actualizar Aviso' : 'Guardar y Autorizar')}
          </button>
        </div>
      </div>

      {form.firmado ? (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#065f46' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Modo edición: documento registrado y vigente</strong>
            <div style={{ fontSize: 12 }}>Puede corregir o actualizar los datos capturados previamente. Al guardar se actualizarán las modificaciones en el expediente.</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde047', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#854d0e' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Pendiente de registro y firma física</strong>
            <div style={{ fontSize: 12 }}>Este formato requiere la firma física autógrafa del titular o tutor en el formato oficial impreso.</div>
          </div>
        </div>
      )}

      {/* Banner de Datos Maestros Autocompletados */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Campos Autocompletados del Maestro de Pacientes (Solo Lectura)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <AutoField label="Paciente Titular" value={`${pacienteData?.nombre} ${pacienteData?.apellido_paterno} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="CURP" value={pacienteData?.curp} />
            <AutoField label="Número de Expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Edad Calculada" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo} />
            <AutoField label="Municipio de Residencia" value={pacienteData?.domicilio_municipio || 'San Felipe del Progreso'} />
          </div>
        </div>
      </div>

      <form id="form-aviso-privacidad" onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Términos de consentimiento y transferencia de datos</h3>
          </div>
          <div className="card-body">
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
              En cumplimiento a la <strong>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO)</strong>, 
              los datos personales y de salud recabados serán tratados con estricta confidencialidad por el personal médico del hospital 
              para fines exclusivos de atención diagnóstica, terapéutica, cuidados intrahospitalarios e integración del Expediente Clínico Digital.
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Si ha leído y comprendido los términos anteriores, seleccione la casilla correspondiente:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: 10, background: form.autoriza_transferencia ? '#f0fdf4' : '#fff', border: form.autoriza_transferencia ? '1px solid #86efac' : '1px solid #e2e8f0', borderRadius: 6 }}>
                  <input
                    type="radio"
                    name="autoriza_transferencia"
                    checked={form.autoriza_transferencia === true}
                    onChange={() => setForm(p => ({ ...p, autoriza_transferencia: true }))}
                    style={{ marginTop: 3 }}
                  />
                  <span><strong>Autorizo y consiento</strong> que mis datos personales sean transferidos en los términos que señala el presente aviso de privacidad.</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: 10, background: !form.autoriza_transferencia ? '#fef2f2' : '#fff', border: !form.autoriza_transferencia ? '1px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: 6 }}>
                  <input
                    type="radio"
                    name="autoriza_transferencia"
                    checked={form.autoriza_transferencia === false}
                    onChange={() => setForm(p => ({ ...p, autoriza_transferencia: false }))}
                    style={{ marginTop: 3 }}
                  />
                  <span><strong>No autorizo ni consiento</strong> que mis datos personales sean transferidos en los Términos que señala el presente aviso de privacidad.</span>
                </label>
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
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
                <label>Municipio</label>
                <input
                  type="text"
                  value={form.municipio}
                  onChange={(e) => setForm(p => ({ ...p, municipio: e.target.value }))}
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
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Firma del paciente, padre, madre o tutor en caso de menores de edad</h4>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label>Nombre de quien firma</label>
                  <input
                    type="text"
                    value={form.firma_nombre}
                    onChange={(e) => setForm(p => ({ ...p, firma_nombre: e.target.value }))}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Parentesco o calidad jurídica</label>
                  <select
                    value={form.firma_parentesco}
                    onChange={(e) => setForm(p => ({ ...p, firma_parentesco: e.target.value }))}
                  >
                    <option value="Titular">Titular (Paciente)</option>
                    <option value="Padre/Madre">Padre / Madre (Menor de edad)</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Cónyuge">Cónyuge / Pareja</option>
                    <option value="Familiar Responsable">Familiar Responsable</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                <strong>Firma autógrafa obligatoria:</strong> Conforme a la normativa NOM-004-SSA3-2012, la firma física de puño y letra es obligatoria al imprimir el formato oficial. No está permitido firmar digitalmente ni mediante huella electrónica.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            Volver al Expediente
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            {form.firmado && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} /> Eliminar Registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Guardando...' : (form.firmado ? 'Actualizar y guardar cambios' : 'Guardar y registrar aviso')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
