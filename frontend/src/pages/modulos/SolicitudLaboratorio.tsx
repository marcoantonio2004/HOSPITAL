import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { laboratorioOficial, encuentro as encuentroApi, pacientes, getPdfUrl } from '../../services/api';
import AutoField from '../../components/AutoField';
import SelectorPersonalMedico from '../../components/SelectorPersonalMedico';
import { FlaskConical, Save, Printer, ArrowLeft, CheckSquare, Square, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';

const CATEGORIAS_LAB = [
  {
    categoria: 'Química Clínica',
    estudios: [
      'Glucosa', 'Urea/BUN', 'Creatina en Suero', 'Ácido Úrico en Suero', 'Colesterol Total', 'Triglicéridos',
      'Colesterol HDL', 'Colesterol LDL', 'Amilasa', 'Lipasa', 'CK', 'CK-MB', 'Microproteínas',
      'Bilirrubina Total', 'Bilirrubina Directa', 'Bilirrubina Indirecta', 'Fosfatasa Alcalina', 'Fosfatasa Ácida',
      'TGO/AST', 'TGP/ALT', 'GGT', 'LDH', 'Proteínas Totales en Suero', 'Albúmina en Suero', 'Globulina',
      'Depuración de Creatina en Orina', 'Glucosa Postprandial', 'Hemoglobina Glicosilada (HbA1c)'
    ]
  },
  {
    categoria: 'Electrolitos',
    estudios: ['Sodio', 'Potasio', 'Cloro', 'Calcio en Suero', 'Fósforo en Suero', 'Magnesio en Suero']
  },
  {
    categoria: 'Gases',
    estudios: ['Gasometría Arterial']
  },
  {
    categoria: 'Inmunología',
    estudios: [
      'Factor Reumatoide', 'Proteína C Reactiva', 'Antiestreptolisinas', 'VDRL', 'Tífico O', 'Tífico H',
      'Proteus OX-19', 'Paratífico A', 'Paratífico B', 'Rosa de Bengala', 'Células LE', 'HCG (P.I.E.) en Orina'
    ]
  },
  {
    categoria: 'Hematología',
    estudios: ['Biometría Hemática', 'Velocidad de Sedimentación Globular (VSG)', 'Grupo Sanguíneo y Rh', 'Coombs Directo', 'Coombs Indirecto']
  },
  {
    categoria: 'Coagulación',
    estudios: ['T.P. (Tiempo de Protrombina)', 'T.P.T. (Tromboplastina)', 'Fibrinógeno']
  },
  {
    categoria: 'Endocrinología',
    estudios: [
      'T3 Total', 'T4 Total', 'T3 Libre', 'T4 Libre', 'TSH', 'FSH', 'LH',
      'Prolactina', 'Estradiol', 'Testosterona', 'Progesterona', 'Cortisol en Suero', 'Cortisol en Orina'
    ]
  },
  {
    categoria: 'Insulina y afines',
    estudios: ['Insulina', 'BhCg Cuantitativa', 'Péptido C', 'Ácido Fólico', 'Vitamina B12', 'Ferritina']
  },
  {
    categoria: 'Marcadores Tumorales',
    estudios: ['CA 125', 'CA 15-3', 'CA 19-9', 'AFP (Alfafetoproteína)', 'PSA Libre', 'PSA Total', 'CEA']
  },
  {
    categoria: 'Drogas Terapéuticas',
    estudios: ['Benzodiacepinas', 'Ácido Valproico', 'Carbamazepina', 'Digoxina', 'Difenilhidantoína']
  },
  {
    categoria: 'Uroanálisis',
    estudios: ['Examen General de Orina (EGO)']
  },
  {
    categoria: 'Parasitología',
    estudios: ['CPS Simple', 'CPS Seriado', 'Coprológico', 'Prueba de Graham', 'Amiba en Fresco', 'Citología en Moco Fecal', 'Sangre Oculta en Heces']
  },
  {
    categoria: 'Bacteriología',
    estudios: [
      'Hemocultivo', 'Coprocultivo', 'Urocultivo', 'Exudado Naso-Faríngeo', 'Cultivo Ótico', 'Cultivo Ocular',
      'Exudado Uretral', 'Exudado Cérvico Vaginal', 'Cultivo Líquido Cefalorraquídeo', 'Cultivo Líquido Seminal',
      'Identificación de Levaduras', 'Antibiograma'
    ]
  },
  {
    categoria: 'Marcadores Especiales',
    estudios: ['Procalcitonina', 'PAPP-A', 'PLGF', 'SFH-1X']
  }
];

export default function SolicitudLaboratorioMod() {
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
    cama: 'N/A',
    tipo_servicio: 'Hospitalización',
    especialidad_medica: 'Medicina General',
    medico_solicitante: '',
    medico_cedula: '',
    diagnostico: '',
    medicamentos_observaciones: '',
    estudios_seleccionados: [] as string[],
    otros_estudios: '',
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

      const lRes = await laboratorioOficial.list(parseInt(id!));
      if (lRes.success && lRes.data && lRes.data.length > 0) {
        const item = lRes.data[0];
        setIsEdit(true);
        setForm({
          cama: item.cama || 'N/A',
          tipo_servicio: item.tipo_servicio || 'Hospitalización',
          especialidad_medica: item.especialidad_medica || 'Medicina General',
          medico_solicitante: item.medico_solicitante || '',
          medico_cedula: item.medico_cedula || '',
          diagnostico: item.diagnostico || '',
          medicamentos_observaciones: item.medicamentos_observaciones || '',
          estudios_seleccionados: Array.isArray(item.estudios_seleccionados) ? item.estudios_seleccionados : [],
          otros_estudios: item.otros_estudios || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleEstudio(nombre: string) {
    setForm(prev => {
      const exists = prev.estudios_seleccionados.includes(nombre);
      const nuevos = exists
        ? prev.estudios_seleccionados.filter(e => e !== nombre)
        : [...prev.estudios_seleccionados, nombre];
      return { ...prev, estudios_seleccionados: nuevos };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.estudios_seleccionados.length === 0 && !form.otros_estudios.trim()) {
      showToast('Debe seleccionar al menos un estudio o especificar uno en el campo Otros.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await laboratorioOficial.create(parseInt(id!), form);
      showToast(isEdit ? 'Solicitud de Laboratorio actualizada correctamente.' : 'Solicitud de Laboratorio generada correctamente.', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Error al generar solicitud de laboratorio.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar Solicitud de Laboratorio?',
      message: 'Esta acción borrará permanentemente la solicitud de laboratorio y volverá a estado Pendiente.',
      confirmText: 'Eliminar Registro',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await laboratorioOficial.remove(parseInt(id!));
      showToast('Solicitud de Laboratorio eliminada correctamente.', 'success');
      navigate(-1);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar solicitud de laboratorio.', 'error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><p>Cargando Solicitud de Laboratorio...</p></div>;

  return (
    <div>
      <div className="modulo-header-sticky">
        <div>
          <Link to={`/pacientes/${pacienteData?.id_paciente}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--primary)', textDecoration: 'none', marginBottom: 4 }}>
            <ArrowLeft size={14} /> Volver al Expediente
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 20 }}>
            <FlaskConical size={24} style={{ color: '#0f3f2f' }} />
            4.12 Solicitud de Laboratorio Clínico
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: 12, margin: '2px 0 0 0' }}>
            Bloque 3: Estudios y Solicitudes — Catálogo oficial exhaustivo de 16 categorías
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => window.open(getPdfUrl(parseInt(id!), 'laboratorio'), '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={14} /> Imprimir / PDF Oficial
          </button>
          <button 
            type="submit" 
            form="form-laboratorio"
            className="btn btn-success" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Solicitud' : 'Guardar y Solicitar')}
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
            <AutoField label="F. Nacimiento" value={pacienteData?.fecha_nacimiento ? String(pacienteData?.fecha_nacimiento).substring(0, 10) : '--'} />
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
            <strong>Modo Edición:</strong> Solicitud de Laboratorio previamente registrada. Puede modificar los reactivos, diagnósticos o indicaciones y actualizar los datos.
          </div>
        </div>
      )}

      <form id="form-laboratorio" onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Datos del Servicio y Prescripción</h3>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>Tipo de Servicio</label>
                <select value={form.tipo_servicio} onChange={(e) => setForm(p => ({ ...p, tipo_servicio: e.target.value }))}>
                  <option value="Hospitalización">Hospitalización</option>
                  <option value="Consulta Externa">Consulta Externa</option>
                  <option value="Urgencias">Urgencias</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Número de Cama</label>
                <input type="text" value={form.cama} onChange={(e) => setForm(p => ({ ...p, cama: e.target.value }))} placeholder="Cama o N/A" />
              </div>
              <div className="form-group">
                <label>Especialidad Médica</label>
                <input type="text" value={form.especialidad_medica} onChange={(e) => setForm(p => ({ ...p, especialidad_medica: e.target.value }))} placeholder="Especialidad" />
              </div>
              <div className="form-group">
                <SelectorPersonalMedico
                  label="Médico Solicitante"
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
                <label>Cédula Profesional</label>
                <input type="text" value={form.medico_cedula} onChange={(e) => setForm(p => ({ ...p, medico_cedula: e.target.value }))} placeholder="Cédula profesional" />
              </div>
              <div className="form-group full-width">
                <label>Diagnóstico Clínico *</label>
                <input type="text" value={form.diagnostico} onChange={(e) => setForm(p => ({ ...p, diagnostico: e.target.value }))} placeholder="Diagnóstico presuncional o motivo del estudio" required />
              </div>
              <div className="form-group full-width">
                <label>Medicamentos / Observaciones que pudieran influir en los resultados</label>
                <textarea value={form.medicamentos_observaciones} onChange={(e) => setForm(p => ({ ...p, medicamentos_observaciones: e.target.value }))} placeholder="Antibióticos, anticoagulantes, ayuno, etc." style={{ minHeight: 60 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Exhaustivo de 16 Categorías */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Checklist de Reactivos Clínicos ({form.estudios_seleccionados.length} seleccionados)</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {CATEGORIAS_LAB.map((cat) => (
                <div key={cat.categoria} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f3f2f', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                    {cat.categoria}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cat.estudios.map((est) => {
                      const sel = form.estudios_seleccionados.includes(est);
                      return (
                        <label
                          key={est}
                          onClick={() => toggleEstudio(est)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: 4,
                            background: sel ? '#dcfce7' : 'transparent',
                            color: sel ? '#166534' : '#334155',
                            fontWeight: sel ? 600 : 400
                          }}
                        >
                          {sel ? <CheckSquare size={14} color="#16a34a" /> : <Square size={14} color="#94a3b8" />}
                          <span>{est}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>Otros Estudios No Listados:</label>
              <textarea
                value={form.otros_estudios}
                onChange={(e) => setForm(p => ({ ...p, otros_estudios: e.target.value }))}
                placeholder="Especifique estudios especiales o no contemplados en el catálogo..."
                style={{ width: '100%', minHeight: 60, marginTop: 6 }}
              />
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
              <Save size={16} /> {saving ? 'Guardando...' : (isEdit ? 'Actualizar Solicitud de Laboratorio' : 'Generar Solicitud de Laboratorio')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
