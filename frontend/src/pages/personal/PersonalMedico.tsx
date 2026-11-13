import React, { useState, useEffect, useMemo } from 'react';
import { pacientes, notificacionesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, UserPlus, Search, Stethoscope,
  Award, CheckCircle2, XCircle, RefreshCw, Key, AlertCircle, Edit2,
  Trash2, AlertTriangle, ShieldCheck, RotateCcw, KeyRound, X
} from 'lucide-react';

interface Medico {
  id_medico: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  cedula_profesional: string;
  especialidad: string;
  area_hospitalizacion?: string;
  id_rol_sistema?: number;
  id_rol?: number;
  rol_nombre?: string;
  activo: boolean;
  id_usuario?: number;
  username?: string;
  ultimo_acceso?: string;
  created_at?: string;
}

const AREAS_HOSPITALIZACION = [
  'Hospitalización General',
  'Urgencias Médicas',
  'Tococirugía y Obstetricia',
  'Pediatría',
  'Consulta Externa',
  'Admisión Continua',
  'Cirugía General',
  'Medicina Interna',
  'Cuidados Intensivos',
];

const ROLES_CATALOGO = [
  { id: 3, rol: 'medico', label: 'Médico / Especialista', badgeBg: '#e0f2fe', badgeColor: '#0369a1', badgeBorder: '#bae6fd' },
  { id: 4, rol: 'enfermeria', label: 'Enfermería', badgeBg: '#ccfbf1', badgeColor: '#0f766e', badgeBorder: '#99f6e4' },
  { id: 2, rol: 'admision', label: 'Admisión / Trabajo Social', badgeBg: '#fef3c7', badgeColor: '#92400e', badgeBorder: '#fde68a' },
  { id: 1, rol: 'admin', label: 'Administrador / Dirección', badgeBg: '#ede9fe', badgeColor: '#6d28d9', badgeBorder: '#ddd6fe' },
  { id: 5, rol: 'laboratorio', label: 'Laboratorio y Gabinete', badgeBg: '#fce7f3', badgeColor: '#9d174d', badgeBorder: '#fbcfe8' },
];

const SUGERENCIAS_ESPECIALIDAD = [
  'Medicina General',
  'Urgenciología',
  'Pediatría y Neonatología',
  'Ginecología y Obstetricia',
  'Cirugía General',
  'Medicina Interna',
  'Anestesiología',
  'Traumatología y Ortopedia',
  'Cardiología',
  'Enfermería General y Hospitalización',
  'Enfermería Quirúrgica',
  'Enfermería Pediátrica',
  'Trabajo Social y Admisión',
  'Dirección y Administración Hospitalaria',
  'Radiología e Imagen',
  'Laboratorio Clínico',
];

export default function PersonalMedico() {
  const { user } = useAuth();
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditar, setModalEditar] = useState<Medico | null>(null);
  const [modalEliminar, setModalEliminar] = useState<Medico | null>(null);
  const [modalRestablecer, setModalRestablecer] = useState<Medico | null>(null);
  const [modalToggleActivo, setModalToggleActivo] = useState<Medico | null>(null);
  const [togglingActivo, setTogglingActivo] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<any[]>([]);

  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    cedula_profesional: '',
    especialidad: '',
    area_hospitalizacion: 'Hospitalización General',
    id_rol: 3,
    crearUsuario: false,
    username: '',
    password: '',
  });

  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    cargarPlantilla();
  }, []);

  async function handleConfirmarRestablecer() {
    if (!modalRestablecer) return;
    setRestableciendo(true);
    setErrorMsg('');
    try {
      const res = await pacientes.restablecerPasswordPersonal(modalRestablecer.id_medico);
      if (res.success) {
        setSuccessMsg(`Contraseña de @${modalRestablecer.username} restablecida con éxito a "${modalRestablecer.username}".`);
        setModalRestablecer(null);
        await cargarPlantilla();
      } else {
        setErrorMsg(res.error || 'Error al restablecer la contraseña');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña');
    } finally {
      setRestableciendo(false);
    }
  }

  async function cargarPlantilla() {
    setLoading(true);
    try {
      const [resMedicos, resSol] = await Promise.all([
        pacientes.getPersonalMedico(),
        notificacionesApi.getSolicitudesPendientes().catch(() => ({ success: false, data: [] })),
      ]);
      if (resMedicos.success && Array.isArray(resMedicos.data)) {
        setMedicos(resMedicos.data);
      }
      if (resSol.success && Array.isArray(resSol.data)) {
        setSolicitudesPendientes(resSol.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const medicosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return medicos.filter((m) => {
      const matchRol = filtroRol === 'todos' || String(m.id_rol) === filtroRol || m.rol_nombre === filtroRol;
      if (!matchRol) return false;

      const matchArea = filtroArea === 'todas' || (m.area_hospitalizacion && m.area_hospitalizacion.toLowerCase() === filtroArea.toLowerCase());
      if (!matchArea) return false;

      if (!q) return true;
      const nom = `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno || ''}`.toLowerCase();
      return (
        nom.includes(q) ||
        m.cedula_profesional?.toLowerCase().includes(q) ||
        m.especialidad?.toLowerCase().includes(q) ||
        m.area_hospitalizacion?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q)
      );
    });
  }, [medicos, busqueda, filtroRol, filtroArea]);

  function abrirModalNuevo() {
    setForm({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      cedula_profesional: '',
      especialidad: '',
      area_hospitalizacion: 'Hospitalización General',
      id_rol: 3,
      crearUsuario: false,
      username: '',
      password: '',
    });
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  }

  function abrirModalEditar(m: Medico) {
    setModalEditar(m);
    setForm({
      nombre: m.nombre,
      apellido_paterno: m.apellido_paterno,
      apellido_materno: m.apellido_materno || '',
      cedula_profesional: m.cedula_profesional,
      especialidad: m.especialidad || '',
      area_hospitalizacion: m.area_hospitalizacion || 'Hospitalización General',
      id_rol: m.id_rol || m.id_rol_sistema || 3,
      crearUsuario: !m.username,
      username: m.username || '',
      password: '',
    });
    setErrorMsg('');
    setSuccessMsg('');
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.nombre.trim() || !form.apellido_paterno.trim() || !form.cedula_profesional.trim()) {
      setErrorMsg('Nombre, apellido paterno y cédula profesional son obligatorios.');
      return;
    }

    if (!form.especialidad.trim()) {
      setErrorMsg('Debe escribir la especialidad o área de adscripción.');
      return;
    }

    if (!modalEditar && form.crearUsuario && (!form.username.trim() || !form.password)) {
      setErrorMsg('Si activa cuenta de inicio de sesión, debe ingresar usuario y contraseña.');
      return;
    }

    if (form.password?.trim()) {
      const cleanPass = form.password.trim();
      if (cleanPass.length < 8) {
        setErrorMsg('La contraseña debe tener un mínimo de 8 caracteres.');
        return;
      }
      if (!/[A-Z0-9]/.test(cleanPass)) {
        setErrorMsg('La contraseña debe incluir al menos un número o una letra mayúscula.');
        return;
      }
    }

    setSaving(true);
    try {
      if (modalEditar) {
        const payload: any = {
          nombre: form.nombre.trim(),
          apellido_paterno: form.apellido_paterno.trim(),
          apellido_materno: form.apellido_materno?.trim() || null,
          cedula_profesional: form.cedula_profesional.trim(),
          especialidad: form.especialidad.trim(),
          area_hospitalizacion: form.area_hospitalizacion || 'Hospitalización General',
          id_rol: form.id_rol,
        };

        if (form.password?.trim()) {
          payload.password = form.password.trim();
        }
        if (!modalEditar.username && form.username?.trim()) {
          payload.username = form.username.trim().toLowerCase();
        }

        const res = await pacientes.actualizarPersonalMedico(modalEditar.id_medico, payload);
        if (res.success) {
          setSuccessMsg('Datos del personal actualizados correctamente.');
          setModalEditar(null);
          cargarPlantilla();
        } else {
          setErrorMsg(res.error || 'Error al actualizar personal');
        }
      } else {
        const payload: any = {
          nombre: form.nombre.trim(),
          apellido_paterno: form.apellido_paterno.trim(),
          apellido_materno: form.apellido_materno?.trim() || null,
          cedula_profesional: form.cedula_profesional.trim(),
          especialidad: form.especialidad.trim(),
          area_hospitalizacion: form.area_hospitalizacion || 'Hospitalización General',
          id_rol: form.id_rol,
        };
        if (form.crearUsuario) {
          payload.username = form.username.trim().toLowerCase();
          payload.password = form.password;
        }

        const res = await pacientes.crearPersonalMedico(payload);
        if (res.success) {
          setSuccessMsg('Personal registrado exitosamente en la plantilla.');
          setModalOpen(false);
          cargarPlantilla();
        } else {
          setErrorMsg(res.error || 'Error al registrar personal');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de comunicación con el servidor');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmarToggleActivo() {
    if (!modalToggleActivo) return;
    const nuevoEstado = !modalToggleActivo.activo;
    setTogglingActivo(true);
    setErrorMsg('');
    try {
      await pacientes.actualizarPersonalMedico(modalToggleActivo.id_medico, { activo: nuevoEstado });
      setSuccessMsg(
        nuevoEstado
          ? `Personal ${modalToggleActivo.nombre} ${modalToggleActivo.apellido_paterno} reactivado con éxito.`
          : `Personal ${modalToggleActivo.nombre} ${modalToggleActivo.apellido_paterno} desactivado con éxito.`
      );
      setModalToggleActivo(null);
      await cargarPlantilla();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado del personal');
    } finally {
      setTogglingActivo(false);
    }
  }

  async function handleConfirmarEliminar() {
    if (!modalEliminar) return;
    setEliminando(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await pacientes.eliminarPersonalMedico(modalEliminar.id_medico);
      if (res.success) {
        setSuccessMsg(res.message || 'Personal procesado exitosamente.');
        setModalEliminar(null);
        cargarPlantilla();
      } else {
        setErrorMsg(res.error || 'Error al eliminar personal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor');
    } finally {
      setEliminando(false);
    }
  }

  function getRolInfo(idRol?: number, rolNombre?: string) {
    const found = ROLES_CATALOGO.find(r => r.id === idRol || r.rol === rolNombre);
    return found || ROLES_CATALOGO[0];
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 50 }}>
      <datalist id="sugerencias-especialidades">
        {SUGERENCIAS_ESPECIALIDAD.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Mensajes Globales de Notificación */}
      {successMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #86efac',
          fontSize: 13.5,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#166534" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#166534' }}
          >
            ×
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fca5a5',
          fontSize: 13.5,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} color="#991b1b" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#991b1b' }}
          >
            ×
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 24 }}>
            <ShieldCheck size={26} color="#0f3f2f" />
            Directorio de personal y control de usuarios
          </h1>
          <p style={{ color: 'var(--text-light)', margin: '4px 0 0', fontSize: 13 }}>
            Administración centralizada de médicos, enfermería, admisión y directivos (NOM-004-SSA3-2012 / NOM-024-SSA3-2012)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={cargarPlantilla}
            className="btn btn-secondary"
            title="Refrescar lista"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={abrirModalNuevo}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: '#0f3f2f', borderColor: '#0f3f2f' }}
          >
            <UserPlus size={16} />
            Registrar personal / usuario
          </button>
        </div>
      </div>

      {solicitudesPendientes.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 18,
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 13.5, color: '#92400e' }}>
                  Solicitudes de restablecimiento pendientes ({solicitudesPendientes.length})
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>
                  Conforme a la NOM-004-SSA3-2012, el personal reportó olvido de clave y solicita restablecimiento a su usuario institucional.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {solicitudesPendientes.map((sol) => (
                <button
                  key={sol.id_solicitud}
                  type="button"
                  onClick={() => {
                    const found = medicos.find((m) => m.id_medico === sol.id_medico || (m.username && m.username.toLowerCase() === sol.username.toLowerCase()));
                    if (found) {
                      setModalRestablecer(found);
                    } else {
                      setModalRestablecer({
                        id_medico: sol.id_medico,
                        nombre: sol.nombre_solicitante || sol.username,
                        apellido_paterno: '',
                        cedula_profesional: sol.cedula_profesional || '',
                        especialidad: sol.especialidad || '',
                        activo: true,
                        username: sol.username,
                      });
                    }
                  }}
                  style={{
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Restablecer contraseña a @{sol.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                Plantilla institucional
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#0f3f2f',
                  color: '#ffffff',
                }}
              >
                {medicosFiltrados.length} {medicosFiltrados.length === 1 ? 'miembro' : 'miembros'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-light)' }}>
              Personal de salud y administrativo con cédula y credenciales registradas.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 260 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, especialidad, usuario o cédula..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 34,
                  fontSize: 13,
                  height: 36,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', margin: 0 }}>Rol:</label>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  height: 36,
                }}
              >
                <option value="todos">Todos los roles</option>
                {ROLES_CATALOGO.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', margin: 0 }}>Área:</label>
              <select
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  height: 36,
                }}
              >
                <option value="todas">Todas las áreas</option>
                {AREAS_HOSPITALIZACION.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading" style={{ padding: 40 }}>
            <div className="spinner" />
            <p>Cargando directorio de personal hospitalario...</p>
          </div>
        ) : medicosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <UserCheck size={48} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>No se encontró personal registrado</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              {busqueda || filtroRol !== 'todos'
                ? 'No hay miembros del personal que coincidan con los filtros aplicados.'
                : 'Aún no hay personal registrado en el sistema.'}
            </p>
            <button onClick={abrirModalNuevo} className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0f3f2f' }}>
              <UserPlus size={15} /> Registrar nuevo personal
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" style={{ margin: 0, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, letterSpacing: 0.3 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Personal institucional</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '160px' }}>Rol en sistema</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '200px' }}>Especialidad médica</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '190px' }}>Área hospitalaria</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>Cédula profesional</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: '160px' }}>Cuenta de usuario</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Estatus</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {medicosFiltrados.map((m) => {
                const nombreCompleto = `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno || ''}`.trim();
                const rolInfo = getRolInfo(m.id_rol, m.rol_nombre);

                return (
                  <tr
                    key={m.id_medico}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                      opacity: m.activo ? 1 : 0.6
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: m.activo ? '#dcfce7' : '#f1f5f9',
                          color: m.activo ? '#166534' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0
                        }}>
                          {m.nombre.charAt(0)}{m.apellido_paterno.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                            {nombreCompleto}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            ID #{m.id_medico}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: rolInfo.badgeBg,
                        color: rolInfo.badgeColor,
                        border: `1px solid ${rolInfo.badgeBorder}`,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3
                      }}>
                        {rolInfo.label}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #e2e8f0'
                      }}>
                        <Stethoscope size={13} color="#0f3f2f" /> {m.especialidad || 'Sin especialidad'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a'
                      }}>
                        {m.area_hospitalizacion || 'Hospitalización General'}
                      </span>
                    </td>

                    {/* Cédula */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5, color: '#334155', background: '#f8fafc', padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        <Award size={13} color="#0f3f2f" />
                        {m.cedula_profesional}
                      </div>
                    </td>

                    {/* Usuario de Sistema */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      {m.username ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#065f46',
                            background: '#ecfdf5',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #a7f3d0'
                          }}>
                            <Key size={12} /> @{m.username}
                          </span>
                          {solicitudesPendientes.some((s) => s.id_medico === m.id_medico || s.username?.toLowerCase() === m.username?.toLowerCase()) && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#92400e',
                              background: '#fef3c7',
                              padding: '1px 6px',
                              borderRadius: 4,
                              border: '1px solid #fde68a'
                            }}>
                              Solicitó restablecimiento
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
                          Sin usuario login
                        </span>
                      )}
                    </td>

                    {/* Estatus */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                      {m.activo ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d'
                        }}>
                          <CheckCircle2 size={12} /> Activo
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#fee2e2',
                          color: '#b91c1c'
                        }}>
                          <XCircle size={12} /> Inactivo
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {/* Editar */}
                        <button
                          onClick={() => abrirModalEditar(m)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Editar datos del personal"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Restablecer Contraseña al Usuario (NOM-004) */}
                        {m.username && (() => {
                          const tieneSolicitud = solicitudesPendientes.some(
                            (s) => s.id_medico === m.id_medico || (m.username && s.username?.toLowerCase() === m.username?.toLowerCase())
                          );
                          return (
                            <button
                              onClick={() => setModalRestablecer(m)}
                              className="btn"
                              style={{
                                padding: '5px 8px',
                                fontSize: 12,
                                borderRadius: 4,
                                background: tieneSolicitud ? '#fef3c7' : '#ecfdf5',
                                color: tieneSolicitud ? '#b45309' : '#047857',
                                border: tieneSolicitud ? '1px solid #fde68a' : '1px solid #a7f3d0',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4
                              }}
                              title={tieneSolicitud
                                ? `Atender solicitud de restablecimiento para @${m.username}`
                                : `Restablecer contraseña automáticamente a su nombre de usuario ("${m.username}")`}
                            >
                              <RotateCcw size={13} />
                              {tieneSolicitud && (
                                <span style={{ fontSize: 10, fontWeight: 700 }}>Solicitud</span>
                              )}
                            </button>
                          );
                        })()}

                        {/* Desactivar / Activar */}
                        <button
                          onClick={() => setModalToggleActivo(m)}
                          className="btn"
                          style={{
                            padding: '5px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            background: m.activo ? '#fef3c7' : '#dcfce7',
                            color: m.activo ? '#92400e' : '#15803d',
                            border: '1px solid ' + (m.activo ? '#fde68a' : '#86efac'),
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title={m.activo ? 'Desactivar acceso temporalmente' : 'Reactivar en la plantilla'}
                        >
                          {m.activo ? 'Pausar' : 'Activar'}
                        </button>

                        {/* Eliminar Definitivamente */}
                        <button
                          onClick={() => setModalEliminar(m)}
                          className="btn"
                          style={{
                            padding: '5px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Eliminar usuario / dar de baja del sistema"
                        >
                          <Trash2 size={13} />
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
      </div>

      {/* MODAL REGISTRO / EDICIÓN DE PERSONAL */}
      {(modalOpen || modalEditar) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={20} color="#0f3f2f" />
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f3f2f', fontWeight: 700 }}>
                  {modalEditar ? 'Editar personal y usuario' : 'Registrar nuevo personal / usuario'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setModalEditar(null); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGuardar} style={{ padding: '20px 22px' }}>
              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', fontSize: 12.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} /> {errorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12.5, fontWeight: 700 }}>Nombre(s) *</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Roberto Carlos"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12.5, fontWeight: 700 }}>Primer apellido *</label>
                  <input
                    type="text"
                    required
                    value={form.apellido_paterno}
                    onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                    placeholder="Ej. Mendoza"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12.5, fontWeight: 700 }}>Segundo apellido</label>
                  <input
                    type="text"
                    value={form.apellido_materno}
                    onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                    placeholder="Ej. Cruz"
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12.5, fontWeight: 700 }}>Cédula profesional *</label>
                  <input
                    type="text"
                    required
                    value={form.cedula_profesional}
                    onChange={(e) => setForm({ ...form, cedula_profesional: e.target.value.replace(/\s+/g, '') })}
                    placeholder="Ej. 12345678"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* ROL / CATEGORÍA INSTITUCIONAL */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f3f2f' }}>
                  Rol / categoría del personal en el sistema *
                </label>
                <select
                  value={form.id_rol}
                  onChange={(e) => setForm({ ...form, id_rol: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5, borderRadius: 6, borderColor: '#cbd5e1', fontWeight: 600 }}
                >
                  {ROLES_CATALOGO.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Establece las funciones y permisos en el sistema: Médico, Enfermería, Admisión o Administrador.
                </span>
              </div>

              {/* ESPECIALIDAD MÉDICA ESCRITA */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f3f2f' }}>
                  Especialidad médica / área de adscripción (escrita) *
                </label>
                <input
                  type="text"
                  required
                  list="sugerencias-especialidades"
                  value={form.especialidad}
                  onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                  placeholder="Escriba la especialidad (ej. Medicina Interna, Enfermería Quirúrgica, Admisión General...)"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
                />
                <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Escriba libremente la especialidad o departamento institucional.
                </span>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0f3f2f' }}>
                  Área de hospitalización / Servicio clínico asignado *
                </label>
                <select
                  value={form.area_hospitalizacion}
                  onChange={(e) => setForm({ ...form, area_hospitalizacion: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5, borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                >
                  {AREAS_HOSPITALIZACION.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Área de internamiento o servicio hospitalario donde labora y se encuentra disponible.
                </span>
              </div>

              {/* CUENTA DE INICIO DE SESIÓN / CONTRASEÑA */}
              <div style={{
                marginTop: 18,
                padding: '14px 16px',
                borderRadius: 8,
                background: form.crearUsuario ? '#ecfdf5' : '#f8fafc',
                border: form.crearUsuario ? '1.5px solid #6ee7b7' : '1px solid #e2e8f0'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#0f3f2f' }}>
                  <input
                    type="checkbox"
                    checked={form.crearUsuario}
                    onChange={(e) => setForm({ ...form, crearUsuario: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: '#0f3f2f' }}
                  />
                  <span>
                    {modalEditar
                      ? form.username ? '¿Modificar credenciales o contraseña del usuario?' : '¿Asignar cuenta de acceso a este miembro del personal?'
                      : '¿Crear cuenta de acceso al sistema con usuario y contraseña?'}
                  </span>
                </label>

                {form.crearUsuario && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Usuario de login *</label>
                      <input
                        type="text"
                        required={form.crearUsuario}
                        disabled={!!modalEditar?.username}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                        placeholder="ej. dr.mendoza"
                        style={{ background: modalEditar?.username ? '#f1f5f9' : '#fff' }}
                      />
                      {modalEditar?.username && (
                        <span style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, display: 'block' }}>
                          El nombre de usuario no es editable una vez creado.
                        </span>
                      )}
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>
                          {modalEditar ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                        </label>
                        {modalEditar?.username && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, password: form.username })}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#047857',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: 0
                            }}
                            title="Asignar su propio nombre de usuario como contraseña"
                          >
                            <RotateCcw size={11} /> Usar usuario "@{form.username}"
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        required={!modalEditar && form.crearUsuario}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={modalEditar ? 'Dejar en blanco para conservar' : 'Mínimo 6 caracteres'}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setModalOpen(false); setModalEditar(null); }}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: '#0f3f2f', borderColor: '#0f3f2f', padding: '8px 22px' }}
                >
                  {saving ? 'Guardando...' : modalEditar ? 'Guardar cambios' : 'Registrar personal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE USUARIO */}
      {modalEliminar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #fca5a5',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#fef2f2',
              padding: '16px 20px',
              borderBottom: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <AlertTriangle size={24} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: 16, color: '#991b1b', fontWeight: 700 }}>
                Confirmar eliminación de usuario / personal
              </h3>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1f2937' }}>
                ¿Está seguro de que desea eliminar a:
              </p>
              <div style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                  {modalEliminar.nombre} {modalEliminar.apellido_paterno} {modalEliminar.apellido_materno || ''}
                </div>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                  Especialidad: <strong>{modalEliminar.especialidad}</strong> • Cédula: <code>{modalEliminar.cedula_profesional}</code>
                </div>
                {modalEliminar.username && (
                  <div style={{ fontSize: 12, color: '#065f46', marginTop: 4, fontWeight: 600 }}>
                    Usuario de login vinculado: @{modalEliminar.username}
                  </div>
                )}
              </div>

              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: '#92400e',
                lineHeight: 1.5,
                marginBottom: 20
              }}>
                <strong>Normativa Oficial NOM-004-SSA3-2012:</strong> Si el personal no cuenta con registros clínicos, se eliminará permanentemente de la base de datos. Si cuenta con notas médicas o expedientes firmados, sus credenciales y accesos quedarán revocados inmediatamente y el registro legal se archivará como inactivo.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalEliminar(null)}
                  disabled={eliminando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleConfirmarEliminar}
                  disabled={eliminando}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 20px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {eliminando ? 'Eliminando...' : <><Trash2 size={15} /> Sí, eliminar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESTABLECIMIENTO AUTOMÁTICO DE CONTRASEÑA (NOM-004) */}
      {modalRestablecer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #a7f3d0',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#ecfdf5',
              padding: '16px 20px',
              borderBottom: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <KeyRound size={22} color="#047857" />
              <h3 style={{ margin: 0, fontSize: 16, color: '#065f46', fontWeight: 700 }}>
                Restablecer contraseña de usuario
              </h3>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 13.5, color: '#1f2937', lineHeight: 1.5 }}>
                De acuerdo con el protocolo institucional de seguridad <strong>NOM-004-SSA3-2012</strong>, la contraseña del personal será restablecida de forma automática al nombre de usuario:
              </p>

              <div style={{
                background: '#f8fafc',
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>
                  {modalRestablecer.nombre} {modalRestablecer.apellido_paterno} {modalRestablecer.apellido_materno || ''}
                </div>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                  Usuario de acceso: <strong style={{ color: '#047857' }}>@{modalRestablecer.username}</strong>
                </div>
                <div style={{
                  fontSize: 12.5,
                  color: '#15803d',
                  marginTop: 8,
                  padding: '6px 10px',
                  background: '#dcfce7',
                  borderRadius: 6,
                  fontWeight: 600,
                  display: 'inline-block'
                }}>
                  Nueva contraseña asignada: <code>{modalRestablecer.username}</code>
                </div>
              </div>

              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: '#92400e',
                lineHeight: 1.5,
                marginBottom: 20
              }}>
                <strong>Protocolo de acceso:</strong> El personal podrá ingresar de inmediato al sistema colocando <strong>{modalRestablecer.username}</strong> en el campo de contraseña.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalRestablecer(null)}
                  disabled={restableciendo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleConfirmarRestablecer}
                  disabled={restableciendo}
                  style={{
                    background: '#047857',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 20px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {restableciendo ? 'Restableciendo...' : <><RotateCcw size={14} /> Restablecer contraseña</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal institucional para cambiar estado activo / inactivo */}
      {modalToggleActivo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          padding: 16
        }}
        onClick={() => {
          if (!togglingActivo) setModalToggleActivo(null);
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: `1px solid ${modalToggleActivo.activo ? '#fde68a' : '#bbf7d0'}`,
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}>
            <div style={{
              background: modalToggleActivo.activo ? '#fffbeb' : '#ecfdf5',
              padding: '16px 20px',
              borderBottom: `1px solid ${modalToggleActivo.activo ? '#fde68a' : '#a7f3d0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: modalToggleActivo.activo ? '#fef3c7' : '#dcfce7',
                  color: modalToggleActivo.activo ? '#b45309' : '#047857',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {modalToggleActivo.activo ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15.5, color: modalToggleActivo.activo ? '#92400e' : '#065f46', fontWeight: 700 }}>
                    {modalToggleActivo.activo ? 'Desactivar personal hospitalario' : 'Reactivar personal hospitalario'}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Hospital General San Felipe del Progreso
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalToggleActivo(null)}
                disabled={togglingActivo}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#1e293b', lineHeight: 1.5 }}>
                {modalToggleActivo.activo
                  ? `¿Desea pausar o desactivar el acceso en la plantilla para ${modalToggleActivo.nombre} ${modalToggleActivo.apellido_paterno}?`
                  : `¿Desea reactivar en la plantilla laboral a ${modalToggleActivo.nombre} ${modalToggleActivo.apellido_paterno}?`}
              </p>

              <div style={{
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: 14,
                fontSize: 12.5,
                color: '#475569'
              }}>
                <div><strong>Especialidad:</strong> {modalToggleActivo.especialidad}</div>
                {modalToggleActivo.username && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Usuario de acceso:</strong> @{modalToggleActivo.username}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: 12,
                color: modalToggleActivo.activo ? '#92400e' : '#15803d',
                background: modalToggleActivo.activo ? '#fef3c7' : '#dcfce7',
                padding: '8px 12px',
                borderRadius: 6
              }}>
                {modalToggleActivo.activo
                  ? 'El usuario no podrá iniciar sesión en el expediente clínico digital mientras se encuentre inactivo.'
                  : 'El personal recuperará de inmediato sus facultades de acceso al expediente clínico digital.'}
              </div>
            </div>

            <div style={{
              padding: '14px 22px',
              borderTop: '1px solid #e2e8f0',
              background: '#fafafa',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalToggleActivo(null)}
                disabled={togglingActivo}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 7,
                  padding: '7px 16px',
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarToggleActivo}
                disabled={togglingActivo}
                style={{
                  background: modalToggleActivo.activo ? '#b45309' : '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '7px 18px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {togglingActivo
                  ? 'Guardando...'
                  : modalToggleActivo.activo
                  ? 'Confirmar desactivación'
                  : 'Confirmar reactivación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
