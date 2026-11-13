import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { hojaFrontal, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { BookOpen, Save, Printer, ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

interface DiagnosticoFila {
  fecha_atencion: string;
  diagnostico: string;
  fecha_control: string;
}

export default function HojaFrontalMod() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [encuentroData, setEncuentroData] = useState<any>(null);
  const [pacienteData, setPacienteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [unidadMedica, setUnidadMedica] = useState('Hospital General San Felipe del Progreso');
  const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [medicoTratante, setMedicoTratante] = useState('');
  const [cedula, setCedula] = useState('');
  const [grupoSanguineo, setGrupoSanguineo] = useState('O');
  const [factorRh, setFactorRh] = useState('POSITIVO (+)');
  const [alergias, setAlergias] = useState('NEGADAS');
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoFila[]>([
    { fecha_atencion: new Date().toISOString().substring(0, 10), diagnostico: '', fecha_control: '' }
  ]);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      let pData = null;
      let eData = null;
      const eRes = await encuentroApi.get(parseInt(id!));
      if (eRes.success) {
        eData = eRes.data;
        setEncuentroData(eData);
        const pRes = await pacientes.get(eData.id_paciente);
        if (pRes.success) {
          pData = pRes.data;
          setPacienteData(pData);
        }
      }

      const normalizeRhDisplay = (val: any) => {
        if (!val) return 'POSITIVO (+)';
        const s = String(val).toUpperCase().trim();
        if (s === '+' || s.includes('POS')) return 'POSITIVO (+)';
        if (s === '-' || s.includes('NEG')) return 'NEGATIVO (-)';
        return 'POSITIVO (+)';
      };

      const hRes = await hojaFrontal.get(parseInt(id!));
      if (hRes.success && hRes.data) {
        setIsEditing(true);
        setUnidadMedica(hRes.data.unidad_medica || 'Hospital General San Felipe del Progreso');
        setFecha(hRes.data.fecha ? String(hRes.data.fecha).substring(0, 10) : new Date().toISOString().substring(0, 10));
        setMedicoTratante(hRes.data.personal_medico_tratante || eData?.medico_tratante || '');
        setCedula(hRes.data.cedula_profesional || '');
        setDireccion(hRes.data.direccion || pData?.domicilio || `${pData?.domicilio_municipio || ''}, ${pData?.domicilio_entidad || ''}`.trim() || '');
        setTelefono(hRes.data.telefono || pData?.telefono || '');
        setGrupoSanguineo(hRes.data.grupo_sanguineo || pData?.grupo_sanguineo || 'O');
        setFactorRh(normalizeRhDisplay(hRes.data.factor_rh || pData?.rh));
        setAlergias(hRes.data.alergias || pData?.alergias || 'NEGADAS');
        if (Array.isArray(hRes.data.diagnosticos_json) && hRes.data.diagnosticos_json.length > 0) {
          setDiagnosticos(hRes.data.diagnosticos_json);
        }
      } else {
        setUnidadMedica('Hospital General San Felipe del Progreso');
        setMedicoTratante(eData?.medico_tratante || '');
        setDireccion(pData?.domicilio || `${pData?.domicilio_municipio || ''}, ${pData?.domicilio_entidad || ''}`.trim() || '');
        setTelefono(pData?.telefono || '');
        setGrupoSanguineo(pData?.grupo_sanguineo || 'O');
        setFactorRh(normalizeRhDisplay(pData?.rh));
        setAlergias(pData?.alergias || 'NEGADAS');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function addRow() {
    if (diagnosticos.length >= 20) {
      showToast('Se ha alcanzado el límite oficial de 20 renglones.', 'warning');
      return;
    }
    setDiagnosticos(prev => [
      ...prev,
      { fecha_atencion: new Date().toISOString().substring(0, 10), diagnostico: '', fecha_control: '' }
    ]);
  }

  function removeRow(idx: number) {
    setDiagnosticos(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof DiagnosticoFila, val: string) {
    setDiagnosticos(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }

  function setAlergiaPreset(val: string) {
    if (alergias === 'NEGADAS' || !alergias) {
      setAlergias(val);
    } else if (!alergias.includes(val)) {
      setAlergias(`${alergias}, ${val}`);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await hojaFrontal.create(parseInt(id!), {
        unidad_medica: unidadMedica,
        fecha,
        personal_medico_tratante: medicoTratante,
        cedula_profesional: cedula,
        direccion,
        telefono,
        grupo_sanguineo: grupoSanguineo,
        factor_rh: factorRh,
        alergias,
        diagnosticos_json: diagnosticos.filter(d => d.diagnostico.trim() !== ''),
        firmado: true,
      });
      showToast('Hoja frontal guardada correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar hoja frontal.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Hoja Frontal?',
      message: 'Esta acción borrará permanentemente la hoja frontal y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await hojaFrontal.remove(parseInt(id!));
      showToast('Hoja frontal eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar hoja frontal.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Hoja Frontal...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <BookOpen size={24} style={{ color: '#0f3f2f' }} />
            4.3 Hoja Frontal (Portada del Expediente Clínico)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Formato oficial 208C0101100000L-028-24 — Portada oficial de segundo nivel de atención (NOM-004-SSA3-2012)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'hoja-frontal'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-hoja-frontal"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Hoja Frontal' : 'Guardar y Certificar')}
          </button>
        </div>
      </div>

      {isEditing && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)', color: '#065f46' }}>
          <CheckCircle2 size={20} />
          <div>
            <strong>Hoja Frontal Registrada</strong>
            <div style={{ fontSize: 12 }}>El documento se encuentra registrado. Cualquier cambio actualizado se reflejará de inmediato en el PDF oficial y en el expediente del paciente.</div>
          </div>
        </div>
      )}

      <form id="form-hoja-frontal" onSubmit={handleSubmit}>
        {/* SECCIÓN 1: IDENTIFICACIÓN DEL ESTABLECIMIENTO Y PACIENTE */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>
              Sección 1: Identificación de la Unidad y Paciente
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Unidad Médica *</label>
                <input
                  type="text"
                  value={unidadMedica}
                  onChange={(e) => setUnidadMedica(e.target.value)}
                  placeholder="Nombre oficial completo de la unidad médica"
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Requisición *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <AutoField label="Núm. de Expediente" value={pacienteData?.expediente_clinico} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
              <AutoField label="Nombre del Paciente" value={`${pacienteData?.nombre} ${pacienteData?.apellido_paterno} ${pacienteData?.apellido_materno || ''}`} />
              <AutoField label="Fecha de Nacimiento" value={pacienteData?.fecha_nacimiento ? String(pacienteData?.fecha_nacimiento).substring(0, 10) : '--'} />
              <AutoField label="Edad" value={`${pacienteData?.edad || '--'} años`} />
              <AutoField label="Sexo" value={pacienteData?.sexo} />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DOMICILIO Y CONTACTO */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>
              Sección 2: Domicilio y Localización del Paciente
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Dirección Completa (Calle, Número, Colonia, Municipio, Entidad) *</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, colonia, municipio, estado"
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono de Contacto (con lada)</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="(000) 000-0000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PERSONAL MÉDICO RESPONSABLE */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>
              Sección 3: Personal Médico Responsable
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Personal Médico Tratante"
                  nombre={medicoTratante}
                  cedula={cedula}
                  onChange={(nom, ced) => {
                    setMedicoTratante(nom);
                    if (ced !== undefined) setCedula(ced);
                  }}
                  placeholder="-- Seleccione personal médico tratante --"
                  required
                />
              </div>
              <div className="form-group">
                <label>Cédula del Personal Médico Tratante *</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Número de cédula profesional"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: TABLA DE DIAGNÓSTICOS CRONOLÓGICOS */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Sección 4: Diagnósticos por Fecha de Atención</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-light)' }}>
                Renglones oficiales (máximo 20 renglones para la portada oficial).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addRow}
              disabled={diagnosticos.length >= 20}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <Plus size={12} /> Agregar Renglón ({diagnosticos.length}/20)
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>Fecha de Atención</th>
                    <th>Diagnóstico(s) (CIE-10 / Descripción Clínica)</th>
                    <th style={{ width: 190 }}>Fecha de Control / Remisión</th>
                    <th style={{ width: 45 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticos.map((diag, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="date"
                          value={diag.fecha_atencion}
                          onChange={(e) => updateRow(idx, 'fecha_atencion', e.target.value)}
                          style={{ width: '100%', fontSize: 12 }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={diag.diagnostico}
                          onChange={(e) => updateRow(idx, 'diagnostico', e.target.value)}
                          placeholder="Signo, síntoma relevante o diagnóstico clínico..."
                          style={{ width: '100%', fontSize: 13 }}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={diag.fecha_control}
                          onChange={(e) => updateRow(idx, 'fecha_control', e.target.value)}
                          style={{ width: '100%', fontSize: 12 }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {diagnosticos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                            title="Eliminar renglón"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECCIÓN 5: DATOS CRÍTICOS Y ANTECEDENTES DE ALERTA */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 13, color: '#334155' }}>
              Sección 5: Datos Críticos y Alertas Médicas (Parte Inferior)
            </h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label>Grupo Sanguíneo *</label>
                <select
                  value={grupoSanguineo}
                  onChange={(e) => setGrupoSanguineo(e.target.value)}
                  required
                >
                  <option value="O">O</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                </select>
              </div>

              <div className="form-group">
                <label>Factor Rh *</label>
                <select
                  value={factorRh}
                  onChange={(e) => setFactorRh(e.target.value)}
                  required
                >
                  <option value="POSITIVO (+)">POSITIVO (+)</option>
                  <option value="NEGATIVO (-)">NEGATIVO (-)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Alérgico a (Medicamentos, alimentos o sustancias) *</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => setAlergias('NEGADAS')} className="badge" style={{ cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}>
                    Negadas
                  </button>
                  <button type="button" onClick={() => setAlergiaPreset('Penicilina')} className="badge" style={{ cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}>
                    + Penicilina
                  </button>
                  <button type="button" onClick={() => setAlergiaPreset('Sulfamidas')} className="badge" style={{ cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}>
                    + Sulfamidas
                  </button>
                  <button type="button" onClick={() => setAlergiaPreset('AINES')} className="badge" style={{ cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff' }}>
                    + AINES
                  </button>
                </div>
              </div>
              <textarea
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Anotar antecedentes de alergia alimentaria o medicamentos..."
                rows={2}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} className="btn btn-secondary">
            Volver al Expediente
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            {isEditing && (
              <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} /> Eliminar Registro
              </button>
            )}
            <button type="submit" className="btn btn-success" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Hoja Frontal' : 'Guardar Hoja Frontal')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
