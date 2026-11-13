import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pacientes } from '../../services/api';
import {
  Search,
  Edit,
  Trash2,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

export default function Pacientes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = (user?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isAdmision = userRole === 'admision';
  const isEnfermeria = userRole === 'enfermeria';

  const { showToast } = useToast();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [areaSeleccionada, setAreaSeleccionada] = useState('todos');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [modalDelete, setModalDelete] = useState<{
    isOpen: boolean;
    id: number | null;
    nombre: string;
    loading: boolean;
  }>({
    isOpen: false,
    id: null,
    nombre: '',
    loading: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(buscarText?: string) {
    setLoading(true);
    try {
      const res = await pacientes.list(buscarText ? { buscar: buscarText } : {});
      if (res.success) {
        setLista(res.data || []);
        setMostrarTodos(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function requestDelete(id: number, nombre: string) {
    setModalDelete({
      isOpen: true,
      id,
      nombre,
      loading: false,
    });
  }

  async function handleConfirmDelete() {
    if (!modalDelete.id) return;
    setModalDelete((prev) => ({ ...prev, loading: true }));
    try {
      await pacientes.remove(modalDelete.id);
      showToast(`El paciente "${modalDelete.nombre}" ha sido eliminado exitosamente.`, 'success');
      setModalDelete({ isOpen: false, id: null, nombre: '', loading: false });
      await loadData(buscar.trim() || undefined);
    } catch (err: any) {
      showToast(err.message || 'No se pudo eliminar el paciente', 'error');
      setModalDelete((prev) => ({ ...prev, loading: false }));
    }
  }

  function calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '--';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let anios = hoy.getFullYear() - nac.getFullYear();
    const meses = hoy.getMonth() - nac.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nac.getDate())) anios--;
    if (anios <= 0) return '< 1 año';
    return anios === 1 ? '1 año' : `${anios} años`;
  }

  function normalizeArea(areaRaw?: string): string {
    const a = (areaRaw || '').toLowerCase();
    if (a.includes('urgenc')) return 'urgencias';
    if (a.includes('hospit') || a.includes('piso')) return 'hospitalizacion';
    if (a.includes('toco') || a.includes('obstet')) return 'tococirugia';
    if (a.includes('pediat')) return 'pediatria';
    if (a.includes('consulta')) return 'consulta_externa';
    return 'admision';
  }

  function renderBadgeArea(areaRaw?: string, estatusEncuentro?: string) {
    if (!areaRaw) {
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2.5px 8px',
            borderRadius: 4,
            background: '#f1f5f9',
            color: '#475569',
            letterSpacing: 0.2,
            display: 'inline-block',
          }}
        >
          Padrón General
        </span>
      );
    }

    const a = normalizeArea(areaRaw);
    let label = 'Admisión';
    let bg = '#e0f2fe';
    let color = '#0369a1';

    if (a === 'urgencias') {
      label = 'Urgencias';
      bg = '#fee2e2';
      color = '#b91c1c';
    } else if (a === 'hospitalizacion') {
      label = 'Hospitalización';
      bg = '#fef3c7';
      color = '#b45309';
    } else if (a === 'tococirugia') {
      label = 'Tococirugía';
      bg = '#f3e8ff';
      color = '#7e22ce';
    } else if (a === 'pediatria') {
      label = 'Pediatría';
      bg = '#ecfdf5';
      color = '#047857';
    } else if (a === 'consulta_externa') {
      label = 'Consulta Externa';
      bg = '#e0f2fe';
      color = '#0284c7';
    }

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2.5px 8px',
            borderRadius: 4,
            background: bg,
            color: color,
            letterSpacing: 0.2,
            display: 'inline-block',
          }}
        >
          {label}
        </span>
        {estatusEncuentro && estatusEncuentro !== 'activo' && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              background: '#f1f5f9',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            {estatusEncuentro}
          </span>
        )}
      </div>
    );
  }

  // Conteos por área en el padrón
  const conteosPorArea = useMemo(() => {
    const counts: Record<string, number> = {
      todos: lista.length,
      urgencias: 0,
      hospitalizacion: 0,
      tococirugia: 0,
      pediatria: 0,
      consulta_externa: 0,
      admision: 0,
    };
    lista.forEach((p) => {
      const a = normalizeArea(p.area_ingreso || p.servicio_actual);
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [lista]);

  const tabsAreas = [
    { id: 'todos', label: 'Todos los servicios', count: conteosPorArea.todos },
    { id: 'urgencias', label: 'Urgencias', count: conteosPorArea.urgencias },
    { id: 'hospitalizacion', label: 'Hospitalización', count: conteosPorArea.hospitalizacion },
    { id: 'tococirugia', label: 'Tococirugía', count: conteosPorArea.tococirugia },
    { id: 'pediatria', label: 'Pediatría', count: conteosPorArea.pediatria },
    { id: 'consulta_externa', label: 'Consulta externa', count: conteosPorArea.consulta_externa },
    { id: 'admision', label: 'Admisión', count: conteosPorArea.admision },
  ];

  // Filtrado instantáneo por pestaña de área y texto de búsqueda
  const pacientesFiltrados = useMemo(() => {
    return lista.filter((p) => {
      if (areaSeleccionada !== 'todos') {
        const a = normalizeArea(p.area_ingreso || p.servicio_actual);
        if (a !== areaSeleccionada) return false;
      }
      if (buscar.trim()) {
        const q = buscar.trim().toLowerCase();
        const nombreCompleto = `${p.nombre || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.toLowerCase();
        const exp = (p.expediente_clinico || '').toLowerCase();
        const curp = (p.curp || '').toLowerCase();
        return nombreCompleto.includes(q) || exp.includes(q) || curp.includes(q);
      }
      return true;
    });
  }, [lista, areaSeleccionada, buscar]);

  const LIMITE_FILAS = 5;
  const tieneMasDeCinco = pacientesFiltrados.length > LIMITE_FILAS;
  const listaVisible = mostrarTodos || !tieneMasDeCinco ? pacientesFiltrados : pacientesFiltrados.slice(0, LIMITE_FILAS);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 50 }}>
      {/* Encabezado Superior de Sección */}
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Users size={26} color="#0f3f2f" />
            {userRole === 'admision' && 'Padrón de beneficiarios y registro'}
            {userRole === 'medico' && 'Padrón y expedientes de pacientes'}
            {userRole === 'enfermeria' && 'Padrón de pacientes en servicio'}
            {userRole === 'admin' && 'Padrón de beneficiarios'}
          </h1>
          <p style={{ color: 'var(--text-light)', margin: '4px 0 0', fontSize: 13 }}>
            {userRole === 'admision' && 'Padrón de derechohabientes, admisión y alta administrativa de pacientes'}
            {userRole === 'medico' && 'Consulta de historiales clínicos, antecedentes y notas médicas NOM-004'}
            {userRole === 'enfermeria' && 'Consulta de pacientes para registro de signos vitales e indicaciones'}
            {userRole === 'admin' && 'Registro general de beneficiarios y expedientes clínicos del hospital'}
          </p>
        </div>
      </div>

      {/* Contenedor Principal con el mismo formato unificado del Inicio */}
      <div className="card" style={{ padding: 20 }}>
        {/* Cabecera del Padrón con Buscador Integrado */}
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
                Padrón: {tabsAreas.find((t) => t.id === areaSeleccionada)?.label || 'Todos los servicios'}
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
                {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-light)' }}>
              Beneficiarios registrados en el sistema con acceso directo a su expediente clínico digital.
            </p>
          </div>

          {/* Buscador único y botón Nuevo Paciente (mismo diseño que Inicio) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
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
                value={buscar}
                onChange={(e) => {
                  setBuscar(e.target.value);
                  setMostrarTodos(false);
                }}
                placeholder="Buscar por nombre, expediente o CURP..."
                style={{
                  padding: '8px 30px 8px 34px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  outline: 'none',
                  minWidth: 280,
                  background: 'var(--bg-light, #f8fafc)',
                }}
              />
              {buscar && (
                <X
                  size={14}
                  style={{
                    position: 'absolute',
                    right: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                  onClick={() => {
                    setBuscar('');
                    setMostrarTodos(false);
                  }}
                />
              )}
            </div>

            {(isAdmin || isAdmision) && (
              <Link
                to="/pacientes/nuevo"
                className="btn btn-primary"
                style={{
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  background: '#047857',
                  borderColor: '#047857',
                  textDecoration: 'none',
                }}
              >
                <UserPlus size={14} />
                Nuevo paciente
              </Link>
            )}
          </div>
        </div>

        {/* Pestañas de filtrado por servicio (mismo estilo que Inicio) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-light, #f1f5f9)',
            padding: 5,
            borderRadius: 10,
            overflowX: 'auto',
            marginBottom: 16,
          }}
        >
          {tabsAreas.map((tab) => {
            const isActive = areaSeleccionada === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAreaSeleccionada(tab.id);
                  setMostrarTodos(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0f3f2f' : 'var(--text-light)',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: 'none',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: isActive ? '#e6f4ea' : 'rgba(0,0,0,0.06)',
                      color: isActive ? '#0f3f2f' : 'inherit',
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tabla con el formato exacto de Inicio */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Cargando padrón de beneficiarios...</p>
          </div>
        ) : pacientesFiltrados.length > 0 ? (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Expediente</th>
                    <th>Paciente</th>
                    <th style={{ width: 130 }}>Edad / sexo</th>
                    <th style={{ width: 160 }}>Área / cama</th>
                    <th style={{ width: 145 }}>Fecha de ingreso</th>
                    <th style={{ textAlign: 'center', width: 220 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listaVisible.map((p: any) => {
                    const fechaMostrar = p.fecha_hora_ingreso || p.created_at;
                    return (
                      <tr key={p.id_paciente}>
                        <td>
                          <Link
                            to={`/pacientes/${p.id_paciente}`}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#0f3f2f',
                              textDecoration: 'none',
                            }}
                            title="Ver expediente clínico"
                          >
                            {p.expediente_clinico}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            <Link
                              to={`/pacientes/${p.id_paciente}`}
                              style={{
                                color: 'var(--text)',
                                textDecoration: 'none',
                              }}
                              title="Ver expediente clínico"
                            >
                              {p.nombre} {p.apellido_paterno} {p.apellido_materno || ''}
                            </Link>
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              fontFamily: 'monospace',
                              color: p.curp ? 'var(--text-light)' : '#0284c7',
                              marginTop: 2,
                            }}
                          >
                            {p.curp || 'SIN CURP (REGISTRO PROVISIONAL)'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12 }}>
                            {calcularEdad(p.fecha_nacimiento)} • {p.sexo === 'M' ? 'Masc' : 'Fem'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {renderBadgeArea(p.area_ingreso, p.estatus_encuentro)}
                            {p.cama_asignada && (
                              <span style={{ fontSize: 11, color: '#0f3f2f', fontWeight: 600 }}>
                                • {p.cama_asignada}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                          {fechaMostrar
                            ? new Date(fechaMostrar).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              className="btn btn-primary"
                              style={{
                                fontSize: 11.5,
                                padding: '5px 11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: '#0f3f2f',
                                borderColor: '#0f3f2f',
                                color: '#ffffff',
                              }}
                              onClick={() => navigate(`/pacientes/${p.id_paciente}`)}
                              title="Ver expediente clínico"
                            >
                              <Eye size={13} /> Expediente
                            </button>

                            <button
                              className="btn btn-secondary"
                              style={{
                                fontSize: 11.5,
                                padding: '5px 9px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                borderColor: '#cbd5e1',
                                color: '#334155',
                              }}
                              onClick={() => navigate(`/pacientes/${p.id_paciente}/editar`)}
                              title="Editar datos del paciente"
                            >
                              <Edit size={13} />
                            </button>

                            <button
                              className="btn btn-danger"
                              style={{
                                fontSize: 11.5,
                                padding: '5px 9px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#dc2626',
                                borderColor: '#dc2626',
                                color: '#ffffff',
                              }}
                              onClick={() => requestDelete(p.id_paciente, `${p.nombre} ${p.apellido_paterno}`)}
                              title="Eliminar paciente"
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

            {/* Botón Ver Más cuando se llega a 5 filas (mismo formato que Inicio) */}
            {tieneMasDeCinco && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  marginTop: 12,
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>
                    Mostrando <strong>{listaVisible.length}</strong> de <strong>{pacientesFiltrados.length}</strong> pacientes
                  </span>
                  {!mostrarTodos && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#e2e8f0',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      +{pacientesFiltrados.length - LIMITE_FILAS} más
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarTodos(!mostrarTodos)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '6px 14px',
                    color: '#0f3f2f',
                    borderColor: '#cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {mostrarTodos ? (
                    <>
                      <ChevronUp size={16} /> Ver menos (mostrar 5)
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} /> Ver más pacientes ({pacientesFiltrados.length - LIMITE_FILAS} restantes)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--bg-light, #f8fafc)',
              borderRadius: 8,
              border: '1px dashed var(--border)',
            }}
          >
            <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              No se encontraron pacientes en esta vista
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}>
              {buscar
                ? `No se encontraron resultados para "${buscar}".`
                : 'Puedes registrar un nuevo beneficiario desde Admisión.'}
            </div>
            <Link
              to="/pacientes/nuevo"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, textDecoration: 'none' }}
            >
              <UserPlus size={14} /> Registrar nuevo paciente
            </Link>
          </div>
        )}
      </div>

      {/* Modal de confirmación con diseño hospitalario */}
      <ConfirmModal
        isOpen={modalDelete.isOpen}
        title="Eliminar paciente"
        message={`¿Estás seguro de que deseas eliminar a "${modalDelete.nombre}" y todo su historial de consultas, notas médicas y estudios? Esta acción es definitiva.`}
        confirmText={modalDelete.loading ? 'Eliminando...' : 'Sí, eliminar'}
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setModalDelete({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  );
}
