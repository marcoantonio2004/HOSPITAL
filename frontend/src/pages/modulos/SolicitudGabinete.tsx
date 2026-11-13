import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gabineteOficial, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { Scan, Save, Printer, ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

export default function SolicitudGabineteMod() {
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
    procedencia: 'Hospitalización',
    servicio: 'Medicina Interna',
    cama: 'N/A',
    tipo_paciente: '1ª vez',
    datos_clinicos: '',
    diagnostico: '',
    estudios_solicitados: '',
    fecha_proxima_consulta: '',
    medico_solicitante: '',
    medico_cedula: '',
    vobo_gestor: '',
    observaciones: '',

    // Interpretación Imagenología
    placa_utilizada: 'Digital',
    clave_estudio: '',
    interpretacion: '',
    medico_interpreta: '',
    medico_interpreta_cedula: '',
    observaciones_interpretacion: '',
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
        if (pRes.success) setPacienteData(pRes.data);
      }

      const gRes = await gabineteOficial.list(parseInt(id!));
      if (gRes.success && gRes.data && gRes.data.length > 0) {
        const item = gRes.data[0];
        setIsEdit(true);
        setForm({
          procedencia: item.procedencia || 'Hospitalización',
          servicio: item.servicio || 'General',
          cama: item.cama || 'N/A',
          tipo_paciente: item.tipo_paciente || '1ª vez',
          datos_clinicos: item.datos_clinicos || '',
          diagnostico: item.diagnostico || '',
          estudios_solicitados: item.estudios_solicitados || '',
          fecha_proxima_consulta: item.fecha_proxima_consulta ? String(item.fecha_proxima_consulta).substring(0, 10) : '',
          medico_solicitante: item.medico_solicitante || '',
          medico_cedula: item.medico_cedula || '',
          vobo_gestor: item.vobo_gestor || '',
          observaciones: item.observaciones || '',
          placa_utilizada: item.placa_utilizada || 'Digital',
          clave_estudio: item.clave_estudio || '',
          interpretacion: item.interpretacion || '',
          medico_interpreta: item.medico_interpreta || '',
          medico_interpreta_cedula: item.medico_interpreta_cedula || '',
          observaciones_interpretacion: item.observaciones_interpretacion || '',
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
      await gabineteOficial.create(parseInt(id!), form);
      showToast(isEdit ? 'Estudio de Gabinete actualizado correctamente.' : 'Solicitud y/o interpretación de gabinete guardada correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar estudio de gabinete.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Estudio de Gabinete?',
      message: 'Esta acción borrará permanentemente la solicitud e interpretación de gabinete y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await gabineteOficial.remove(parseInt(id!));
      showToast('Estudio de Gabinete eliminado correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar estudio de gabinete.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Estudio de Gabinete...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <Scan size={24} style={{ color: '#0f3f2f' }} />
            4.11 Solicitud e Interpretación de Gabinete
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Bloque 3: Estudios y Solicitudes — Radiología, Ultrasonido, Mastografía y Tomografía
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'gabinete'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-gabinete"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Gabinete' : 'Guardar y Certificar')}
          </button>
        </div>
      </div>

      {/* Datos Autocompletados */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-header" style={{ background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>Campos Autocompletados del Maestro de Pacientes (Solo Lectura)</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <AutoField label="Unidad Médica" value="Hospital General San Felipe del Progreso" />
            <AutoField label="Paciente" value={`${pacienteData?.nombre} ${pacienteData?.apellido_paterno} ${pacienteData?.apellido_materno || ''}`} />
            <AutoField label="CURP" value={pacienteData?.curp} />
            <AutoField label="Expediente" value={pacienteData?.expediente_clinico} />
            <AutoField label="Edad" value={`${pacienteData?.edad || '--'} años`} />
            <AutoField label="Sexo" value={pacienteData?.sexo} />
          </div>
        </div>
      </div>

      {/* Banner Modo Edición */}
      {isEdit && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#1e40af',
          fontSize: 13
        }}>
          <CheckCircle2 size={18} color="#2563eb" />
          <div>
            <strong>Modo Edición:</strong> Estudio de Gabinete previamente registrado. Puede modificar la solicitud o la interpretación radiológica y actualizar los datos.
          </div>
        </div>
      )}

      <form id="form-gabinete" onSubmit={handleSubmit}>
        {/* SECCIÓN I: SOLICITUD */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>I. Solicitud Clínica (Personal Médico Solicitante)</h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>De (Procedencia)</label>
                <select value={form.procedencia} onChange={(e) => setForm(p => ({ ...p, procedencia: e.target.value }))}>
                  <option value="Consulta Externa">Consulta Externa</option>
                  <option value="Urgencias">Urgencias</option>
                  <option value="Hospitalización">Hospitalización</option>
                </select>
              </div>
              <div className="form-group">
                <label>Servicio</label>
                <input type="text" value={form.servicio} onChange={(e) => setForm(p => ({ ...p, servicio: e.target.value }))} placeholder="Servicio médico" />
              </div>
              <div className="form-group">
                <label>Cama</label>
                <input type="text" value={form.cama} onChange={(e) => setForm(p => ({ ...p, cama: e.target.value }))} placeholder="Cama o N/A" />
              </div>
              <div className="form-group">
                <label>Tipo de Paciente</label>
                <select value={form.tipo_paciente} onChange={(e) => setForm(p => ({ ...p, tipo_paciente: e.target.value }))}>
                  <option value="1ª vez">1ª vez</option>
                  <option value="Subsecuente">Subsecuente</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Datos clínicos *</label>
                <textarea value={form.datos_clinicos} onChange={(e) => setForm(p => ({ ...p, datos_clinicos: e.target.value }))} placeholder="Motivo de solicitud y sintomatología..." style={{ minHeight: 60 }} required />
              </div>
              <div className="form-group full-width">
                <label>Diagnóstico *</label>
                <input type="text" value={form.diagnostico} onChange={(e) => setForm(p => ({ ...p, diagnostico: e.target.value }))} placeholder="Diagnóstico presuntivo o nosológico..." required />
              </div>
              <div className="form-group full-width">
                <label>Estudio(s) solicitado(s) *</label>
                <input type="text" value={form.estudios_solicitados} onChange={(e) => setForm(p => ({ ...p, estudios_solicitados: e.target.value }))} placeholder="Ej. Telerradiografía de Tórax PA, Ultrasonido Abdominal, TAC Cráneo Simple..." required />
              </div>
              <div className="form-group">
                <label>Fecha de próxima consulta</label>
                <input type="date" value={form.fecha_proxima_consulta} onChange={(e) => setForm(p => ({ ...p, fecha_proxima_consulta: e.target.value }))} />
              </div>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Personal médico solicitante"
                  nombre={form.medico_solicitante}
                  cedula={form.medico_cedula}
                  onChange={(nom, ced) => {
                    setForm(p => ({
                      ...p,
                      medico_solicitante: nom,
                      ...(ced !== undefined ? { medico_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico solicitante --"
                  required
                />
              </div>
              <div className="form-group">
                <label>Cédula profesional</label>
                <input type="text" value={form.medico_cedula} onChange={(e) => setForm(p => ({ ...p, medico_cedula: e.target.value }))} placeholder="Cédula" />
              </div>
              <div className="form-group">
                <label>Vo. Bo. gestor o responsable de la tutela de derechos</label>
                <input type="text" value={form.vobo_gestor} onChange={(e) => setForm(p => ({ ...p, vobo_gestor: e.target.value }))} placeholder="Nombre de gestor o responsable" />
              </div>
              <div className="form-group full-width">
                <label>Observaciones</label>
                <input type="text" value={form.observaciones} onChange={(e) => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Observaciones de la solicitud..." />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN II: INTERPRETACIÓN RADIOLÓGICA */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ background: '#f8fafc' }}>
            <h3 style={{ margin: 0, color: '#0f3f2f' }}>II. Interpretación Radiológica (Personal de Imagenología)</h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>Placa o Modalidad Utilizada</label>
                <select value={form.placa_utilizada} onChange={(e) => setForm(p => ({ ...p, placa_utilizada: e.target.value }))}>
                  <option value="14x17">14x17</option>
                  <option value="14x14">14x14</option>
                  <option value="11x14">11x14</option>
                  <option value="10x12">10x12</option>
                  <option value="8x10">8x10</option>
                  <option value="Mastografía">Mastografía</option>
                  <option value="Ultrasonido">Ultrasonido</option>
                  <option value="Tomografía">Tomografía</option>
                  <option value="Digital / PACS">Digital / PACS</option>
                </select>
              </div>
              <div className="form-group">
                <label>Clave del Estudio</label>
                <input type="text" value={form.clave_estudio} onChange={(e) => setForm(p => ({ ...p, clave_estudio: e.target.value }))} placeholder="Clave interna" />
              </div>
              <div className="form-group full-width">
                <label>Informe de Interpretación (Texto Extenso)</label>
                <textarea
                  value={form.interpretacion}
                  onChange={(e) => setForm(p => ({ ...p, interpretacion: e.target.value }))}
                  placeholder="Descripción detallada de hallazgos radiológicos, medidas y patrones..."
                  style={{ minHeight: 120 }}
                />
              </div>
              <div className="form-group full-width">
                <label>Conclusiones y Observaciones</label>
                <input type="text" value={form.observaciones_interpretacion} onChange={(e) => setForm(p => ({ ...p, observaciones_interpretacion: e.target.value }))} placeholder="Conclusiones diagnósticas del estudio" />
              </div>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Médico imagenólogo / radiólogo"
                  nombre={form.medico_interpreta}
                  cedula={form.medico_interpreta_cedula}
                  onChange={(nom, ced) => {
                    setForm(p => ({
                      ...p,
                      medico_interpreta: nom,
                      ...(ced !== undefined ? { medico_interpreta_cedula: ced } : {}),
                    }));
                  }}
                  placeholder="-- Seleccione médico especialista --"
                />
              </div>
              <div className="form-group">
                <label>Cédula Profesional Especialista</label>
                <input type="text" value={form.medico_interpreta_cedula} onChange={(e) => setForm(p => ({ ...p, medico_interpreta_cedula: e.target.value }))} placeholder="Cédula especialista" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            Volver al Expediente
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            {isEdit && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="btn btn-danger" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={16} /> Eliminar Registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Solicitud / Interpretación' : 'Guardar Solicitud / Interpretación')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
