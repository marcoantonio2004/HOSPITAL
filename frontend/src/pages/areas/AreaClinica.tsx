import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pacientes } from '../../services/api';
import {
  Activity,
  Baby,
  Bed,
  FileText,
  Stethoscope,
  Users,
  Layers,
  Search,
  UserPlus,
  ArrowRight,
  Clock,
  RefreshCw,
  FolderOpen,
  ChevronRight,
  ClipboardList,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AreaConfig {
  id: string;
  nombre: string;
  nombreCorto: string;
  descripcion: string;
  icono: any;
  color: string;
  bgLight: string;
  borderColor: string;
  accionesRapidas: {
    etiqueta: string;
    rutaFn: (idEncuentro: number) => string;
  }[];
}

interface Cama {
  id_cama: number;
  numero: string;
  area: string;
  es_censable: boolean;
  estado: string;
  tipo?: string;
  descripcion?: string;
  id_encuentro?: number;
  id_paciente?: number;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  expediente_clinico?: string;
  servicio_actual?: string;
}

interface ResumenCamas {
  total_camas: number;
  censables_total: number;
  censables_disponibles: number;
  censables_ocupadas: number;
  no_censables_total: number;
  no_censables_disponibles: number;
  no_censables_ocupadas: number;
  total_disponibles: number;
  total_ocupadas: number;
}

const AREAS_MAP: Record<string, AreaConfig> = {
  todas: {
    id: 'todas',
    nombre: 'Todas las Áreas Médicas',
    nombreCorto: 'Todas las Áreas',
    descripcion: 'Concentración y censo activo de pacientes en todos los servicios y áreas del hospital',
    icono: Layers,
    color: '#0f766e',
    bgLight: '#f0fdfa',
    borderColor: '#99f6e4',
    accionesRapidas: [
      { etiqueta: 'Expediente', rutaFn: (id) => `/pacientes/${id}` },
    ]
  },
  admision: {
    id: 'admision',
    nombre: 'Admisión Continua y Archivo',
    nombreCorto: 'Admisión',
    descripcion: 'Recepción, apertura de expediente y asignación inicial de pacientes al hospital',
    icono: FileText,
    color: '#0284c7',
    bgLight: '#f0f9ff',
    borderColor: '#bae6fd',
    accionesRapidas: [
      { etiqueta: 'Hoja Frontal', rutaFn: (id) => `/encuentros/${id}/hoja-frontal` },
      { etiqueta: 'Aviso Privacidad', rutaFn: (id) => `/encuentros/${id}/aviso-privacidad` },
    ]
  },
  urgencias: {
    id: 'urgencias',
    nombre: 'Servicio de Urgencias y Triage',
    nombreCorto: 'Urgencias',
    descripcion: 'Atención médica inmediata continua, triage clínico y observación de urgencias',
    icono: Activity,
    color: '#dc2626',
    bgLight: '#fef2f2',
    borderColor: '#fecaca',
    accionesRapidas: [
      { etiqueta: 'Hoja SINBA-16', rutaFn: (id) => `/encuentros/${id}/sinba-16` },
      { etiqueta: 'Nota Urgencias', rutaFn: (id) => `/encuentros/${id}/urgencias` },
      { etiqueta: 'Indicaciones', rutaFn: (id) => `/encuentros/${id}/indicaciones` },
    ]
  },
  hospitalizacion: {
    id: 'hospitalizacion',
    nombre: 'Hospitalización General',
    nombreCorto: 'Hospitalización',
    descripcion: 'Pacientes internados en servicio médico de Medicina Interna y Cirugía General',
    icono: Bed,
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    borderColor: '#ddd6fe',
    accionesRapidas: [
      { etiqueta: 'Hoja SINBA-14', rutaFn: (id) => `/encuentros/${id}/sinba-14` },
      { etiqueta: 'Evolución Diaria', rutaFn: (id) => `/encuentros/${id}/evolucion` },
      { etiqueta: 'Indicaciones', rutaFn: (id) => `/encuentros/${id}/indicaciones` },
    ]
  },
  tococirugia: {
    id: 'tococirugia',
    nombre: 'Tococirugía y Obstetricia',
    nombreCorto: 'Tococirugía',
    descripcion: 'Atención gineco-obstétrica integral, labor de parto, expulsión y puerperio',
    icono: Baby,
    color: '#db2777',
    bgLight: '#fdf2f8',
    borderColor: '#fbcfe8',
    accionesRapidas: [
      { etiqueta: 'Partograma', rutaFn: (id) => `/encuentros/${id}/partograma` },
      { etiqueta: 'Atención de Parto', rutaFn: (id) => `/encuentros/${id}/atencion-parto` },
      { etiqueta: 'Evolución', rutaFn: (id) => `/encuentros/${id}/evolucion` },
    ]
  },
  pediatria: {
    id: 'pediatria',
    nombre: 'Atención Pediátrica',
    nombreCorto: 'Pediatría',
    descripcion: 'Atención médica y seguimiento de pacientes menores de 18 años',
    icono: Users,
    color: '#059669',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
    accionesRapidas: [
      { etiqueta: 'HC Pediátrica', rutaFn: (id) => `/encuentros/${id}/hc-pediatrica` },
      { etiqueta: 'Evolución', rutaFn: (id) => `/encuentros/${id}/evolucion` },
      { etiqueta: 'Indicaciones', rutaFn: (id) => `/encuentros/${id}/indicaciones` },
    ]
  },
  consulta_externa: {
    id: 'consulta_externa',
    nombre: 'Consulta Externa y Especialidades',
    nombreCorto: 'Consulta Externa',
    descripcion: 'Atención médica ambulatoria programada, medicina preventiva y seguimiento',
    icono: Stethoscope,
    color: '#d97706',
    bgLight: '#fffbeb',
    borderColor: '#fde68a',
    accionesRapidas: [
      { etiqueta: 'Historia Clínica', rutaFn: (id) => `/encuentros/${id}/historia-clinica` },
      { etiqueta: 'Evolución', rutaFn: (id) => `/encuentros/${id}/evolucion` },
      { etiqueta: 'Laboratorio', rutaFn: (id) => `/encuentros/${id}/laboratorio` },
    ]
  }
};

const AREA_LIST_KEYS = [
  'todas',
  'admision',
  'urgencias',
  'hospitalizacion',
  'tococirugia',
  'pediatria',
  'consulta_externa'
];

export default function AreaClinica() {
  const { areaId = 'todas' } = useParams<{ areaId: string }>();
  const navigate = useNavigate();

  const normalizedAreaId = useMemo(() => {
    const raw = (areaId || 'todas').toLowerCase().replace('-', '_');
    if (raw === 'obstetricia' || raw === 'toco') return 'tococirugia';
    if (raw === 'consulta') return 'consulta_externa';
    if (raw === 'censo' || raw === 'todas_las_areas') return 'todas';
    return AREAS_MAP[raw] ? raw : 'todas';
  }, [areaId]);

  const currentArea = AREAS_MAP[normalizedAreaId] || AREAS_MAP.todas;
  const AreaIcon = currentArea.icono;

  const [pacientesList, setPacientesList] = useState<any[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({
    todas: 0,
    urgencias: 0,
    hospitalizacion: 0,
    tococirugia: 0,
    admision: 0,
    consulta_externa: 0,
    pediatria: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [resumenCamas, setResumenCamas] = useState<ResumenCamas | null>(null);
  const [cargandoCamas, setCargandoCamas] = useState(false);
  const [filtroCama, setFiltroCama] = useState<'todas' | 'disponibles_censables' | 'disponibles_no_censables' | 'ocupadas'>('todas');

  const cargarCamas = async (areaEspecifica?: string) => {
    setCargandoCamas(true);
    try {
      const areaDest = areaEspecifica || normalizedAreaId;
      const res = await pacientes.getCamas({ area: areaDest });
      if (res?.success && res.data) {
        setCamas(res.data.camas || []);
        setResumenCamas(res.data.resumen || null);
      }
    } catch (err) {
      console.error('Error al cargar camas:', err);
    } finally {
      setCargandoCamas(false);
    }
  };

  const cargarPacientes = async (area: string, query?: string) => {
    setLoading(true);
    try {
      const res = await pacientes.getPorArea(area, query || undefined);
      if (res?.success && res.data) {
        setPacientesList(res.data.pacientes || []);
        if (res.data.conteos) {
          setConteos(res.data.conteos);
        }
      }
    } catch (err) {
      console.error('Error al cargar pacientes de área:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMostrarTodos(false);
    cargarPacientes(normalizedAreaId, filterQuery);
    if (['hospitalizacion', 'urgencias', 'tococirugia', 'pediatria'].includes(normalizedAreaId)) {
      cargarCamas(normalizedAreaId);
    } else {
      setCamas([]);
      setResumenCamas(null);
    }
  }, [normalizedAreaId, filterQuery]);

  const camasFiltradas = useMemo(() => {
    return camas.filter((c) => {
      if (filtroCama === 'disponibles_censables') {
        return c.es_censable && c.estado === 'disponible';
      }
      if (filtroCama === 'disponibles_no_censables') {
        return !c.es_censable && c.estado === 'disponible';
      }
      if (filtroCama === 'ocupadas') {
        return c.estado === 'ocupada';
      }
      return true;
    });
  }, [camas, filtroCama]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterQuery(searchTerm.trim());
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilterQuery('');
  };

  const calcularEdad = (fechaNac?: string) => {
    if (!fechaNac) return '--';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad <= 0 ? '< 1 año' : `${edad} años`;
  };

  const getAreaBadge = (areaName?: string) => {
    const clean = (areaName || '').toLowerCase();
    if (clean.includes('urgenc')) {
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>Urgencias</span>;
    }
    if (clean.includes('hospit')) {
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>Hospitalización</span>;
    }
    if (clean.includes('toco') || clean.includes('obstet')) {
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#fce7f3', color: '#9d174d', border: '1px solid #f9a8d4' }}>Tococirugía</span>;
    }
    if (clean.includes('pediat')) {
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>Pediatría</span>;
    }
    if (clean.includes('admis')) {
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' }}>Admisión</span>;
    }
    return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>Consulta Ext.</span>;
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Breadcrumb / Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-light)' }}>
          <Link to="/" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            Inicio
          </Link>
          <ChevronRight size={14} />
          <span>Áreas Médicas</span>
          <ChevronRight size={14} />
          <span style={{ color: currentArea.color, fontWeight: 600 }}>{currentArea.nombreCorto}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              cargarPacientes(normalizedAreaId, filterQuery);
              if (normalizedAreaId === 'hospitalizacion') cargarCamas();
            }}
            className="btn btn-secondary"
            title="Actualizar listado"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <RefreshCw size={14} className={loading || cargandoCamas ? 'spin' : ''} />
            Actualizar
          </button>
          <Link
            to="/pacientes/nuevo"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <UserPlus size={15} />
            Nuevo Ingreso
          </Link>
        </div>
      </div>

      {/* Header Banner del Área */}
      <div
        style={{
          background: `linear-gradient(135deg, ${currentArea.bgLight} 0%, #ffffff 100%)`,
          borderRadius: 14,
          border: `1.5px solid ${currentArea.borderColor}`,
          padding: '24px 28px',
          marginBottom: 22,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 14,
                background: currentArea.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 6px 16px ${currentArea.color}40`,
                flexShrink: 0
              }}
            >
              <AreaIcon size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.3 }}>
                  {currentArea.nombre}
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: currentArea.color,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 12.5,
                    boxShadow: `0 2px 6px ${currentArea.color}30`
                  }}
                >
                  <Users size={13} />
                  {pacientesList.length} {pacientesList.length === 1 ? 'paciente activo' : 'pacientes activos'}
                </span>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: 13.5, maxWidth: 850 }}>
                {currentArea.descripcion}
              </p>
            </div>
          </div>

          {/* Atajos de formatos clínicos directos para esta área */}
          {currentArea.id !== 'todas' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5 }}>
                Formatos Clínicos de {currentArea.nombreCorto}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {currentArea.accionesRapidas.map((acc, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#ffffff',
                      color: currentArea.color,
                      border: `1px solid ${currentArea.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ClipboardList size={13} />
                    {acc.etiqueta}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navegación y Pestañas de Áreas Clínicas con Contadores */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 18,
          scrollbarWidth: 'thin'
        }}
      >
        {AREA_LIST_KEYS.map((key) => {
          const area = AREAS_MAP[key];
          const isSelected = normalizedAreaId === key;
          const count = conteos[key === 'tococirugia' ? 'tococirugia' : key] ?? 0;
          const IconComp = area.icono;

          return (
            <button
              key={key}
              onClick={() => {
                navigate(`/areas/${key}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                background: isSelected ? area.color : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                border: isSelected ? `1.5px solid ${area.color}` : '1.5px solid #e2e8f0',
                boxShadow: isSelected ? `0 3px 10px ${area.color}35` : '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <IconComp size={16} color={isSelected ? '#ffffff' : area.color} />
              <span>{area.nombreCorto}</span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 7px',
                  borderRadius: 12,
                  fontSize: 11.5,
                  fontWeight: 800,
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {['hospitalizacion', 'urgencias', 'tococirugia', 'pediatria'].includes(normalizedAreaId) && camas.length > 0 && (
        <div
          className="card"
          style={{
            padding: '20px 22px',
            marginBottom: 20,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bed size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Disponibilidad y censo de camas — {currentArea.nombre}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Monitoreo en vivo de camas censables y no censables (tránsito, observación y piso) conforme a normativa hospitalaria.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => cargarCamas(normalizedAreaId)}
              className="btn btn-secondary"
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
            >
              <RefreshCw size={13} className={cargandoCamas ? 'spin' : ''} />
              Actualizar camas
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Camas censables disponibles
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#14532d' }}>
                    {resumenCamas ? resumenCamas.censables_disponibles : '--'}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#15803d', fontWeight: 600 }}>
                    de {resumenCamas ? resumenCamas.censables_total : '--'} totales
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                  Piso de medicina interna y cirugía
                </div>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bed size={20} />
              </div>
            </div>

            <div
              style={{
                background: '#f0f9ff',
                border: '1.5px solid #7dd3fc',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Camas no censables disponibles
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#0c4a6e' }}>
                    {resumenCamas ? resumenCamas.no_censables_disponibles : '--'}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#0284c7', fontWeight: 600 }}>
                    de {resumenCamas ? resumenCamas.no_censables_total : '--'} totales
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2 }}>
                  Tránsito, observación y procedimientos
                </div>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={20} />
              </div>
            </div>

            <div
              style={{
                background: '#fafaf9',
                border: '1.5px solid #d6d3d1',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#57534e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Ocupación activa de piso
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#292524' }}>
                    {resumenCamas ? resumenCamas.total_ocupadas : '--'}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#78716c', fontWeight: 600 }}>
                    de {resumenCamas ? resumenCamas.total_camas : '--'} camas totales
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                  {resumenCamas && resumenCamas.total_camas > 0
                    ? `${Math.round((resumenCamas.total_ocupadas / resumenCamas.total_camas) * 100)}% de ocupación global`
                    : 'Sin registros'}
                </div>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#f5f5f4',
                  color: '#57534e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginRight: 4 }}>
                Filtrar camas:
              </span>
              <button
                type="button"
                onClick={() => setFiltroCama('todas')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filtroCama === 'todas' ? 700 : 500,
                  background: filtroCama === 'todas' ? '#0f3f2f' : '#f1f5f9',
                  color: filtroCama === 'todas' ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Todas ({resumenCamas?.total_camas || 0})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCama('disponibles_censables')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filtroCama === 'disponibles_censables' ? 700 : 500,
                  background: filtroCama === 'disponibles_censables' ? '#166534' : '#f0fdf4',
                  color: filtroCama === 'disponibles_censables' ? '#ffffff' : '#15803d',
                  border: '1px solid #86efac',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Disponibles censables ({resumenCamas?.censables_disponibles || 0})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCama('disponibles_no_censables')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filtroCama === 'disponibles_no_censables' ? 700 : 500,
                  background: filtroCama === 'disponibles_no_censables' ? '#0369a1' : '#f0f9ff',
                  color: filtroCama === 'disponibles_no_censables' ? '#ffffff' : '#0284c7',
                  border: '1px solid #7dd3fc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Disponibles no censables ({resumenCamas?.no_censables_disponibles || 0})
              </button>
              <button
                type="button"
                onClick={() => setFiltroCama('ocupadas')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filtroCama === 'ocupadas' ? 700 : 500,
                  background: filtroCama === 'ocupadas' ? '#991b1b' : '#fef2f2',
                  color: filtroCama === 'ocupadas' ? '#ffffff' : '#b91c1c',
                  border: '1px solid #fca5a5',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Ocupadas ({resumenCamas?.total_ocupadas || 0})
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            {camasFiltradas.map((c) => {
              const estaDisponible = c.estado === 'disponible';
              return (
                <div
                  key={c.id_cama}
                  style={{
                    background: estaDisponible ? '#ffffff' : '#fffbeb',
                    border: estaDisponible ? '1px solid #e2e8f0' : '1px solid #fde68a',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    borderLeft: `4px solid ${estaDisponible ? '#16a34a' : '#d97706'}`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                        {c.numero}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 10,
                          background: c.es_censable ? '#e6f4ea' : '#e0f2fe',
                          color: c.es_censable ? '#166534' : '#0369a1',
                        }}
                      >
                        {c.es_censable ? 'Censable' : 'No censable'}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#64748b', lineHeight: 1.3 }}>
                      {c.tipo || c.descripcion || 'Piso hospitalario'}
                    </p>
                  </div>

                  <div>
                    {estaDisponible ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#16a34a',
                          background: '#f0fdf4',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        ● Disponible
                      </span>
                    ) : (
                      <div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#b45309',
                            background: '#fef3c7',
                            padding: '3px 8px',
                            borderRadius: 6,
                            marginBottom: 4,
                          }}
                        >
                          ● Ocupada
                        </span>
                        {c.nombre && (
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1e293b' }}>
                            {c.id_paciente ? (
                              <Link
                                to={`/pacientes/${c.id_paciente}`}
                                style={{ color: '#0f3f2f', textDecoration: 'none' }}
                              >
                                {c.nombre} {c.apellido_paterno}
                              </Link>
                            ) : (
                              `${c.nombre} ${c.apellido_paterno}`
                            )}
                          </div>
                        )}
                        {c.expediente_clinico && (
                          <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace' }}>
                            {c.expediente_clinico}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtro */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: '12px 18px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  normalizedAreaId === 'todas'
                    ? 'Buscar en todo el hospital por nombre, expediente o servicio...'
                    : `Buscar dentro de ${currentArea.nombreCorto} por nombre, expediente o servicio...`
                }
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 7,
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Search size={14} />
              Buscar
            </button>
            {filterQuery && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearSearch}
                style={{ fontSize: 13 }}
              >
                Limpiar
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Contenido / Listado de Pacientes del Área */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 14px' }} />
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Cargando pacientes de {currentArea.nombreCorto}...
              </p>
            </div>
          ) : pacientesList.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: currentArea.bgLight,
                  color: currentArea.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: `2px solid ${currentArea.borderColor}`
                }}
              >
                <AreaIcon size={32} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                {filterQuery
                  ? `Sin resultados para "${filterQuery}"`
                  : `No hay pacientes activos en ${currentArea.nombreCorto}`}
              </h3>
              <p style={{ color: '#64748b', fontSize: 13.5, marginBottom: 20 }}>
                {filterQuery
                  ? 'Intente con otro término o borre el filtro para ver todos los pacientes del área.'
                  : `Actualmente no se registran pacientes con estancia o consulta activa en ${currentArea.nombreCorto}. Puede registrar un nuevo paciente en Admisión.`}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {filterQuery ? (
                  <button onClick={handleClearSearch} className="btn btn-secondary">
                    Limpiar Búsqueda
                  </button>
                ) : (
                  <Link to="/pacientes/nuevo" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserPlus size={15} />
                    Registrar Nuevo Ingreso
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="table-container">
              <table className="table" style={{ margin: 0, borderCollapse: 'collapse', width: '100%', minWidth: 960 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <th style={{ padding: '12px 14px', width: '135px', textAlign: 'left' }}>Expediente</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>Paciente</th>
                    <th style={{ padding: '12px 14px', width: '180px', textAlign: 'left' }}>CURP</th>
                    <th style={{ padding: '12px 14px', width: '130px', textAlign: 'left' }}>Edad / Sexo</th>
                    <th style={{ padding: '12px 14px', width: '150px', textAlign: 'left' }}>Área / Servicio</th>
                    <th style={{ padding: '12px 14px', width: '155px', textAlign: 'left' }}>Fecha Ingreso</th>
                    <th style={{ padding: '12px 14px', width: '160px', textAlign: 'left' }}>Médico Resp.</th>
                    <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const LIMITE_AREA = 5;
                    const tieneMasDeCinco = pacientesList.length > LIMITE_AREA;
                    const pacientesVisibles = (mostrarTodos || !tieneMasDeCinco)
                      ? pacientesList
                      : pacientesList.slice(0, LIMITE_AREA);

                    return pacientesVisibles.map((p, idx) => {
                    const edad = calcularEdad(p.fecha_nacimiento);
                    const fechaIngreso = p.fecha_hora_ingreso
                      ? new Date(p.fecha_hora_ingreso).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '--';

                    return (
                      <tr
                        key={p.id_encuentro || p.id_paciente || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Expediente */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <Link
                            to={`/pacientes/${p.id_paciente}`}
                            style={{
                              fontWeight: 700,
                              color: 'var(--primary-dark)',
                              fontFamily: 'monospace',
                              fontSize: 13,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              textDecoration: 'none'
                            }}
                          >
                            <FolderOpen size={14} color="var(--primary)" />
                            {p.expediente_clinico || `PAC-${p.id_paciente}`}
                          </Link>
                        </td>

                        {/* Paciente */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13.5 }}>
                            <Link to={`/pacientes/${p.id_paciente}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {p.nombre} {p.apellido_paterno} {p.apellido_materno || ''}
                            </Link>
                          </div>
                        </td>

                        {/* CURP */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          {p.curp ? (
                            <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#475569', background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', letterSpacing: 0.3 }}>
                              {p.curp}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>---</span>
                          )}
                        </td>

                        {/* Edad / Sexo */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{edad}</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ color: p.sexo === 'F' ? '#db2777' : p.sexo === 'M' ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                              {p.sexo === 'F' ? 'Fem' : p.sexo === 'M' ? 'Masc' : p.sexo || '--'}
                            </span>
                          </div>
                        </td>

                        {/* Área / Servicio */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div>{getAreaBadge(p.area_ingreso)}</div>
                          {p.servicio_actual && (
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                              {p.servicio_actual}
                            </div>
                          )}
                        </td>

                        {/* Fecha Ingreso */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#334155' }}>
                            <Clock size={13} color="#94a3b8" />
                            <span>{fechaIngreso}</span>
                          </div>
                        </td>

                        {/* Médico Responsable */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          {p.medico_responsable ? (
                            <div style={{ fontSize: 12.5, color: '#1e293b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <UserCheck size={13} color="var(--primary)" />
                              Dr(a). {p.medico_responsable}
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#64748b', fontSize: 11.5, fontWeight: 500 }}>
                              <UserCheck size={12} color="#94a3b8" /> Med. de Guardia
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Link
                              to={`/pacientes/${p.id_paciente}`}
                              className="btn btn-primary"
                              style={{
                                padding: '5px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <span>Expediente</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Botón Ver Más cuando se llega a 5 filas */}
          {pacientesList.length > 5 && (
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
                  Mostrando <strong>{mostrarTodos ? pacientesList.length : 5}</strong> de <strong>{pacientesList.length}</strong> pacientes en servicio
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
                    +{pacientesList.length - 5} más
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
                    <ChevronDown size={16} /> Ver más pacientes ({pacientesList.length - 5} restantes)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
      </div>
    </div>
  );
}
