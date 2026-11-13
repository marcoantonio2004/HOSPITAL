import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificacionesApi } from '../../services/api';
import { 
  Lock, 
  User, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  FileText, 
  ShieldCheck, 
  Activity,
  HelpCircle,
  X,
  CheckCircle2,
  Send,
  Info
} from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMotivo, setForgotMotivo] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotTab, setForgotTab] = useState<'solicitud' | 'info'>('solicitud');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password, async () => {
        setIsSuccess(true);
        setIsExiting(true);
        // Breve retardo para permitir una transición visual fluida de la tarjeta antes del cambio de vista
        await new Promise((resolve) => setTimeout(resolve, 240));
      });
    } catch (err: any) {
      setIsSuccess(false);
      setIsExiting(false);
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenForgotModal() {
    setForgotUsername(username.trim());
    setForgotMotivo('');
    setForgotSuccess(null);
    setForgotError(null);
    setForgotTab('solicitud');
    setShowForgotModal(true);
  }

  async function handleEnviarSolicitud(e: FormEvent) {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setForgotError('Ingresa tu usuario o matrícula institucional.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      const res = await notificacionesApi.solicitarRestablecimiento(
        forgotUsername.trim(),
        forgotMotivo.trim() || undefined
      );
      if (res.success) {
        setForgotSuccess(res.message);
      } else {
        setForgotError(res.message || 'Error al procesar la solicitud.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'No se pudo comunicar con el servidor.');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="login-unified-container">
      {/* ========================================================
          LIENZO DE FONDO INSTITUCIONAL (FOTOGRAFÍA + DIFUMINADO + CURVAS)
          ======================================================== */}
      <div className="bg-canvas-wrapper" aria-hidden="true">
        {/* Fotografía de la fachada institucional (sin cortes, difuminado continuo) */}
        <div className="bg-photo-layer" />

        {/* Velo de transición suave hacia el fondo clínico */}
        <div className="bg-right-soft-wash" />

        {/* Curvas SVG Orgánicas Institucionales */}
        <svg
          className="bg-wave-svg"
          viewBox="0 0 1600 800"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="accentDropShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="-2" dy="-5" stdDeviation="8" floodColor="#00140e" floodOpacity="0.20" />
            </filter>
            <filter id="mainDropShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="-2" dy="-8" stdDeviation="12" floodColor="#00140e" floodOpacity="0.30" />
            </filter>
          </defs>

          {/* Capa Suave Menta */}
          <path
            d="M 0,140 C 380,220 680,470 960,800 L 0,800 Z"
            fill="#2d8b68"
            opacity="0.32"
          />

          {/* Capa Intermedia: Esmeralda Clínico */}
          <path
            d="M 0,180 C 350,260 630,510 900,800 L 0,800 Z"
            fill="#087F5B"
            filter="url(#accentDropShadow)"
            opacity="0.94"
          />

          {/* Capa Frontal: Verde Oscuro Institucional */}
          <path
            d="M 0,220 C 320,300 580,540 840,800 L 0,800 Z"
            fill="#004D35"
            filter="url(#mainDropShadow)"
          />
        </svg>

        {/* Marcas de agua médicas sutiles */}
        <div className="canvas-medical-cross-green" />
        <div className="canvas-medical-cross-light" />
      </div>

      {/* ========================================================
          ENCABEZADO OFICIAL SUPERIOR: CÁPSULA INSTITUCIONAL
          ======================================================== */}
      <header className="unified-top-bar">
        <div className="hero-top-logos-card">
          <div className="top-logo-item">
            <img
              src="/logo_edomex.png"
              alt="Gobierno del Estado de México"
              className="top-logo-edomex"
            />
          </div>

          <div className="top-logos-divider" />

          <div className="top-logo-item">
            <img
              src="/imss-bienestar-logo.png"
              alt="IMSS Bienestar"
              className="top-logo-imss"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo_imss_bienestar.png';
              }}
            />
          </div>

          <div className="top-logos-divider" />

          <div className="top-hospital-text">
            <span className="top-hosp-name">HOSPITAL GENERAL SAN FELIPE DEL PROGRESO</span>
            <span className="top-hosp-slogan">Comprometidos con tu salud</span>
          </div>
        </div>
      </header>

      {/* ========================================================
          ÁREA PRINCIPAL: DOS SECCIONES EQUILIBRADAS Y ARMONIOSAS
          ======================================================== */}
      <main className="unified-main-content">
        
        {/* Sección Izquierda: Identidad y Marco Normativo sobre la curva verde */}
        <div className="unified-left-info">
          <div className="wave-icon-box">
            <FileText size={28} strokeWidth={2.2} />
          </div>

          <div className="wave-text-block">
            <h3>
              Sistema integral para la gestión<br />
              de expedientes clínicos
            </h3>
            <p>
              Acceso seguro para el personal autorizado del Hospital General de San Felipe del Progreso.
            </p>

            <div className="wave-norm-tag">
              <ShieldCheck size={14} className="norm-shield-icon" />
              <span>NOM-004-SSA3-2012 • NOM-024-SSA3-2012</span>
            </div>
          </div>
        </div>

        {/* Sección Derecha: Tarjeta de Acceso Limpia, Centrada y Ergonómica */}
        <div className="unified-card-holder">
          <div className={`clean-login-card ${isExiting ? 'is-exiting' : ''}`}>
            
            {/* Emblema Oficial IMSS-Bienestar */}
            <div className="card-brand-header">
              <div className="card-medical-emblem">
                <img
                  src="/imss_eagle_emblem.png"
                  alt="Logo Oficial IMSS-Bienestar"
                  className="card-imss-logo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/favicon.svg';
                  }}
                />
              </div>
              <span className="card-hospital-label">HOSPITAL GENERAL</span>
              <span className="card-hospital-sublabel">SAN FELIPE DEL PROGRESO</span>
            </div>

            {/* Título de bienvenida y propósito */}
            <div className="card-greeting-block">
              <h1 className="greeting-title">Bienvenido</h1>
              <p className="greeting-subtitle">
                Ingresa con tus credenciales para acceder al sistema de expediente clínico digital.
              </p>
            </div>

            {/* Notificación de Error */}
            {error && (
              <div className="card-error-alert" role="alert">
                <AlertCircle size={16} className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario de Autenticación */}
            <form onSubmit={handleSubmit} className="clean-form-inputs">
              
              {/* Campo: Usuario / Matrícula */}
              <div className="input-group-field">
                <label htmlFor="username" className="input-field-label">
                  Usuario o Matrícula
                </label>
                <div className="clean-input-wrapper">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario institucional"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Campo: Contraseña */}
              <div className="input-group-field">
                <label htmlFor="password" className="input-field-label">
                  Contraseña
                </label>
                <div className="clean-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="clean-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Fila de Utilidades: Recordar sesión y Recuperar clave */}
              <div className="card-form-options">
                <label className="clean-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="clean-checkbox-input"
                  />
                  <span>Recordar sesión</span>
                </label>

                <button
                  type="button"
                  className="card-forgot-link"
                  onClick={handleOpenForgotModal}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón Principal de Inicio de Sesión */}
              <button
                type="submit"
                className={`clean-btn-submit ${isSuccess ? 'is-success' : ''}`}
                disabled={loading || isSuccess}
              >
                {isSuccess ? (
                  <span className="btn-loading-state">
                    <CheckCircle2 size={18} />
                    <span>Acceso autorizado • Ingresando...</span>
                  </span>
                ) : loading ? (
                  <span className="btn-loading-state">
                    <span className="btn-spinner" />
                    <span>Iniciando sesión...</span>
                  </span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>

            {/* Separador de Seguridad y Confidencialidad */}
            <div className="card-security-divider-wrap">
              <div className="card-security-line" />
              <div className="card-security-badge">
                <ShieldCheck size={14} className="security-icon" />
                <span>Acceso exclusivo al personal autorizado</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================
          PIE DE PÁGINA INFERIOR EQUILIBRADO Y PERFECTAMENTE ALINEADO
          ======================================================== */}
      <footer className="unified-bottom-bar">
        <div className="bottom-bar-left">
          <div className="bottom-bar-divider" />
          <div className="motto-content">
            <Activity size={16} className="motto-pulse-icon" />
            <span>Salud &nbsp;|&nbsp; Servicio &nbsp;|&nbsp; Compromiso</span>
          </div>
        </div>

        <div className="bottom-bar-right">
          <span>Hospital General San Felipe del Progreso &nbsp;|&nbsp; Sistema de Expedientes Clínicos &nbsp;|&nbsp; v1.0</span>
        </div>
      </footer>

      {/* ========================================================
          MODAL DE ASISTENCIA: RESTABLECIMIENTO DE CREDENCIALES
          ======================================================== */}
      {showForgotModal && (
        <div className="forgot-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="forgot-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="forgot-modal-header">
              <div className="forgot-modal-icon">
                <HelpCircle size={22} />
              </div>
              <h3>Restablecimiento de credenciales</h3>
              <button
                type="button"
                className="forgot-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="forgot-modal-body">
              <div className="forgot-modal-tabs">
                <button
                  type="button"
                  className={`forgot-modal-tab-btn ${forgotTab === 'solicitud' ? 'active' : ''}`}
                  onClick={() => setForgotTab('solicitud')}
                >
                  <Send size={14} />
                  <span>Solicitud en línea</span>
                </button>
                <button
                  type="button"
                  className={`forgot-modal-tab-btn ${forgotTab === 'info' ? 'active' : ''}`}
                  onClick={() => setForgotTab('info')}
                >
                  <ShieldCheck size={14} />
                  <span>Normativa oficial</span>
                </button>
              </div>

              {forgotTab === 'solicitud' ? (
                forgotSuccess ? (
                  <div className="forgot-alert-success">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <CheckCircle2 size={24} color="#15803d" />
                      <strong style={{ fontSize: 14 }}>Solicitud registrada con éxito</strong>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#14532d' }}>
                      {forgotSuccess}
                    </p>
                    <div style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534' }}>
                      <strong>Instrucciones de acceso posterior:</strong>
                      <div style={{ marginTop: 4 }}>
                        Una vez que la Administración autorice su solicitud, su contraseña será restablecida automáticamente a su nombre de usuario en minúsculas (<strong>@{forgotUsername.trim().toLowerCase()}</strong>).
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
                      De acuerdo con la <strong>NOM-004-SSA3-2012</strong>, ingrese su usuario o matrícula institucional para notificar de inmediato al Departamento de Administración:
                    </p>

                    {forgotError && (
                      <div className="forgot-alert-error">
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <form onSubmit={handleEnviarSolicitud}>
                      <div className="forgot-form-group">
                        <label className="forgot-form-label" htmlFor="forgot-user">
                          Usuario o matrícula institucional
                        </label>
                        <input
                          id="forgot-user"
                          type="text"
                          className="forgot-form-input"
                          placeholder="Ej. marco, mtorres..."
                          value={forgotUsername}
                          onChange={(e) => setForgotUsername(e.target.value)}
                          disabled={forgotLoading}
                          autoFocus
                          required
                        />
                      </div>

                      <div className="forgot-form-group">
                        <label className="forgot-form-label" htmlFor="forgot-motivo">
                          Motivo o área de adscripción (opcional)
                        </label>
                        <input
                          id="forgot-motivo"
                          type="text"
                          className="forgot-form-input"
                          placeholder="Ej. Olvido de clave - Urgencias turno matutino"
                          value={forgotMotivo}
                          onChange={(e) => setForgotMotivo(e.target.value)}
                          disabled={forgotLoading}
                        />
                      </div>

                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          className="forgot-modal-btn-secondary"
                          onClick={() => setShowForgotModal(false)}
                          disabled={forgotLoading}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="forgot-modal-btn"
                          disabled={forgotLoading}
                        >
                          {forgotLoading ? (
                            <>
                              <span className="btn-spinner" />
                              <span>Enviando solicitud...</span>
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              <span>Enviar solicitud a administración</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )
              ) : (
                <div>
                  <p>
                    De acuerdo con la normativa oficial <strong>NOM-004-SSA3-2012</strong> y <strong>NOM-024-SSA3-2012</strong>, por motivos de seguridad médica y confidencialidad del expediente clínico, el restablecimiento de contraseñas es gestionado por:
                  </p>
                  <div className="forgot-modal-info-card">
                    <p><strong>Departamento de Administración y Control de Usuarios</strong></p>
                    <p>Hospital General San Felipe del Progreso</p>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1', fontSize: 12.5, color: '#0f3f2f', lineHeight: 1.45 }}>
                      <strong>Procedimiento institucional:</strong>
                      <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 12 }}>
                        La Administración cuenta con la función oficial para restablecer su contraseña de forma automática asignando su <strong>nombre de usuario</strong> como clave provisional de acceso.
                      </p>
                    </div>
                    <p className="forgot-modal-note" style={{ marginTop: 8 }}>
                      Requisito: Presentar gafete o identificación oficial de la unidad médica.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {(forgotTab === 'info' || (forgotTab === 'solicitud' && forgotSuccess)) && (
              <div className="forgot-modal-footer">
                <button
                  type="button"
                  className="forgot-modal-btn"
                  onClick={() => setShowForgotModal(false)}
                >
                  {forgotSuccess ? 'Volver al acceso' : 'Entendido'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
