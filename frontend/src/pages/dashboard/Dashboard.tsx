import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pacientes } from '../../services/api';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Building2,
  FileText,
  Activity,
  Bed,
  Search,
  Eye,
  CheckCircle2,
  ChevronRight,
  Filter,
  Stethoscope,
  X,
  ShieldCheck,
  FileSpreadsheet,
  Baby,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MetricasDashboard {
  total_pacientes: number;
  total_activos: number;
  urgencias_activas: number;
  hosp_activas: number;
  toco_activas: number;
  admision_activas?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = (user?.rol || '').toLowerCase();
  const isAdmision = userRole === 'admision';
  const isMedico = userRole === 'medico' || userRole === 'obstetricia' || userRole === 'pediatria';
  const isEnfermeria = userRole === 'enfermeria';
  const isAdmin = userRole === 'admin';

  // Reloj y fecha en tiempo real
  const [currentTime, setCurrentTime] = useState(new Date());

  // Estadísticas del hospital
  const [metricas, setMetricas] = useState<MetricasDashboard>({
    total_pacientes: 0,
    total_activos: 0,
    urgencias_activas: 0,
    hosp_activas: 0,
    toco_activas: 0,
    admision_activas: 0,
  });

  // Pacientes activos catalogados por área
  const [pacientesActivos, setPacientesActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de catálogo por área seleccionada
  const [areaSeleccionada, setAreaSeleccionada] = useState<string>('todos');
  const [filtroAreaTexto, setFiltroAreaTexto] = useState('');
  const [mostrarTodosDashboard, setMostrarTodosDashboard] = useState(false);

  // Sincronizar área por defecto al cambiar de usuario/rol
  useEffect(() => {
    setAreaSeleccionada('todos');
  }, [userRole]);

  // Resetear paginación limpia al cambiar de área o filtro de búsqueda
  useEffect(() => {
    setMostrarTodosDashboard(false);
  }, [areaSeleccionada, filtroAreaTexto]);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar métricas y pacientes activos del hospital
  useEffect(() => {
    pacientes
      .getEstadisticasDashboard()
      .then((res: any) => {
        if (res.success && res.data) {
          setMetricas(res.data.metricas);
          setPacientesActivos(res.data.pacientes_activos || res.data.recientes || []);
        }
      })
      .catch((err) => {
        console.error('Error cargando métricas de inicio:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Cálculo de Turno Hospitalario
  function getTurnoInfo(date: Date) {
    const hour = date.getHours();
    if (hour >= 7 && hour < 15) {
      return {
        nombre: 'Turno matutino',
        horario: '07:00 – 15:00 hrs',
        icon: Sun,
        color: '#f59e0b',
        textColor: '#d97706',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    } else if (hour >= 15 && hour < 21) {
      return {
        nombre: 'Turno vespertino',
        horario: '15:00 – 21:00 hrs',
        icon: Sunset,
        color: '#38bdf8',
        textColor: '#0284c7',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.35)',
      };
    } else {
      return {
        nombre: 'Turno nocturno',
        horario: '21:00 – 07:00 hrs',
        icon: Moon,
        color: '#c084fc',
        textColor: '#9333ea',
        bg: 'rgba(192, 132, 252, 0.15)',
        border: 'rgba(192, 132, 252, 0.35)',
      };
    }
  }

  function getSaludo(date: Date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '--';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    if (isNaN(nac.getTime())) return '--';
    let anios = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) anios--;
    return anios >= 0 ? `${anios} años` : '--';
  }

  const turno = getTurnoInfo(currentTime);
  const TurnoIcon = turno.icon;

  const fechaFormateada = currentTime.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const horaFormateada = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Helper para comparar área clínica
  function coincideArea(p: any, filtro: string) {
    if (filtro === 'todos') return true;
    const area = (p.area_ingreso || '').toLowerCase();
    if (filtro === 'tococirugia') {
      return area === 'tococirugia' || area === 'obstetricia';
    }
    if (filtro === 'pediatria') {
      return area === 'pediatria' || p.servicio_actual?.toLowerCase().includes('pediat');
    }
    if (filtro === 'consulta_externa') {
      return area === 'consulta_externa' || area === 'consulta';
    }
    return area === filtro.toLowerCase();
  }

  // Lista única por paciente (su ingreso activo más reciente)
  const pacientesUnicosActivos = useMemo(() => {
    const seen = new Set<number>();
    return pacientesActivos.filter((p) => {
      if (seen.has(p.id_paciente)) return false;
      seen.add(p.id_paciente);
      return true;
    });
  }, [pacientesActivos]);

  // Filtrado de pacientes según área seleccionada y texto de búsqueda
  const pacientesFiltrados = useMemo(() => {
    let list = pacientesUnicosActivos;

    if (areaSeleccionada !== 'todos') {
      list = list.filter((p) => coincideArea(p, areaSeleccionada));
    }

    if (filtroAreaTexto.trim()) {
      const q = filtroAreaTexto.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.apellido_paterno?.toLowerCase().includes(q) ||
          p.apellido_materno?.toLowerCase().includes(q) ||
          p.expediente_clinico?.toLowerCase().includes(q) ||
          p.curp?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pacientesUnicosActivos, areaSeleccionada, filtroAreaTexto]);

  // Conteos reales y precisos por área basados en los pacientes activos actuales
  const conteosPorArea = useMemo(() => {
    return {
      todos: pacientesUnicosActivos.length,
      urgencias: pacientesUnicosActivos.filter((p) => coincideArea(p, 'urgencias')).length,
      hospitalizacion: pacientesUnicosActivos.filter((p) => coincideArea(p, 'hospitalizacion')).length,
      tococirugia: pacientesUnicosActivos.filter((p) => coincideArea(p, 'tococirugia')).length,
      admision: pacientesUnicosActivos.filter((p) => coincideArea(p, 'admision')).length,
      pediatria: pacientesUnicosActivos.filter((p) => coincideArea(p, 'pediatria')).length,
      consulta_externa: pacientesUnicosActivos.filter((p) => coincideArea(p, 'consulta_externa')).length,
    };
  }, [pacientesUnicosActivos]);

  // Pestañas de filtrado rápido por servicio clínico con orden consistente para todos los roles
  const tabsAreas = useMemo(() => {
    if (isAdmision) {
      return [
        { id: 'todos', label: 'Todos los pacientes', count: conteosPorArea.todos },
        { id: 'admision', label: 'Admisión', count: conteosPorArea.admision },
        { id: 'urgencias', label: 'Urgencias', count: conteosPorArea.urgencias },
        { id: 'hospitalizacion', label: 'Hospitalización', count: conteosPorArea.hospitalizacion },
        { id: 'consulta_externa', label: 'Consulta externa', count: conteosPorArea.consulta_externa },
      ];
    }
    if (isEnfermeria) {
      return [
        { id: 'todos', label: 'Todos los pacientes', count: conteosPorArea.todos },
        { id: 'urgencias', label: 'Urgencias', count: conteosPorArea.urgencias },
        { id: 'hospitalizacion', label: 'Hospitalización', count: conteosPorArea.hospitalizacion },
        { id: 'consulta_externa', label: 'Consulta externa', count: conteosPorArea.consulta_externa },
        { id: 'tococirugia', label: 'Tococirugía', count: conteosPorArea.tococirugia },
        { id: 'pediatria', label: 'Pediatría', count: conteosPorArea.pediatria },
      ];
    }
    if (isMedico) {
      return [
        { id: 'todos', label: 'Todos los pacientes', count: conteosPorArea.todos },
        { id: 'urgencias', label: 'Urgencias', count: conteosPorArea.urgencias },
        { id: 'hospitalizacion', label: 'Hospitalización', count: conteosPorArea.hospitalizacion },
        { id: 'consulta_externa', label: 'Consulta externa', count: conteosPorArea.consulta_externa },
        { id: 'tococirugia', label: 'Tococirugía', count: conteosPorArea.tococirugia },
        { id: 'pediatria', label: 'Pediatría', count: conteosPorArea.pediatria },
      ];
    }
    // Administrador / General
    return [
      { id: 'todos', label: 'Todos los pacientes', count: conteosPorArea.todos },
      { id: 'admision', label: 'Admisión', count: conteosPorArea.admision },
      { id: 'urgencias', label: 'Urgencias', count: conteosPorArea.urgencias },
      { id: 'hospitalizacion', label: 'Hospitalización', count: conteosPorArea.hospitalizacion },
      { id: 'consulta_externa', label: 'Consulta externa', count: conteosPorArea.consulta_externa },
      { id: 'tococirugia', label: 'Tococirugía', count: conteosPorArea.tococirugia },
      { id: 'pediatria', label: 'Pediatría', count: conteosPorArea.pediatria },
    ];
  }, [isAdmision, isEnfermeria, isMedico, conteosPorArea]);

  // Helper para nombre legible del área activa
  function getNombreAreaActiva(areaId: string) {
    switch (areaId) {
      case 'urgencias':
        return 'Urgencias médicas y triage';
      case 'hospitalizacion':
        return 'Hospitalización en piso';
      case 'tococirugia':
        return 'Tococirugía y obstetricia';
      case 'admision':
        return 'Admisión hospitalaria';
      case 'pediatria':
        return 'Atención pediátrica';
      case 'consulta_externa':
        return 'Consulta externa y especialidades';
      default:
        return 'Todos los pacientes en atención activa';
    }
  }

  // Helper para ruta de módulo clínico según área del paciente
  function getRutaModuloClinico(p: any) {
    const area = (p.area_ingreso || '').toLowerCase();
    const serv = (p.servicio_actual || '').toLowerCase();

    if (area === 'urgencias' || serv.includes('urgencia')) {
      return { ruta: `/encuentros/${p.id_encuentro}/urgencias`, etiqueta: 'Nota urgencias' };
    }
    if (area === 'hospitalizacion' || serv.includes('hosp')) {
      return { ruta: `/encuentros/${p.id_encuentro}/sinba-14`, etiqueta: 'Nota hosp. (SINBA-14)' };
    }
    if (area === 'tococirugia' || area === 'obstetricia' || serv.includes('toco') || serv.includes('parto')) {
      return { ruta: `/encuentros/${p.id_encuentro}/partograma`, etiqueta: 'Partograma' };
    }
    if (area === 'admision') {
      return { ruta: `/encuentros/${p.id_encuentro}/hoja-frontal`, etiqueta: 'Hoja frontal' };
    }
    if (area === 'pediatria' || serv.includes('pediat')) {
      return { ruta: `/encuentros/${p.id_encuentro}/hc-pediatrica`, etiqueta: 'HC pediátrica' };
    }
    if (area === 'consulta_externa' || area === 'consulta' || serv.includes('consulta')) {
      return { ruta: `/encuentros/${p.id_encuentro}/historia-clinica`, etiqueta: 'Historia clínica' };
    }
    return { ruta: `/encuentros/${p.id_encuentro}/hoja-frontal`, etiqueta: 'Hoja frontal' };
  }

  // Helper para renderizar badge de área institucional con acentos correctos
  function renderBadgeArea(areaRaw: string) {
    const a = (areaRaw || '').toLowerCase();
    let label = 'Admisión';
    let bg = '#e0f2fe';
    let color = '#0369a1';

    if (a === 'urgencias') {
      label = 'Urgencias';
      bg = '#fee2e2';
      color = '#b91c1c';
    } else if (a === 'hospitalizacion' || a === 'piso') {
      label = 'Hospitalización';
      bg = '#fef3c7';
      color = '#b45309';
    } else if (a === 'tococirugia' || a === 'obstetricia') {
      label = 'Tococirugía';
      bg = '#f3e8ff';
      color = '#7e22ce';
    } else if (a === 'pediatria') {
      label = 'Pediatría';
      bg = '#ecfdf5';
      color = '#047857';
    } else if (a === 'consulta_externa' || a === 'consulta') {
      label = 'Consulta externa';
      bg = '#e0f2fe';
      color = '#0284c7';
    } else if (a === 'admision') {
      label = 'Admisión';
      bg = '#e0f2fe';
      color = '#0369a1';
    } else {
      label = (areaRaw || '').replace(/_/g, ' ').toUpperCase();
    }

    return (
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
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 50 }}>
      {/* ============================================================ */}
      {/* 1. HERO BANNER INSTITUCIONAL CON ESTADO DEL TURNO Y HORA    */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f3f2f 0%, #17543f 55%, #1e3a8a 100%)',
          color: '#ffffff',
          borderRadius: 14,
          padding: '24px 28px',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(15, 63, 47, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -30,
            bottom: -30,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />

        {/* Lado izquierdo: Bienvenida, Nombre, Rol e Institución */}
        <div style={{ flex: '1 1 340px', minWidth: 280, zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 10,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Building2 size={13} style={{ color: '#6ee7b7' }} />
            <span>Hospital General San Felipe del Progreso • IMSS Bienestar</span>
          </div>

          <h1
            style={{
              margin: '0 0 6px',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: -0.5,
              color: '#ffffff',
            }}
          >
            {getSaludo(currentTime)}, {user?.nombre || user?.username}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                background: '#34d399',
                color: '#064e3b',
                padding: '3px 12px',
                borderRadius: 12,
                letterSpacing: 0.3,
              }}
            >
              {user?.rol === 'admin' && 'Administración'}
              {user?.rol === 'medico' && 'Médico tratante'}
              {user?.rol === 'admision' && 'Admisión continua'}
              {user?.rol === 'enfermeria' && 'Enfermería de piso'}
              {!['admin', 'medico', 'admision', 'enfermeria'].includes(user?.rol || '') && user?.rol}
            </span>

            <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.82)' }}>
              Expediente clínico digital — Cumplimiento oficial NOM-004-SSA3-2012
            </span>
          </div>
        </div>

        {/* Lado derecho: Tarjeta de Turno, Fecha y Reloj Digital */}
        <div
          style={{
            zIndex: 1,
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 12,
            padding: '14px 20px',
            backdropFilter: 'blur(8px)',
            minWidth: 260,
            textAlign: 'right',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 20,
                background: turno.bg,
                border: `1px solid ${turno.border}`,
                color: turno.color,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              <TurnoIcon size={14} />
              <span>{turno.nombre}</span>
              <span style={{ opacity: 0.8, fontSize: 10.5, fontWeight: 500 }}>({turno.horario})</span>
            </div>
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              fontFamily: 'monospace',
              letterSpacing: 1,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {horaFormateada}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.85)',
              textTransform: 'capitalize',
            }}
          >
            <Calendar size={13} style={{ color: '#6ee7b7' }} />
            <span>{fechaFormateada}</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MÉTRICAS CLAVE (4 TARJETAS UNIFORMES PARA TODOS LOS ROLES) */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Tarjeta 1: En Atención Activa */}
        <div
          className="card"
          onClick={() => setAreaSeleccionada('todos')}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: areaSeleccionada === 'todos' ? '2px solid #0f3f2f' : '1px solid var(--border)',
            background: areaSeleccionada === 'todos' ? 'rgba(15, 63, 47, 0.04)' : '#ffffff',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', letterSpacing: 0.2 }}>
              En atención activa
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f3f2f' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f3f2f', lineHeight: 1.1 }}>
            {loading ? '--' : conteosPorArea.todos}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
            Pacientes con encuentro abierto
          </div>
        </div>

        {/* Tarjeta 2: Urgencias / Triage */}
        <div
          className="card"
          onClick={() => setAreaSeleccionada('urgencias')}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: areaSeleccionada === 'urgencias' ? '2px solid #dc2626' : '1px solid var(--border)',
            background: areaSeleccionada === 'urgencias' ? '#fef2f2' : '#ffffff',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', letterSpacing: 0.2 }}>
              Urgencias / triage
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>
            {loading ? '--' : conteosPorArea.urgencias}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
            Pacientes en atención inmediata
          </div>
        </div>

        {/* Tarjeta 3: Hospitalización */}
        <div
          className="card"
          onClick={() => setAreaSeleccionada('hospitalizacion')}
          style={{
            padding: '16px 20px',
            cursor: 'pointer',
            border: areaSeleccionada === 'hospitalizacion' ? '2px solid #d97706' : '1px solid var(--border)',
            background: areaSeleccionada === 'hospitalizacion' ? '#fffbeb' : '#ffffff',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', letterSpacing: 0.2 }}>
              Hospitalización
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Bed size={18} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>
            {loading ? '--' : conteosPorArea.hospitalizacion}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
            Camas en piso ocupadas
          </div>
        </div>

        {/* Tarjeta 4: Según perfil (Admisión, Tococirugía o Expedientes Totales) */}
        {isAdmision ? (
          <div
            className="card"
            onClick={() => setAreaSeleccionada('admision')}
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              border: areaSeleccionada === 'admision' ? '2px solid #0284c7' : '1px solid var(--border)',
              background: areaSeleccionada === 'admision' ? '#f0f9ff' : '#ffffff',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', letterSpacing: 0.2 }}>
                Admisión continua
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <FileText size={18} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0369a1', lineHeight: 1.1 }}>
              {loading ? '--' : conteosPorArea.admision}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
              Pacientes en proceso de ingreso
            </div>
          </div>
        ) : (isMedico || isEnfermeria) ? (
          <div
            className="card"
            onClick={() => setAreaSeleccionada('tococirugia')}
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              border: areaSeleccionada === 'tococirugia' ? '2px solid #7e22ce' : '1px solid var(--border)',
              background: areaSeleccionada === 'tococirugia' ? '#faf5ff' : '#ffffff',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', letterSpacing: 0.2 }}>
                Tococirugía
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7e22ce' }}>
                <Baby size={18} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#7e22ce', lineHeight: 1.1 }}>
              {loading ? '--' : conteosPorArea.tococirugia}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
              Labor de parto y recuperación
            </div>
          </div>
        ) : (
          <div
            className="card"
            onClick={() => navigate('/pacientes')}
            style={{
              padding: '16px 20px',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', letterSpacing: 0.2 }}>
                Expedientes totales
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <FileText size={18} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0369a1', lineHeight: 1.1 }}>
              {loading ? '--' : metricas.total_pacientes}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>
              Padrón histórico de pacientes
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. CENSO ACTIVO DE PACIENTES CON BUSCADOR ÚNICO              */}
      {/* ============================================================ */}
      <div className="card" style={{ padding: 20 }}>
        {/* Cabecera del Censo */}
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
                Censo: {getNombreAreaActiva(areaSeleccionada)}
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
              Pacientes en atención activa catalogados en este servicio clínico del hospital.
            </p>
          </div>

          {/* Buscador único y acciones directas */}
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
                value={filtroAreaTexto}
                onChange={(e) => setFiltroAreaTexto(e.target.value)}
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
              {filtroAreaTexto && (
                <X
                  size={14}
                  style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                  onClick={() => setFiltroAreaTexto('')}
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

            <Link
              to={`/areas/${areaSeleccionada === 'todos' ? 'todas' : areaSeleccionada}`}
              className="btn btn-outline"
              style={{
                fontSize: 12,
                padding: '7px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Vista completa</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Pestañas de filtrado por servicio (reemplazo limpio de las 9 cajas grandes) */}
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
                onClick={() => setAreaSeleccionada(tab.id)}
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

        {/* Tabla de Pacientes Catalogados */}
        {pacientesFiltrados.length > 0 ? (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Expediente</th>
                    <th>Paciente</th>
                    <th style={{ width: 130 }}>Edad / sexo</th>
                    <th style={{ width: 150 }}>Área / cama</th>
                    <th style={{ width: 140 }}>Fecha de ingreso</th>
                    <th style={{ textAlign: 'center', width: isAdmision ? 320 : 260 }}>
                      {isAdmision ? 'Formatos de ingreso (aviso / consentimiento / frontal)' : isEnfermeria ? 'Acciones de enfermería' : 'Acciones clínicas'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const LIMITE_DASHBOARD = 5;
                    const tieneMasDeCinco = pacientesFiltrados.length > LIMITE_DASHBOARD;
                    const visibles = (mostrarTodosDashboard || !tieneMasDeCinco)
                      ? pacientesFiltrados
                      : pacientesFiltrados.slice(0, LIMITE_DASHBOARD);

                    return visibles.map((p) => {
                      const moduloInfo = getRutaModuloClinico(p);
                      return (
                        <tr key={p.id_encuentro}>
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
                            {p.curp && (
                              <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--text-light)', marginTop: 2 }}>
                                {p.curp}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: 12 }}>
                              {calcularEdad(p.fecha_nacimiento)} • {p.sexo === 'M' ? 'Masc' : 'Fem'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {renderBadgeArea(p.area_ingreso)}
                              {p.cama_asignada && (
                                <span style={{ fontSize: 11, color: '#0f3f2f', fontWeight: 600 }}>
                                  • {p.cama_asignada}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                            {p.fecha_hora_ingreso
                              ? new Date(p.fecha_hora_ingreso).toLocaleString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '--'}
                          </td>
                          <td>
                            {/* Botones de acción específicos según el rol */}
                            {isAdmision ? (
                              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Link
                                  to={`/encuentros/${p.id_encuentro}/aviso-privacidad`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Aviso de Privacidad (LGPDPPSO)"
                                >
                                  <ShieldCheck size={12} color="#0f3f2f" /> Aviso
                                </Link>
                                <Link
                                  to={`/encuentros/${p.id_encuentro}/consentimiento`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Carta de Consentimiento Informado"
                                >
                                  <FileText size={12} color="#0f3f2f" /> Consentimiento
                                </Link>
                                <Link
                                  to={`/encuentros/${p.id_encuentro}/hoja-frontal`}
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Hoja Frontal del Expediente"
                                >
                                  <FileSpreadsheet size={12} color="#0f3f2f" /> Frontal
                                </Link>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/pacientes/${p.id_paciente}`)}
                                  title="Ver expediente completo"
                                >
                                  <Eye size={12} /> Ver
                                </button>
                              </div>
                            ) : isEnfermeria ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#0284c7', borderColor: '#0284c7' }}
                                  onClick={() => navigate(`/encuentros/${p.id_encuentro}/indicaciones`)}
                                  title="Ver hoja de indicaciones médicas y medicamentos"
                                >
                                  <FileText size={12} /> Indicaciones
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/encuentros/${p.id_encuentro}/evolucion`)}
                                  title="Registrar signos vitales y notas de evolución"
                                >
                                  <Activity size={12} /> Evolución
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/pacientes/${p.id_paciente}`)}
                                  title="Ver expediente completo"
                                >
                                  <Eye size={12} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={() => navigate(`/pacientes/${p.id_paciente}`)}
                                  title="Ver expediente clínico completo"
                                >
                                  <Eye size={12} /> Expediente
                                </button>

                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    fontSize: 11,
                                    padding: '4px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    borderColor: '#cbd5e1',
                                  }}
                                  onClick={() => navigate(moduloInfo.ruta)}
                                  title={`Abrir formato oficial de ${moduloInfo.etiqueta}`}
                                >
                                  <Stethoscope size={12} /> {moduloInfo.etiqueta}
                                </button>

                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    fontSize: 11,
                                    padding: '4px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    borderColor: '#cbd5e1',
                                  }}
                                  onClick={() => navigate(`/encuentros/${p.id_encuentro}/evolucion`)}
                                  title="Nueva Nota de Evolución (SOAP)"
                                >
                                  <FileText size={12} /> Evolución
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Botón Ver Más cuando se llega a 5 filas */}
            {pacientesFiltrados.length > 5 && (
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
                    Mostrando <strong>{mostrarTodosDashboard ? pacientesFiltrados.length : 5}</strong> de <strong>{pacientesFiltrados.length}</strong> pacientes activos
                  </span>
                  {!mostrarTodosDashboard && (
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
                      +{pacientesFiltrados.length - 5} más
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarTodosDashboard(!mostrarTodosDashboard)}
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
                  {mostrarTodosDashboard ? (
                    <>
                      <ChevronUp size={16} /> Ver menos (mostrar 5)
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} /> Ver más pacientes ({pacientesFiltrados.length - 5} restantes)
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
              No hay pacientes en atención activa en esta área
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 14 }}>
              {filtroAreaTexto
                ? 'No se encontraron pacientes que coincidan con la búsqueda.'
                : 'Puedes registrar un nuevo paciente o crear un encuentro hospitalario desde Admisión.'}
            </div>
            <Link to="/pacientes/nuevo" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, textDecoration: 'none' }}>
              <UserPlus size={14} /> Registrar nuevo paciente
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
