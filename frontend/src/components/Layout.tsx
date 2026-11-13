import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsModal from './NotificationsModal';
import CredencialesModal from './CredencialesModal';
import CambioPasswordObligatorioModal from './CambioPasswordObligatorioModal';
import { notificacionesApi } from '../services/api';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  FileText,
  Activity,
  Baby,
  Bed,
  Stethoscope,
  Layers,
  Sliders,
  UserCheck,
  HeartPulse,
  Bell,
  KeyRound,
} from 'lucide-react';

export default function Layout() {
  const { user, logout, loggingOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [credencialesOpen, setCredencialesOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const userRole = (user?.rol || '').toLowerCase();
  const isAdmision = userRole === 'admision';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    let isMounted = true;
    async function checkNotificaciones() {
      try {
        const res = await notificacionesApi.getNotificaciones();
        if (res.success && isMounted) {
          setNotifCount(res.no_leidas || 0);
        }
      } catch {
      }
    }
    checkNotificaciones();
    const interval = setInterval(checkNotificaciones, 30000);
    const handleFocus = () => checkNotificaciones();
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Cerrar menú y reiniciar scroll del panel derecho al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Manejar tecla Escape y bloqueo de scroll de fondo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    try {
      await logout(async () => {
        // Pausa suave para permitir visualizar la transición de salida segura
        await new Promise((resolve) => setTimeout(resolve, 220));
      });
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  function getRolLabel(rol?: string) {
    const r = (rol || '').toLowerCase();
    if (r === 'admin') return 'Administración';
    if (r === 'medico') return 'Médico Tratante';
    if (r === 'admision') return 'Admisión y Archivo';
    if (r === 'enfermeria') return 'Enfermería de Piso';
    if (r === 'laboratorio') return 'Laboratorio y Gabinete';
    if (r === 'obstetricia') return 'Obstetricia';
    if (r === 'pediatria') return 'Pediatría';
    return rol || 'Personal Hospitalario';
  }

  return (
    <div className={`app-layout ${mobileMenuOpen ? 'menu-open' : ''} ${loggingOut ? 'is-logging-out' : ''}`}>
      {/* Overlay de salida suave e institucional */}
      {loggingOut && (
        <div className="logout-transition-overlay" role="status" aria-live="polite">
          <div className="logout-transition-card">
            <div className="logout-transition-icon-wrap">
              <div className="logout-transition-spinner" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f3f2f' }}>
              Cerrando sesión de forma segura...
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
              Hospital General San Felipe del Progreso • Finalizando acceso
            </div>
          </div>
        </div>
      )}
      {/* Mobile Top Header (visible solo en <= 900px) */}
      <header className="mobile-header">
        <button
          className="menu-toggle-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={22} />
        </button>

        <div className="mobile-brand">
          <div style={{ background: '#ffffff', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
            <img
              src="/imss-bienestar-logo.png"
              alt="IMSS Bienestar"
              className="mobile-brand-logo"
              style={{ height: 26, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div className="mobile-brand-text">
            <h2>Expediente clínico</h2>
            <span>H.G. San Felipe del Progreso</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label="Notificaciones"
            title="Notificaciones"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#ffffff',
                  borderRadius: 10,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 4px',
                  minWidth: 14,
                  textAlign: 'center',
                  lineHeight: '12px',
                }}
              >
                {notifCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCredencialesOpen(true)}
            aria-label="Actualizar credenciales"
            title="Actualizar credenciales"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <KeyRound size={16} />
          </button>

          <div
            className="mobile-user-badge"
            title={user?.nombre || user?.username}
            onClick={() => setCredencialesOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            {(user?.nombre || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#fca5a5',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-header" style={{ position: 'relative', textAlign: 'center' }}>
          <button
            className="close-menu-btn"
            onClick={closeMenu}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div
              style={{
                background: '#ffffff',
                padding: '5px 14px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '92%',
              }}
            >
              <img
                src="/imss-bienestar-logo.png"
                alt="Logo IMSS Bienestar"
                style={{
                  height: 28,
                  width: 'auto',
                  maxWidth: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
          <h2>Expediente clínico</h2>
          <p>H.G. San Felipe del Progreso</p>
        </div>

        <nav className="sidebar-nav">
          {/* 1. SECCIÓN PRINCIPAL */}
          <div className="nav-section">Principal</div>
          <NavLink to="/" end onClick={closeMenu}>
            <LayoutDashboard size={17} style={{ flexShrink: 0 }} />
            <span>Panel principal</span>
          </NavLink>

          {/* 2. PACIENTES Y ARCHIVO */}
          <div className="nav-section">Pacientes y archivo</div>
          <NavLink
            to="/pacientes"
            end
            className={({ isActive }) =>
              isActive || (location.pathname.startsWith('/pacientes/') && !location.pathname.startsWith('/pacientes/nuevo'))
                ? 'active'
                : ''
            }
            onClick={closeMenu}
          >
            <Users size={17} style={{ flexShrink: 0 }} />
            <span>Padrón de pacientes</span>
          </NavLink>
          {(isAdmin || isAdmision) && (
            <NavLink to="/pacientes/nuevo" end onClick={closeMenu}>
              <UserPlus size={17} style={{ flexShrink: 0 }} />
              <span>Nuevo paciente</span>
            </NavLink>
          )}

          {/* 3. SERVICIOS MÉDICOS (Disponible para todos los roles del hospital) */}
          <div className="nav-section">Servicios médicos</div>
          <NavLink to="/areas/admision" end onClick={closeMenu}>
            <FileText size={17} style={{ flexShrink: 0 }} />
            <span>Admisión continua</span>
          </NavLink>
          <NavLink to="/areas/urgencias" end onClick={closeMenu}>
            <Activity size={17} style={{ flexShrink: 0 }} />
            <span>Urgencias y triage</span>
          </NavLink>
          <NavLink to="/areas/hospitalizacion" end onClick={closeMenu}>
            <Bed size={17} style={{ flexShrink: 0 }} />
            <span>Hospitalización</span>
          </NavLink>
          <NavLink to="/areas/consulta_externa" end onClick={closeMenu}>
            <Stethoscope size={17} style={{ flexShrink: 0 }} />
            <span>Consulta externa</span>
          </NavLink>
          <NavLink to="/areas/tococirugia" end onClick={closeMenu}>
            <Baby size={17} style={{ flexShrink: 0 }} />
            <span>Tococirugía</span>
          </NavLink>
          <NavLink to="/areas/pediatria" end onClick={closeMenu}>
            <HeartPulse size={17} style={{ flexShrink: 0 }} />
            <span>Pediatría</span>
          </NavLink>
          <NavLink to="/areas/todas" end onClick={closeMenu}>
            <Layers size={17} style={{ flexShrink: 0 }} />
            <span>Todas las áreas</span>
          </NavLink>

          {/* 4. GESTIÓN Y SISTEMA (Exclusivo Administración) */}
          {isAdmin && (
            <>
              <div className="nav-section">Gestión y sistema</div>
              <NavLink to="/personal-medico" end onClick={closeMenu}>
                <UserCheck size={17} style={{ flexShrink: 0 }} />
                <span>Plantilla médica</span>
              </NavLink>
              <NavLink to="/configuracion" end onClick={closeMenu}>
                <Sliders size={17} style={{ flexShrink: 0 }} />
                <span>Membrete y logos</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div
              onClick={() => setCredencialesOpen(true)}
              title="Clic para actualizar mis credenciales"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(110, 231, 183, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12.5,
                color: '#6ee7b7',
                border: '1px solid rgba(110, 231, 183, 0.35)',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {(user?.nombre || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div
              onClick={() => setCredencialesOpen(true)}
              title="Clic para actualizar mis credenciales"
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            >
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.nombre || user?.username}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: '#6ee7b7',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {getRolLabel(user?.rol)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCredencialesOpen(true)}
              aria-label="Actualizar credenciales"
              title="Actualizar credenciales"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.09)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.32)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
            >
              <KeyRound size={14} />
            </button>
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              aria-label="Notificaciones"
              title="Notificaciones"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'rgba(255, 255, 255, 0.09)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.32)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
            >
              <Bell size={15} />
              {notifCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: 10,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 4px',
                    minWidth: 14,
                    textAlign: 'center',
                    lineHeight: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {notifCount}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              transition: 'all 0.18s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.color = '#f8fafc';
            }}
          >
            <LogOut size={14} /> {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="main-content">
        <Outlet />
      </main>

      <NotificationsModal
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUpdateCount={setNotifCount}
      />

      <CredencialesModal
        isOpen={credencialesOpen}
        onClose={() => setCredencialesOpen(false)}
      />

      <CambioPasswordObligatorioModal />
    </div>
  );
}
