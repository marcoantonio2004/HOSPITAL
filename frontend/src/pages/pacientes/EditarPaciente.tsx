import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pacientes } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Save, UserCheck, ArrowLeft, FileText, Phone, Droplet } from 'lucide-react';

const EMPTY = {
  id_paciente: 0,
  expediente_clinico: '',
  curp: '',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  sexo: 'F',
  domicilio: '',
  telefono: '',
  lugar_nacimiento: '',
  ocupacion: '',
  estado_civil: '',
  contacto_emergencia_nombre: '',
  contacto_emergencia_parentesco: '',
  contacto_emergencia_telefono: '',
  grupo_sanguineo: '',
  rh: '',
  alergias: '',
};

export default function EditarPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadPatient();
  }, [id]);

  function highlightAndFocusField(elementId: string, message: string): boolean {
    setError(message);
    showToast(message, 'warning');
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('field-validation-error');
        setTimeout(() => {
          el.classList.remove('field-validation-error');
        }, 4000);
      }
    }, 60);
    return false;
  }

  async function loadPatient() {
    try {
      const res = await pacientes.get(parseInt(id!));
      if (res.success && res.data) {
        const d = res.data;
        // Formatear fecha para el input HTML5 (YYYY-MM-DD)
        let fNac = '';
        if (d.fecha_nacimiento) {
          if (typeof d.fecha_nacimiento === 'string') {
            fNac = d.fecha_nacimiento.slice(0, 10);
          } else {
            fNac = new Date(d.fecha_nacimiento).toISOString().slice(0, 10);
          }
        }

        setForm({
          id_paciente: d.id_paciente || parseInt(id!),
          expediente_clinico: d.expediente_clinico || '',
          curp: d.curp || '',
          nombre: d.nombre || '',
          apellido_paterno: d.apellido_paterno || '',
          apellido_materno: d.apellido_materno || '',
          fecha_nacimiento: fNac,
          sexo: d.sexo || 'F',
          telefono: d.telefono || '',
          estado_civil: d.estado_civil || '',
          domicilio: d.domicilio || '',
          lugar_nacimiento: d.lugar_nacimiento || '',
          ocupacion: d.ocupacion || '',
          contacto_emergencia_nombre: d.contacto_emergencia_nombre || '',
          contacto_emergencia_parentesco: d.contacto_emergencia_parentesco || '',
          contacto_emergencia_telefono: d.contacto_emergencia_telefono || '',
          grupo_sanguineo: d.grupo_sanguineo || '',
          rh: d.rh || '',
          alergias: d.alergias || '',
        });
      } else {
        navigate('/pacientes');
      }
    } catch (err) {
      console.error('Error al cargar datos del paciente:', err);
      navigate('/pacientes');
    } finally {
      setLoading(false);
    }
  }

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Cálculo automático de edad según fecha de nacimiento
  const edadCalculada = useMemo(() => {
    if (!form.fecha_nacimiento) return null;
    const hoy = new Date();
    const nac = new Date(form.fecha_nacimiento);
    if (isNaN(nac.getTime())) return null;
    let anios = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) anios--;
    return anios >= 0 ? anios : null;
  }, [form.fecha_nacimiento]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.curp && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(form.curp)) {
      return highlightAndFocusField('paciente-curp', 'La CURP debe tener un formato oficial válido de 18 caracteres (ej: AAAA000000HDFRRR00).');
    }

    if (!form.nombre.trim()) {
      return highlightAndFocusField('paciente-nombre', 'El Nombre(s) del paciente es obligatorio.');
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.nombre.trim())) {
      return highlightAndFocusField('paciente-nombre', 'El Nombre(s) solo debe contener letras (no se permiten números ni caracteres especiales).');
    }

    if (!form.apellido_paterno.trim()) {
      return highlightAndFocusField('paciente-ap-paterno', 'El Apellido Paterno es obligatorio.');
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.apellido_paterno.trim())) {
      return highlightAndFocusField('paciente-ap-paterno', 'El Apellido Paterno solo debe contener letras (no se permiten números ni caracteres especiales).');
    }

    if (form.apellido_materno?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.apellido_materno.trim())) {
      return highlightAndFocusField('paciente-ap-materno', 'El Apellido Materno solo debe contener letras (no se permiten números ni caracteres especiales).');
    }

    if (!form.fecha_nacimiento) {
      return highlightAndFocusField('paciente-fecha-nac', 'La fecha de nacimiento es obligatoria.');
    }

    if (form.telefono?.trim()) {
      const cleanTel = form.telefono.trim().replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(cleanTel)) {
        return highlightAndFocusField('paciente-telefono', 'El teléfono de contacto debe contener exactamente 10 dígitos numéricos (sin letras).');
      }
    }

    if (form.lugar_nacimiento?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,.'-]+$/.test(form.lugar_nacimiento.trim())) {
      return highlightAndFocusField('paciente-lugar-nac', 'El lugar de nacimiento solo debe contener texto (no se permiten números).');
    }

    if (form.contacto_emergencia_nombre?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.contacto_emergencia_nombre.trim())) {
      return highlightAndFocusField('paciente-contacto-nombre', 'El nombre del contacto de emergencia solo debe contener letras (sin números).');
    }

    if (form.contacto_emergencia_parentesco?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.contacto_emergencia_parentesco.trim())) {
      return highlightAndFocusField('paciente-contacto-parentesco', 'El parentesco del contacto solo debe contener letras (sin números).');
    }

    if (form.contacto_emergencia_telefono?.trim()) {
      const cleanEmergTel = form.contacto_emergencia_telefono.trim().replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(cleanEmergTel)) {
        return highlightAndFocusField('paciente-contacto-telefono', 'El teléfono de emergencia debe contener exactamente 10 dígitos numéricos (sin letras).');
      }
    }

    setSaving(true);
    try {
      const payload: any = { ...form };
      // Limpiar campos vacíos a null
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });

      const res = await pacientes.update(parseInt(id!), payload);
      if (res.success) {
        showToast('Datos del paciente actualizados exitosamente.', 'success');
        navigate(`/pacientes/${id}`);
        return;
      } else {
        setError(res.error || 'Error al guardar los cambios');
        showToast(res.error || 'Error al guardar los cambios', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
      showToast(err.message || 'Error al guardar los cambios', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Cargando información del paciente...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <button
          type="button"
          onClick={() => navigate(`/pacientes/${id}`)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 6, padding: 0 }}
        >
          <ArrowLeft size={14} /> Volver al expediente clínico
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={26} color="#0f3f2f" /> Modificar datos del paciente
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-light)' }}>
              Actualización de datos demográficos y de contacto en el Registro Maestro de Pacientes
            </p>
          </div>
          <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-light)', display: 'block', fontWeight: 600 }}>Expediente clínico</span>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#0f3f2f' }}>{form.expediente_clinico}</span>
          </div>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {(!form.curp || form.nombre.toUpperCase().startsWith('RN ') || form.apellido_paterno === 'SIN REGISTRO CIVIL') && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderLeft: '4px solid #0284c7',
            color: '#0c4a6e',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: '#0369a1', display: 'block', marginBottom: 2 }}>
            Actualización de identidad civil (paciente registrado sin CURP / recién nacido)
          </strong>
          Capture aquí el <strong>Nombre(s)</strong> y <strong>Apellidos</strong> definitivos del paciente, así como su <strong>CURP</strong> cuando ya cuente con acta de nacimiento. El número de expediente (<strong>{form.expediente_clinico}</strong>) y todo su historial clínico se conservan intactos.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* BLOQUE 1: DATOS DE IDENTIDAD */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
            <FileText size={18} color="#0f3f2f" />
            <h3 style={{ margin: 0, fontSize: 14, color: '#0f3f2f' }}>1. Datos de identidad del paciente</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>CURP (Opcional si aún está en trámite)</label>
                <input
                  id="paciente-curp"
                  value={form.curp}
                  onChange={(e) => set('curp', e.target.value.toUpperCase())}
                  placeholder="18 caracteres"
                  maxLength={18}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="form-group">
                <label>Nombre(s) * (Solo texto)</label>
                <input
                  id="paciente-nombre"
                  value={form.nombre}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                    set('nombre', v);
                  }}
                  placeholder="Nombre de pila (solo letras)"
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido Paterno * (Solo texto)</label>
                <input
                  id="paciente-ap-paterno"
                  value={form.apellido_paterno}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                    set('apellido_paterno', v);
                  }}
                  placeholder="Primer apellido (solo letras)"
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido Materno (Solo texto)</label>
                <input
                  id="paciente-ap-materno"
                  value={form.apellido_materno}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                    set('apellido_materno', v);
                  }}
                  placeholder="Segundo apellido (solo letras)"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Fecha de Nacimiento *</span>
                  {edadCalculada !== null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: edadCalculada < 18 ? '#0284c7' : '#15803d' }}>
                      {edadCalculada} AÑOS ({edadCalculada < 18 ? 'PEDIÁTRICO' : 'ADULTO'})
                    </span>
                  )}
                </label>
                <input
                  id="paciente-fecha-nac"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => set('fecha_nacimiento', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sexo *</label>
                <select id="paciente-sexo" value={form.sexo} onChange={(e) => set('sexo', e.target.value)} required>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div className="form-group">
                <label>Teléfono de Contacto (Solo números)</label>
                <input
                  id="paciente-telefono"
                  value={form.telefono}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    set('telefono', v);
                  }}
                  placeholder="10 dígitos numéricos"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Estado Civil</label>
                <select id="paciente-estado-civil" value={form.estado_civil} onChange={(e) => set('estado_civil', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="soltera">Soltera(o)</option>
                  <option value="casada">Casada(o)</option>
                  <option value="concubinato">Unión Libre / Concubinato</option>
                  <option value="divorciada">Divorciada(o)</option>
                  <option value="viuda">Viuda(o)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Domicilio (Calle, Número, Colonia, Localidad / Municipio)</label>
                <input
                  id="paciente-domicilio"
                  value={form.domicilio}
                  onChange={(e) => set('domicilio', e.target.value)}
                  placeholder="Dirección completa del paciente..."
                />
              </div>
              <div className="form-group">
                <label>Lugar de Nacimiento (Solo texto)</label>
                <input
                  id="paciente-lugar-nac"
                  value={form.lugar_nacimiento}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,.'-]/g, '');
                    set('lugar_nacimiento', v);
                  }}
                  placeholder="Municipio o Estado (sin números)"
                />
              </div>
              <div className="form-group">
                <label>Ocupación</label>
                <input
                  id="paciente-ocupacion"
                  value={form.ocupacion}
                  onChange={(e) => set('ocupacion', e.target.value)}
                  placeholder="Empleo, actividad u oficio"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: CONTACTO DE EMERGENCIA */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
            <Phone size={18} color="#0f3f2f" />
            <h3 style={{ margin: 0, fontSize: 14, color: '#0f3f2f' }}>2. Contacto de emergencia / familiar responsable</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre Completo del Contacto (Solo texto)</label>
                <input
                  id="paciente-contacto-nombre"
                  value={form.contacto_emergencia_nombre}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                    set('contacto_emergencia_nombre', v);
                  }}
                  placeholder="Nombre de la persona responsable (solo letras)"
                />
              </div>
              <div className="form-group">
                <label>Parentesco (Solo texto)</label>
                <input
                  id="paciente-contacto-parentesco"
                  value={form.contacto_emergencia_parentesco}
                  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                    set('contacto_emergencia_parentesco', v);
                  }}
                  placeholder="Madre, padre, cónyuge, hermano(a)..."
                />
              </div>
              <div className="form-group">
                <label>Teléfono del Contacto (Solo números)</label>
                <input
                  id="paciente-contacto-telefono"
                  value={form.contacto_emergencia_telefono}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    set('contacto_emergencia_telefono', v);
                  }}
                  placeholder="10 dígitos numéricos"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 3: DATOS CLÍNICOS BÁSICOS */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
            <Droplet size={18} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: 14, color: '#0f3f2f' }}>3. Datos clínicos básicos (grupo sanguíneo y alergias)</h3>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Grupo Sanguíneo</label>
                <select value={form.grupo_sanguineo} onChange={(e) => set('grupo_sanguineo', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div className="form-group">
                <label>Factor Rh</label>
                <select value={form.rh} onChange={(e) => set('rh', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="+">Positivo (+)</option>
                  <option value="-">Negativo (-)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Alergias Conocidas</label>
                <textarea
                  value={form.alergias}
                  onChange={(e) => set('alergias', e.target.value)}
                  placeholder="Alergias a fármacos, alimentos u otros alérgenos (o escribir 'NEGADAS')..."
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-lg)',
          background: '#ffffff',
          padding: '14px 20px',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/pacientes/${id}`)}>
            ← Cancelar
          </button>
          <button type="submit" className="btn btn-success" disabled={saving} style={{ padding: '8px 24px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {saving ? 'Guardando...' : <><Save size={16} /> Guardar cambios</>}
          </button>
        </div>
      </form>
    </div>
  );
}
