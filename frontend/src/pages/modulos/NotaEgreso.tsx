import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { notaEgreso, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { LogOut, Save, Printer, ArrowLeft, Lock, CheckCircle2, Trash2, FileText, UserCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function NotaEgresoMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
    unidad_medica: 'Hospital General San Felipe del Progreso',
    fecha_ingreso: '',
    diagnostico_ingreso: '',
    tipo_ingreso: 'Urgencias directo',
    fecha_hora_egreso: '',
    motivo_egreso: 'Mejoría',
    servicio_egreso: 'Hospitalización General',
    diagnosticos_finales: '',
    resumen_evaluacion: '',
    tratamiento_intrahospitalario: '',
    problemas_pendientes: '',
    plan_manejo_egreso: '',
    recomendaciones_ambulatorias: '',
    factores_riesgo: '',
    pronostico: 'Favorable para la vida y la función',
    medico_responsable: '',
    medico_cedula: '',
  });

  useEffect(() => {
    load();
  }, [id]);

  function toLocalDatetimeInput(val?: string | Date | null): string {
    const d = val ? new Date(val) : new Date();
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
  }

  function toLocalDateInput(val?: string | Date | null): string {
    const d = val ? new Date(val) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  async function load() {
    try {
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        setEncuentroData(eRes.data);
        const pRes = await pacientes.get(eRes.data.id_paciente);
        if (pRes.success) setPacienteData(pRes.data);

        setForm((prev) => ({
          ...prev,
          fecha_ingreso: eRes.data.fecha_hora_ingreso ? toLocalDateInput(eRes.data.fecha_hora_ingreso) : prev.fecha_ingreso,
          diagnostico_ingreso: eRes.data.motivo_consulta || prev.diagnostico_ingreso,
          fecha_hora_egreso: eRes.data.fecha_hora_alta ? toLocalDatetimeInput(eRes.data.fecha_hora_alta) : prev.fecha_hora_egreso,
          servicio_egreso: eRes.data.servicio_actual || eRes.data.area_ingreso || prev.servicio_egreso,
          diagnosticos_finales: eRes.data.diagnostico_egreso || prev.diagnosticos_finales,
          medico_responsable: eRes.data.medico_responsable || prev.medico_responsable,
          medico_cedula: eRes.data.medico_cedula || prev.medico_cedula,
        }));
      }

      const nRes = await notaEgreso.get(parseInt(id!));
      if (nRes.success && nRes.data) {
        setIsEdit(Boolean(nRes.data.id_nota_egreso));
        const item = nRes.data;
        setForm({
          unidad_medica: item.unidad_medica || 'Hospital General San Felipe del Progreso',
          fecha_ingreso: item.fecha_ingreso ? toLocalDateInput(item.fecha_ingreso) : (item.fecha_ingreso_val ? toLocalDateInput(item.fecha_ingreso_val) : ''),
          diagnostico_ingreso: item.diagnostico_ingreso || item.diagnostico_ingreso_val || '',
          tipo_ingreso: item.tipo_ingreso || 'Urgencias directo',
          fecha_hora_egreso: item.fecha_hora_egreso ? toLocalDatetimeInput(item.fecha_hora_egreso) : '',
          motivo_egreso: item.motivo_egreso || 'Mejoría',
          servicio_egreso: item.servicio_egreso || 'Hospitalización General',
          diagnosticos_finales: item.diagnosticos_finales || '',
          resumen_evaluacion: item.resumen_evaluacion || '',
          tratamiento_intrahospitalario: item.tratamiento_intrahospitalario || '',
          problemas_pendientes: item.problemas_pendientes || '',
          plan_manejo_egreso: item.plan_manejo_egreso || '',
          recomendaciones_ambulatorias: item.recomendaciones_ambulatorias || '',
          factores_riesgo: item.factores_riesgo || '',
          pronostico: item.pronostico || 'Favorable para la vida y la función',
          medico_responsable: item.medico_responsable || '',
          medico_cedula: item.medico_cedula || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const estaBloqueado = !form.fecha_hora_egreso && !encuentroData?.fecha_hora_alta && encuentroData?.estatus === 'activo';

  async function handleRegistrarEgreso() {
    const ok = await confirm({
      title: '¿Registrar egreso hospitalario?',
      message: 'Se registrará el egreso y alta de la o el paciente para este encuentro, habilitando el formulario de Nota de Egreso.',
      confirmText: 'Confirmar egreso',
      variant: 'warning',
    });
    if (!ok) return;

    const ahora = toLocalDatetimeInput();
    try {
      await encuentroApi.update(parseInt(id!), {
        estatus: 'alta',
        fecha_hora_alta: ahora,
      });
      setForm((prev) => ({ ...prev, fecha_hora_egreso: ahora }));
      await load();
      showToast('Fecha de egreso registrada. El formulario de Nota de Egreso ha sido habilitado.', 'success');
    } catch (err: any) {
      showToast('Error al registrar egreso: ' + (err.message || ''), 'error');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fecha_hora_egreso) {
      showToast('Debe indicar la fecha y hora de egreso.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await notaEgreso.create(parseInt(id!), {
        ...form,
        firmado: true,
      });
      showToast('Nota de Egreso / Contrarreferencia guardada y firmada exitosamente.', 'success');
      await load();
    } catch (err: any) {
      showToast('Error: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar nota de egreso?',
      message: 'Esta acción borrará permanentemente la nota de egreso y devolverá el encuentro a estado activo.',
      confirmText: 'Eliminar registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await notaEgreso.remove(parseInt(id!));
      showToast('Nota de egreso eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast('Error: ' + (err.message || ''), 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Nota de Egreso...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <LogOut size={24} style={{ color: '#0f3f2f' }} />
            Nota de Egreso / Contrarreferencia (Formato 208C0101100000L-361-19)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Documento médico legal oficial de alta hospitalaria y resumen clínico contrarreferencial (NOM-004-SSA3)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'nota-egreso'), '_blank')}
            disabled={estaBloqueado}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-nota-egreso"
            className="btn btn-success" 
            disabled={saving || estaBloqueado}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Nota' : 'Guardar y Firmar')}
          </button>
        </div>
      </div>

      {estaBloqueado && (
        <div style={{ padding: 16, background: '#fee2e2', border: '1px solid #f87171', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lock size={24} color="#b91c1c" />
            <div>
              <strong style={{ color: '#991b1b' }}>Formato bloqueado por regla institucional NOM-004-SSA3</strong>
              <div style={{ fontSize: 13, color: '#7f1d1d' }}>
                La Nota de Egreso solo puede redactarse cuando se ha determinado y registrado el alta o egreso formal del paciente.
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-danger" onClick={handleRegistrarEgreso}>
            Registrar egreso del paciente ahora
          </button>
        </div>
      )}

      {isEdit && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="#059669" />
          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>
            ✏️ <strong>Modo edición:</strong> Nota de Egreso previamente registrada. Puede modificar cualquier campo clínico y actualizar el formato oficial.
          </span>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Identificación de la o el paciente (autocompletado del expediente)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Nombre completo" value={`${pacienteData?.nombre || ''} ${pacienteData?.apellido_paterno || ''} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="Núm. expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Género" value={pacienteData?.sexo || '--'} />
            <AutoField label="Edad" value={pacienteData?.edad ? `${pacienteData.edad} años` : '--'} />
            <AutoField label="Domicilio" value={pacienteData?.domicilio || '--'} />
            <AutoField label="Municipio" value={pacienteData?.domicilio_municipio || 'San Felipe del Progreso'} />
            <AutoField label="Teléfono" value={pacienteData?.telefono || '--'} />
          </div>
        </div>
      </div>

      <form id="form-nota-egreso" onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} />
              Datos del ingreso y del egreso
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>Unidad médica</label>
                <input
                  type="text"
                  value={form.unidad_medica}
                  onChange={(e) => setForm((p) => ({ ...p, unidad_medica: e.target.value }))}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha de ingreso</label>
                <input
                  type="date"
                  value={form.fecha_ingreso}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_ingreso: e.target.value }))}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de ingreso</label>
                <select
                  value={form.tipo_ingreso}
                  onChange={(e) => setForm((p) => ({ ...p, tipo_ingreso: e.target.value }))}
                  disabled={estaBloqueado}
                  required
                >
                  <option value="Enviado programado">1.- Enviado programado</option>
                  <option value="Enviado urgencias">2.- Enviado urgencias</option>
                  <option value="Urgencias directo">3.- Urgencias directo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fecha y hora de egreso</label>
                <input
                  type="datetime-local"
                  value={form.fecha_hora_egreso}
                  onChange={(e) => setForm((p) => ({ ...p, fecha_hora_egreso: e.target.value }))}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group">
                <label>Motivo del egreso</label>
                <select
                  value={form.motivo_egreso}
                  onChange={(e) => setForm((p) => ({ ...p, motivo_egreso: e.target.value }))}
                  disabled={estaBloqueado}
                  required
                >
                  <option value="Mejoría">Mejoría</option>
                  <option value="Máximo beneficio">Máximo beneficio</option>
                  <option value="Alta voluntaria">Alta voluntaria</option>
                  <option value="Traslado a otra unidad">Traslado a otra unidad</option>
                  <option value="Defunción">Defunción</option>
                  <option value="Fuga">Fuga</option>
                </select>
              </div>

              <div className="form-group">
                <label>Servicio del que egresa</label>
                <input
                  type="text"
                  value={form.servicio_egreso}
                  onChange={(e) => setForm((p) => ({ ...p, servicio_egreso: e.target.value }))}
                  placeholder="Hospitalización General"
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Diagnóstico de ingreso</label>
                <input
                  type="text"
                  value={form.diagnostico_ingreso}
                  onChange={(e) => setForm((p) => ({ ...p, diagnostico_ingreso: e.target.value }))}
                  placeholder="Diagnóstico presuntivo o motivo de internamiento"
                  disabled={estaBloqueado}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Secciones clínicas oficiales de la nota de egreso</h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 14 }}>
              <div className="form-group full-width">
                <label>Diagnósticos finales</label>
                <textarea
                  value={form.diagnosticos_finales}
                  onChange={(e) => setForm((p) => ({ ...p, diagnosticos_finales: e.target.value }))}
                  placeholder="Diagnósticos de egreso concluyentes con codificación clínica..."
                  style={{ minHeight: 60 }}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Resumen (evaluación y estado actual)</label>
                <textarea
                  value={form.resumen_evaluacion}
                  onChange={(e) => setForm((p) => ({ ...p, resumen_evaluacion: e.target.value }))}
                  placeholder="Evolución clínica durante la estancia, respuesta terapéutica y estado clínico al momento del alta..."
                  style={{ minHeight: 65 }}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Tratamiento intrahospitalario (medicamentos, dosis, vía, tiempo)</label>
                <textarea
                  value={form.tratamiento_intrahospitalario}
                  onChange={(e) => setForm((p) => ({ ...p, tratamiento_intrahospitalario: e.target.value }))}
                  placeholder="Fármacos principales, dosis, vías de administración, días de tratamiento y procedimientos realizados..."
                  style={{ minHeight: 60 }}
                  disabled={estaBloqueado}
                />
              </div>

              <div className="form-group full-width">
                <label>Problemas clínicos pendientes</label>
                <textarea
                  value={form.problemas_pendientes}
                  onChange={(e) => setForm((p) => ({ ...p, problemas_pendientes: e.target.value }))}
                  placeholder="Condiciones que requieren seguimiento médico ambulatorio o estudios pendientes..."
                  style={{ minHeight: 55 }}
                  disabled={estaBloqueado}
                />
              </div>

              <div className="form-group full-width">
                <label>Plan de manejo y tratamiento al egreso</label>
                <textarea
                  value={form.plan_manejo_egreso}
                  onChange={(e) => setForm((p) => ({ ...p, plan_manejo_egreso: e.target.value }))}
                  placeholder="Prescripción médica ambulatoria completa (fármacos, dosis, horarios, duración, dieta y cuidados generales)..."
                  style={{ minHeight: 65 }}
                  disabled={estaBloqueado}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Recomendaciones ambulatorias</label>
                <textarea
                  value={form.recomendaciones_ambulatorias}
                  onChange={(e) => setForm((p) => ({ ...p, recomendaciones_ambulatorias: e.target.value }))}
                  placeholder="Signos de alarma por los que debe acudir a urgencias, cita a consulta externa, cuidados higiénico dietéticos..."
                  style={{ minHeight: 55 }}
                  disabled={estaBloqueado}
                />
              </div>

              <div className="form-group full-width">
                <label>Atención de factores de riesgo</label>
                <textarea
                  value={form.factores_riesgo}
                  onChange={(e) => setForm((p) => ({ ...p, factores_riesgo: e.target.value }))}
                  placeholder="Prevención de caídas, comorbilidades crónicas, factores ambientales, nutricionales o sociales a vigilar..."
                  style={{ minHeight: 55 }}
                  disabled={estaBloqueado}
                />
              </div>

              <div className="form-group full-width">
                <label>Pronóstico</label>
                <input
                  type="text"
                  value={form.pronostico}
                  onChange={(e) => setForm((p) => ({ ...p, pronostico: e.target.value }))}
                  placeholder="Pronóstico para la vida y para la función"
                  disabled={estaBloqueado}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={18} />
              Médico responsable del egreso
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Nombre del médico responsable"
                  nombre={form.medico_responsable}
                  cedula={form.medico_cedula}
                  onChange={(nom, ced) => {
                    setForm((p) => ({
                      ...p,
                      medico_responsable: nom,
                      ...(ced !== undefined ? { medico_cedula: ced } : {}),
                    }));
                  }}
                  disabled={estaBloqueado}
                  required
                  placeholder="-- Seleccione médico responsable --"
                />
              </div>
              <div className="form-group">
                <label>Cédula profesional</label>
                <input
                  type="text"
                  value={form.medico_cedula}
                  onChange={(e) => setForm((p) => ({ ...p, medico_cedula: e.target.value }))}
                  placeholder="Cédula profesional"
                  disabled={estaBloqueado}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
              <strong>Firma autógrafa obligatoria:</strong> Conforme a la NOM-004-SSA3-2012, la firma física y sello del médico responsable son obligatorios al imprimir la nota de egreso. No está permitido firmar digitalmente ni mediante huella electrónica.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            Volver al expediente
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} /> Eliminar registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving || estaBloqueado} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar nota de egreso' : 'Guardar y registrar nota de egreso')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

