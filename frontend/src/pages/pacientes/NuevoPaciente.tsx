import { useState, FormEvent, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pacientes } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Save, FileText, Phone, Stethoscope, ArrowLeft, UserPlus, Baby, Info } from 'lucide-react';

const EMPTY = {
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
};

const EMPTY_RN = {
  madre_nombre: '',
  madre_apellido_paterno: '',
  madre_apellido_materno: '',
  numero_producto: 'Hijo único',
  condicion_nacimiento: 'Nacido en esta unidad hospitalaria',
  hora_nacimiento: '',
};

function getTodayLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function NuevoPaciente() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [esRecienNacidoSinCurp, setEsRecienNacidoSinCurp] = useState(false);
  const [rnForm, setRnForm] = useState(EMPTY_RN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [areaIngreso, setAreaIngreso] = useState('urgencias');
  const [medicos, setMedicos] = useState<any[]>([]);
  const [idMedicoResponsable, setIdMedicoResponsable] = useState<string>('');
  const [cargandoMedicos, setCargandoMedicos] = useState(false);
  const [filtrarPorArea, setFiltrarPorArea] = useState(true);

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

  const medicosDisponibles = useMemo(() => {
    if (!filtrarPorArea) return medicos;
    const a = (areaIngreso || '').toLowerCase();
    const filtrados = medicos.filter((m) => {
      const areaHosp = (m.area_hospitalizacion || '').toLowerCase();
      const esp = (m.especialidad || '').toLowerCase();
      if (a.includes('urgenc')) return areaHosp.includes('urgenc') || esp.includes('urgenc');
      if (a.includes('hosp')) return areaHosp.includes('hosp') || esp.includes('interna') || esp.includes('cirug') || esp.includes('general');
      if (a.includes('obstet') || a.includes('toco')) return areaHosp.includes('toco') || areaHosp.includes('obstet') || esp.includes('ginec') || esp.includes('obstet');
      if (a.includes('pediat')) return areaHosp.includes('pediat') || esp.includes('pediat') || esp.includes('neonat');
      if (a.includes('admis')) return areaHosp.includes('admis') || esp.includes('social') || esp.includes('admis');
      return true;
    });
    return filtrados.length > 0 ? filtrados : medicos;
  }, [medicos, areaIngreso, filtrarPorArea]);

  useEffect(() => {
    async function cargarMedicos() {
      setCargandoMedicos(true);
      try {
        const res = await pacientes.getPersonalMedico();
        if (res.success && Array.isArray(res.data)) {
          setMedicos(res.data);
          // Si el usuario actual tiene id_medico vinculado, pre-seleccionarlo
          if (user?.id_medico) {
            setIdMedicoResponsable(String(user.id_medico));
          }
        }
      } catch (err) {
        console.error('Error al cargar catálogo de médicos:', err);
      } finally {
        setCargandoMedicos(false);
      }
    }
    cargarMedicos();
  }, [user]);

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setRn(field: string, value: any) {
    setRnForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Autocompletar el nombre de la madre en Contacto de Emergencia
      if (field === 'madre_nombre' || field === 'madre_apellido_paterno' || field === 'madre_apellido_materno') {
        const nombreCompletoMadre = [
          updated.madre_nombre,
          updated.madre_apellido_paterno,
          updated.madre_apellido_materno,
        ]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(' ');
        setForm((f) => ({
          ...f,
          contacto_emergencia_nombre: nombreCompletoMadre,
          contacto_emergencia_parentesco: nombreCompletoMadre ? (f.contacto_emergencia_parentesco || 'Madre') : f.contacto_emergencia_parentesco,
        }));
      }
      return updated;
    });
  }

  function handleToggleRecienNacido(checked: boolean) {
    setEsRecienNacidoSinCurp(checked);
    setError('');
    if (checked) {
      setForm((prev) => ({
        ...prev,
        curp: '',
        fecha_nacimiento: prev.fecha_nacimiento || getTodayLocal(),
        estado_civil: '',
        ocupacion: 'Recién Nacido (Sin CURP)',
      }));
      if (areaIngreso === 'urgencias') {
        setAreaIngreso('pediatria');
      }
    } else {
      setForm((prev) => ({
        ...prev,
        ocupacion: prev.ocupacion === 'Recién Nacido (Sin CURP)' ? '' : prev.ocupacion,
      }));
    }
  }

  // Vista previa del identificador provisional cuando es recién nacido sin registro
  const vistaPreviaIdentidadRN = useMemo(() => {
    const prefijoSexo = form.sexo === 'M' ? 'RN MASCULINO' : 'RN FEMENINO';
    const prod = rnForm.numero_producto && rnForm.numero_producto !== 'Hijo único' ? ` (${rnForm.numero_producto.toUpperCase()})` : '';
    const nomBeBe = form.nombre.trim()
      ? form.nombre.trim().toUpperCase()
      : rnForm.madre_nombre.trim()
        ? `RN HIJO(A) DE ${rnForm.madre_nombre.trim().toUpperCase()}${prod}`
        : `${prefijoSexo}${prod}`;
    const apPat = form.apellido_paterno.trim() || rnForm.madre_apellido_paterno.trim() || 'SIN REGISTRO CIVIL';
    const apMat = form.apellido_materno.trim() || rnForm.madre_apellido_materno.trim() || '';
    return `${apPat.toUpperCase()} ${apMat.toUpperCase()}, ${nomBeBe}`.replace(/\s+/g, ' ').trim();
  }, [form.nombre, form.apellido_paterno, form.apellido_materno, form.sexo, rnForm]);

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

    if (!form.fecha_nacimiento) {
      return highlightAndFocusField('nuevo-paciente-fecha-nac', 'La fecha de nacimiento es obligatoria.');
    }

    if (!esRecienNacidoSinCurp) {
      if (!form.curp.trim()) {
        return highlightAndFocusField('nuevo-paciente-curp', 'La CURP es obligatoria. Si es un recién nacido sin registro, marque la casilla superior.');
      }
      if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(form.curp.trim())) {
        return highlightAndFocusField('nuevo-paciente-curp', 'La CURP debe tener un formato oficial válido de 18 caracteres (ej: AAAA000000HDFRRR00).');
      }
      if (!form.nombre.trim()) {
        return highlightAndFocusField('nuevo-paciente-nombre', 'El Nombre(s) del paciente es obligatorio.');
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.nombre.trim())) {
        return highlightAndFocusField('nuevo-paciente-nombre', 'El Nombre(s) solo debe contener letras (no se permiten números ni caracteres especiales).');
      }
      if (!form.apellido_paterno.trim()) {
        return highlightAndFocusField('nuevo-paciente-ap-paterno', 'El Apellido Paterno es obligatorio.');
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.apellido_paterno.trim())) {
        return highlightAndFocusField('nuevo-paciente-ap-paterno', 'El Apellido Paterno solo debe contener letras (no se permiten números ni caracteres especiales).');
      }
      if (form.apellido_materno?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.apellido_materno.trim())) {
        return highlightAndFocusField('nuevo-paciente-ap-materno', 'El Apellido Materno solo debe contener letras (no se permiten números ni caracteres especiales).');
      }
    } else {
      if (form.nombre?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.nombre.trim())) {
        return highlightAndFocusField('nuevo-paciente-rn-nombre', 'El nombre del bebé solo debe contener letras (sin números).');
      }
      if (rnForm.madre_nombre?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(rnForm.madre_nombre.trim())) {
        return highlightAndFocusField('nuevo-paciente-rn-madre-nombre', 'El nombre de la madre solo debe contener letras (sin números).');
      }
      if (rnForm.madre_apellido_paterno?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(rnForm.madre_apellido_paterno.trim())) {
        return highlightAndFocusField('nuevo-paciente-rn-madre-ap-pat', 'El apellido de la madre solo debe contener letras (sin números).');
      }
      if (rnForm.madre_apellido_materno?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(rnForm.madre_apellido_materno.trim())) {
        return highlightAndFocusField('nuevo-paciente-rn-madre-ap-mat', 'El segundo apellido de la madre solo debe contener letras (sin números).');
      }
    }

    if (form.telefono?.trim()) {
      const cleanTel = form.telefono.trim().replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(cleanTel)) {
        return highlightAndFocusField('nuevo-paciente-telefono', 'El teléfono de contacto debe contener exactamente 10 dígitos numéricos (sin letras).');
      }
    }

    if (form.lugar_nacimiento?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,.'-]+$/.test(form.lugar_nacimiento.trim())) {
      return highlightAndFocusField('nuevo-paciente-lugar-nac', 'El lugar de nacimiento solo debe contener texto (no números).');
    }

    if (form.contacto_emergencia_nombre?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.contacto_emergencia_nombre.trim())) {
      return highlightAndFocusField('nuevo-paciente-contacto-nombre', 'El nombre del contacto solo debe contener letras (sin números).');
    }

    if (form.contacto_emergencia_parentesco?.trim() && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(form.contacto_emergencia_parentesco.trim())) {
      return highlightAndFocusField('nuevo-paciente-contacto-parentesco', 'El parentesco del contacto solo debe contener letras (sin números).');
    }

    if (form.contacto_emergencia_telefono?.trim()) {
      const cleanEmergTel = form.contacto_emergencia_telefono.trim().replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(cleanEmergTel)) {
        return highlightAndFocusField('nuevo-paciente-contacto-telefono', 'El teléfono de emergencia debe contener exactamente 10 dígitos numéricos (sin letras).');
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        ...form,
        es_recien_nacido_sin_curp: esRecienNacidoSinCurp,
        ...(esRecienNacidoSinCurp ? rnForm : {}),
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });

      const res = await pacientes.create(payload);

      if (res.success) {
        // Crear automáticamente el episodio inicial de atención médica con el médico responsable asignado
        await pacientes.crearEncuentro(res.data.id_paciente, {
          area_ingreso: areaIngreso,
          id_medico_responsable: idMedicoResponsable ? parseInt(idMedicoResponsable, 10) : null,
        });
        showToast('Paciente registrado exitosamente.', 'success');
        navigate(`/pacientes/${res.data.id_paciente}`);
        return;
      } else {
        setError(res.error || 'Error al registrar al paciente');
        showToast(res.error || 'Error al registrar al paciente', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrar al paciente');
      showToast(err.message || 'Error al registrar al paciente', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      {/* Encabezado */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 6, padding: 0 }}
        >
          <ArrowLeft size={14} /> Volver a la lista de pacientes
        </button>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={26} color="#0f3f2f" /> Ficha de admisión y registro de paciente
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-light)' }}>
          Captura ágil en ventanilla para apertura del expediente clínico oficial (NOM-004-SSA3-2012)
        </p>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* CASILLA DE CASO ESPECIAL: RECIÉN NACIDO / BEBÉ SIN CURP */}
        <div
          style={{
            marginBottom: 'var(--space-md)',
            padding: '14px 18px',
            borderRadius: 10,
            border: esRecienNacidoSinCurp ? '2px solid #0284c7' : '1px solid #cbd5e1',
            background: esRecienNacidoSinCurp ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            boxShadow: esRecienNacidoSinCurp ? '0 2px 8px rgba(2, 132, 199, 0.12)' : '0 1px 2px rgba(15, 23, 42, 0.03)',
            transition: 'all 0.15s ease',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
              margin: 0,
              flex: 1,
            }}
          >
            <input
              type="checkbox"
              checked={esRecienNacidoSinCurp}
              onChange={(e) => handleToggleRecienNacido(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: '#0284c7', cursor: 'pointer' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: esRecienNacidoSinCurp ? '#0369a1' : '#1e293b' }}>
                <Baby size={18} color={esRecienNacidoSinCurp ? '#0284c7' : '#64748b'} />
                Caso especial: Ingreso de recién nacido / bebé sin CURP ni registro civil
              </div>
              <div style={{ fontSize: 12, color: esRecienNacidoSinCurp ? '#0c4a6e' : '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                Marque esta casilla únicamente cuando ingrese un bebé que aún no cuenta con CURP o nombre registrado. Los campos de CURP, nombre y apellidos dejarán de ser obligatorios y podrá actualizarlos más adelante con el formulario habitual.
              </div>
            </div>
          </label>

          {esRecienNacidoSinCurp && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#0284c7',
                color: '#ffffff',
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              Modo neonatal sin CURP activo
            </span>
          )}
        </div>

        {/* BLOQUE 1: IDENTIDAD DEL PACIENTE (DINÁMICO SEGÚN CASILLA) */}
        {!esRecienNacidoSinCurp ? (
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc' }}>
              <FileText size={18} color="#0f3f2f" />
              <h3 style={{ margin: 0, fontSize: 14, color: '#0f3f2f' }}>1. Datos de identidad del paciente</h3>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>CURP *</label>
                  <input
                    id="nuevo-paciente-curp"
                    value={form.curp}
                    onChange={(e) => set('curp', e.target.value.toUpperCase())}
                    placeholder="18 caracteres oficiales"
                    maxLength={18}
                    style={{ fontFamily: 'monospace' }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nombre(s) * (Solo texto)</label>
                  <input
                    id="nuevo-paciente-nombre"
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
                    id="nuevo-paciente-ap-paterno"
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
                    id="nuevo-paciente-ap-materno"
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
                    id="nuevo-paciente-fecha-nac"
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) => set('fecha_nacimiento', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Sexo *</label>
                  <select id="nuevo-paciente-sexo" value={form.sexo} onChange={(e) => set('sexo', e.target.value)} required>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono de Contacto (Solo números)</label>
                  <input
                    id="nuevo-paciente-telefono"
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
                  <select id="nuevo-paciente-estado-civil" value={form.estado_civil} onChange={(e) => set('estado_civil', e.target.value)}>
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
                    id="nuevo-paciente-domicilio"
                    value={form.domicilio}
                    onChange={(e) => set('domicilio', e.target.value)}
                    placeholder="Dirección completa del paciente..."
                  />
                </div>
                <div className="form-group">
                  <label>Lugar de Nacimiento (Solo texto)</label>
                  <input
                    id="nuevo-paciente-lugar-nac"
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
                    id="nuevo-paciente-ocupacion"
                    value={form.ocupacion}
                    onChange={(e) => set('ocupacion', e.target.value)}
                    placeholder="Empleo, actividad u oficio"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 'var(--space-md)', border: '1px solid #bae6fd', borderLeft: '4px solid #0284c7' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Baby size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: 14, color: '#0369a1' }}>
                  1. Registro provisional de recién nacido / bebé sin CURP
                </h3>
              </div>
              <span style={{ fontSize: 11.5, color: '#0369a1', fontWeight: 600 }}>
                CURP, Nombre y Apellidos del bebé son opcionales
              </span>
            </div>
            <div className="card-body">
              {/* Vista previa del identificador hospitalario que se asignará */}
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #94a3b8',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155' }}>
                  <Info size={15} color="#0284c7" />
                  <span>Identificación provisional en el expediente:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: 13 }}>{vistaPreviaIdentidadRN}</strong>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  CURP: <strong>SIN CURP (PENDIENTE REGISTRO CIVIL)</strong>
                </span>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha de Nacimiento del Bebé *</label>
                  <input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) => set('fecha_nacimiento', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora de Nacimiento (Opcional)</label>
                  <input
                    type="time"
                    value={rnForm.hora_nacimiento}
                    onChange={(e) => setRn('hora_nacimiento', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Sexo del Bebé *</label>
                  <select value={form.sexo} onChange={(e) => set('sexo', e.target.value)} required>
                    <option value="F">Femenino (Niña)</option>
                    <option value="M">Masculino (Niño)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Hijo único / Gemelar</label>
                  <select value={rnForm.numero_producto} onChange={(e) => setRn('numero_producto', e.target.value)}>
                    <option value="Hijo único">Hijo único</option>
                    <option value="Gemelo I">Gemelo I</option>
                    <option value="Gemelo II">Gemelo II</option>
                    <option value="Trillizo I">Trillizo I</option>
                    <option value="Trillizo II">Trillizo II</option>
                    <option value="Trillizo III">Trillizo III</option>
                  </select>
                </div>

                {/* Datos de filiación materna/responsable para identificar al RN */}
                <div className="form-group">
                  <label>Nombre(s) de la Madre (Opcional - Solo texto)</label>
                  <input
                    id="nuevo-paciente-rn-madre-nombre"
                    value={rnForm.madre_nombre}
                    onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                      setRn('madre_nombre', v);
                    }}
                    placeholder="Ej. María Guadalupe"
                  />
                </div>
                <div className="form-group">
                  <label>Primer Apellido de la Madre / Familia (Opcional - Solo texto)</label>
                  <input
                    id="nuevo-paciente-rn-madre-ap-pat"
                    value={rnForm.madre_apellido_paterno}
                    onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                      setRn('madre_apellido_paterno', v);
                    }}
                    placeholder="Se usará como apellido provisional"
                  />
                </div>
                <div className="form-group">
                  <label>Segundo Apellido de la Madre (Opcional - Solo texto)</label>
                  <input
                    id="nuevo-paciente-rn-madre-ap-mat"
                    value={rnForm.madre_apellido_materno}
                    onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                      setRn('madre_apellido_materno', v);
                    }}
                    placeholder="Opcional"
                  />
                </div>
                <div className="form-group">
                  <label>Condición de Ingreso Neonatal</label>
                  <select id="nuevo-paciente-rn-condicion" value={rnForm.condicion_nacimiento} onChange={(e) => setRn('condicion_nacimiento', e.target.value)}>
                    <option value="Nacido en esta unidad hospitalaria">Nacido en esta unidad hospitalaria</option>
                    <option value="Parto fortuito / en traslado">Parto fortuito / en traslado</option>
                    <option value="Referido de otra unidad médica">Referido de otra unidad médica</option>
                    <option value="Ingreso directo por Urgencias">Ingreso directo por Urgencias</option>
                  </select>
                </div>

                {/* Nombre opcional del bebé si ya cuenta con uno aunque no tenga CURP */}
                <div className="form-group">
                  <label>Nombre provisional del Bebé (Opcional - Solo texto)</label>
                  <input
                    id="nuevo-paciente-rn-nombre"
                    value={form.nombre}
                    onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]/g, '');
                      set('nombre', v);
                    }}
                    placeholder="Dejar vacío para usar 'RN HIJO(A) DE...'"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono Familiar de Contacto (Opcional - Solo números)</label>
                  <input
                    id="nuevo-paciente-rn-telefono"
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
                <div className="form-group full-width">
                  <label>Domicilio Familiar (Opcional)</label>
                  <input
                    id="nuevo-paciente-rn-domicilio"
                    value={form.domicilio}
                    onChange={(e) => set('domicilio', e.target.value)}
                    placeholder="Calle, número, colonia, localidad o municipio..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
                  id="nuevo-paciente-contacto-nombre"
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
                  id="nuevo-paciente-contacto-parentesco"
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
                  id="nuevo-paciente-contacto-telefono"
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

        {/* BLOQUE 3: ÁREA DE ADSCRIPCIÓN HOSPITALARIA Y SERVICIO CLÍNICO */}
        <div className="card" style={{ marginBottom: 'var(--space-md)', borderLeft: '4px solid #0f3f2f', background: '#f0fdf4' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#dcfce7' }}>
            <Stethoscope size={18} color="#166534" />
            <h3 style={{ margin: 0, fontSize: 14, color: '#166534', fontWeight: 700 }}>
              3. Área de atención y servicio clínico al que pertenece
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'block', marginBottom: 6 }}>
                  Área hospitalaria de ingreso / destino *
                </label>
                <select
                  value={areaIngreso}
                  onChange={(e) => setAreaIngreso(e.target.value)}
                  style={{ width: '100%', borderColor: '#86efac', fontWeight: 700, background: '#fff', fontSize: 14, padding: '8px 12px', borderRadius: 6 }}
                  required
                >
                  <option value="urgencias">Urgencias médicas</option>
                  <option value="hospitalizacion">Hospitalización general</option>
                  <option value="obstetricia">Tococirugía / obstetricia</option>
                  <option value="pediatria">Pediatría</option>
                  <option value="consulta_externa">Consulta externa</option>
                  <option value="admision">Admisión continua</option>
                </select>
                <span style={{ display: 'block', fontSize: 11.5, color: '#15803d', marginTop: 4 }}>
                  Servicio clínico donde se canalizará, censará y atenderá al paciente.
                  {edadCalculada !== null && edadCalculada < 18 && (
                    <strong style={{ display: 'block', marginTop: 2, color: '#0369a1' }}>
                      ℹ️ Paciente pediátrico ({edadCalculada} {edadCalculada === 1 ? 'año' : 'años'}).
                    </strong>
                  )}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>
                    Médico responsable asignado
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#15803d', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={filtrarPorArea}
                        onChange={(e) => setFiltrarPorArea(e.target.checked)}
                        style={{ accentColor: '#166534' }}
                      />
                      <span>Filtrar por área de hospitalización</span>
                    </label>
                    {user?.rol === 'admin' && (
                      <Link
                        to="/personal-medico"
                        target="_blank"
                        style={{ fontSize: 11.5, color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        title="Solo el Administrador tiene permisos para dar de alta personal y usuarios"
                      >
                        <UserPlus size={12} /> Gestionar plantilla
                      </Link>
                    )}
                  </div>
                </div>
                <select
                  value={idMedicoResponsable}
                  onChange={(e) => setIdMedicoResponsable(e.target.value)}
                  disabled={cargandoMedicos}
                  style={{ width: '100%', borderColor: '#86efac', fontWeight: 600, background: '#fff', fontSize: 14, padding: '8px 12px', borderRadius: 6 }}
                >
                  <option value="">-- Sin asignar (Médico de guardia) --</option>
                  {medicosDisponibles.map((m) => (
                    <option key={m.id_medico} value={m.id_medico}>
                      Dr(a). {m.nombre} {m.apellido_paterno} {m.apellido_materno || ''} — {m.especialidad || 'Medicina'} | Área: {m.area_hospitalizacion || 'Hospitalización General'} (Céd. {m.cedula_profesional || 'S/C'})
                    </option>
                  ))}
                </select>
                <span style={{ display: 'block', fontSize: 11.5, color: '#15803d', marginTop: 4 }}>
                  {idMedicoResponsable
                    ? 'El médico quedará asignado en el expediente y visible en las áreas clínicas.'
                    : `Mostrando ${medicosDisponibles.length} ${medicosDisponibles.length === 1 ? 'médico disponible' : 'médicos disponibles'}. Si no se selecciona, aparecerá como "Med. de Guardia".`}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #bbf7d0', fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
              Al registrar al paciente se abrirá de inmediato su primer <strong>Episodio de Atención</strong> vinculado al área de adscripción y al médico seleccionado. Los antecedentes clínicos y exploración se capturan por el médico dentro de la <strong>Historia Clínica</strong>.
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            ← Cancelar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
              Ingreso: <strong style={{ color: '#0f3f2f', textTransform: 'uppercase' }}>{areaIngreso}</strong>
              {idMedicoResponsable && medicos.find((m) => String(m.id_medico) === String(idMedicoResponsable)) && (
                <> • Médico: <strong style={{ color: '#0f3f2f' }}>Dr(a). {medicos.find((m) => String(m.id_medico) === String(idMedicoResponsable))?.nombre} {medicos.find((m) => String(m.id_medico) === String(idMedicoResponsable))?.apellido_paterno}</strong></>
              )}
            </span>
            <button type="submit" className="btn btn-success" disabled={saving} style={{ padding: '8px 24px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {saving ? 'Guardando...' : <><Save size={16} /> Registrar y abrir expediente</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
