import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificacionesApi } from '../services/api';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Clock,
  RotateCcw,
  CheckCheck,
  RefreshCw,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCount?: (count: number) => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  onUpdateCount,
}: NotificationsModalProps) {
  const { user } = useAuth();
  const isAdmin = (user?.rol || '').toLowerCase() === 'admin';

  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'todas' | 'solicitudes'>('todas');
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [solicitudAAtender, setSolicitudAAtender] = useState<any | null>(null);
  const [solicitudARechazar, setSolicitudARechazar] = useState<any | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      cargarDatos();
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }, 260);
  }

  useEffect(() => {
    if (!isRendered) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isClosing) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isClosing]);

  async function cargarDatos() {
    setLoading(true);
    setFeedback(null);
    try {
      const resNotif = await notificacionesApi.getNotificaciones();
      if (resNotif.success) {
        setNotificaciones(resNotif.data || []);
        const unread = resNotif.no_leidas || 0;
        setNoLeidas(unread);
        if (onUpdateCount) onUpdateCount(unread);
      }

      if (isAdmin) {
        const resSol = await notificacionesApi.getSolicitudesPendientes();
        if (resSol.success) {
          const sols = resSol.data || [];
          setSolicitudes(sols);
          if (sols.length > 0 && activeTab === 'todas') {
            setActiveTab('solicitudes');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarcarLeida(id: number) {
    try {
      await notificacionesApi.marcarLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n))
      );
      setNoLeidas((prev) => {
        const nuevo = Math.max(0, prev - 1);
        if (onUpdateCount) onUpdateCount(nuevo);
        return nuevo;
      });
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleMarcarTodasLeidas() {
    try {
      await notificacionesApi.marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
      if (onUpdateCount) onUpdateCount(0);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleConfirmarAtender() {
    if (!solicitudAAtender) return;

    setProcesandoId(solicitudAAtender.id_solicitud);
    setFeedback(null);
    try {
      const res = await notificacionesApi.atenderSolicitud(solicitudAAtender.id_solicitud);
      if (res.success) {
        setFeedback({
          tipo: 'success',
          texto: res.message || `Contraseña de @${solicitudAAtender.username} restablecida con éxito.`,
        });
        setSolicitudAAtender(null);
        await cargarDatos();
      } else {
        setFeedback({
          tipo: 'error',
          texto: res.message || 'No se pudo restablecer la contraseña.',
        });
      }
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.message || 'Error al comunicarse con el servidor.',
      });
    } finally {
      setProcesandoId(null);
    }
  }

  async function handleConfirmarRechazo() {
    if (!solicitudARechazar) return;
    setProcesandoId(solicitudARechazar.id_solicitud);
    setFeedback(null);
    try {
      const res = await notificacionesApi.rechazarSolicitud(
        solicitudARechazar.id_solicitud,
        motivoRechazo.trim() || undefined
      );
      if (res.success) {
        setFeedback({
          tipo: 'success',
          texto: 'Solicitud rechazada.',
        });
        setSolicitudARechazar(null);
        setMotivoRechazo('');
        await cargarDatos();
      }
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.message || 'Error al rechazar solicitud.',
      });
    } finally {
      setProcesandoId(null);
    }
  }

  function formatearFecha(fechaStr?: string) {
    if (!fechaStr) return '';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  }

  if (!isRendered) return null;

  return (
    <div
      className="panel-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: isClosing ? 'panelFadeOut 0.26s ease-in forwards' : 'panelFadeIn 0.26s ease-out forwards',
      }}
      onClick={handleClose}
    >
      <div
        className="panel-drawer"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-6px 0 28px rgba(0, 0, 0, 0.16)',
          animation: isClosing
            ? 'panelSlideOutRight 0.26s cubic-bezier(0.32, 0, 0.67, 0) forwards'
            : 'panelSlideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#e6f4ea',
                color: '#004d35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#004d35' }}>
                Panel de notificaciones
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                Hospital General San Felipe del Progreso
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
              title="Actualizar"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                padding: '7px 8px',
                cursor: 'pointer',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              title="Cerrar"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                padding: '7px 8px',
                cursor: 'pointer',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {isAdmin && (
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('solicitudes')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'solicitudes' ? '#ffffff' : 'transparent',
                color: activeTab === 'solicitudes' ? '#004d35' : '#64748b',
                fontWeight: activeTab === 'solicitudes' ? 700 : 500,
                fontSize: 12.5,
                boxShadow: activeTab === 'solicitudes' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <KeyRound size={14} />
              <span>Solicitudes de restablecimiento</span>
              {solicitudes.length > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {solicitudes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('todas')}
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'todas' ? '#ffffff' : 'transparent',
                color: activeTab === 'todas' ? '#004d35' : '#64748b',
                fontWeight: activeTab === 'todas' ? 700 : 500,
                fontSize: 12.5,
                boxShadow: activeTab === 'todas' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Bell size={14} />
              <span>Notificaciones</span>
              {noLeidas > 0 && (
                <span
                  style={{
                    background: '#004d35',
                    color: '#ffffff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {noLeidas}
                </span>
              )}
            </button>
          </div>
        )}

        {feedback && (
          <div
            style={{
              padding: '10px 16px',
              background: feedback.tipo === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.tipo === 'success' ? '#166534' : '#991b1b',
              borderBottom: `1px solid ${feedback.tipo === 'success' ? '#bbf7d0' : '#fecaca'}`,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {feedback.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.texto}</span>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {isAdmin && activeTab === 'solicitudes' ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Solicitudes pendientes ({solicitudes.length})
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  NOM-004-SSA3-2012
                </div>
              </div>

              {solicitudes.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <ShieldCheck size={36} color="#004d35" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                    Sin solicitudes pendientes
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    No hay solicitudes de restablecimiento de contraseña en este momento.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {solicitudes.map((sol) => (
                    <div
                      key={sol.id_solicitud}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            background: '#e6f4ea',
                            color: '#004d35',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          @{sol.username}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: '#64748b',
                          }}
                        >
                          <Clock size={12} />
                          <span>{formatearFecha(sol.fecha_solicitud)}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        {sol.nombre_solicitante || 'Personal hospitalario'}
                      </div>

                      {(sol.especialidad || sol.cedula_profesional) && (
                        <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                          {sol.especialidad}
                          {sol.cedula_profesional ? ` • Cédula: ${sol.cedula_profesional}` : ''}
                        </div>
                      )}

                      {sol.motivo && (
                        <div
                          style={{
                            background: '#f8fafc',
                            borderLeft: '3px solid #004d35',
                            borderRadius: 4,
                            padding: '6px 8px',
                            marginTop: 8,
                            fontSize: 11.5,
                            color: '#334155',
                          }}
                        >
                          <strong>Reporte:</strong> {sol.motivo}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSolicitudARechazar(sol)}
                          disabled={procesandoId === sol.id_solicitud}
                          style={{
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          onClick={() => setSolicitudAAtender(sol)}
                          disabled={procesandoId === sol.id_solicitud}
                          style={{
                            background: '#004d35',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <RotateCcw size={13} />
                          <span>Restablecer contraseña a @{sol.username}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Historial de notificaciones ({notificaciones.length})
                </div>
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={handleMarcarTodasLeidas}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#004d35',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <CheckCheck size={14} />
                    <span>Marcar todas como leídas</span>
                  </button>
                )}
              </div>

              {notificaciones.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <Bell size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155' }}>
                    No tienes notificaciones
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Las notificaciones institucionales aparecerán en esta sección.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notificaciones.map((n) => {
                    const esPassword = n.tipo === 'password_restablecida';
                    const esSolicitud = n.tipo === 'solicitud_password';
                    const esCambio = n.tipo === 'cambio_credenciales';
                    return (
                      <div
                        key={n.id_notificacion}
                        onClick={() => {
                          if (!n.leida) handleMarcarLeida(n.id_notificacion);
                        }}
                        style={{
                          background: n.leida ? '#ffffff' : '#f0fdf4',
                          border: `1px solid ${n.leida ? '#e2e8f0' : '#bbf7d0'}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: esPassword
                                ? '#e6f4ea'
                                : esSolicitud
                                ? '#fef3c7'
                                : esCambio
                                ? '#e0f2fe'
                                : '#f1f5f9',
                              color: esPassword
                                ? '#004d35'
                                : esSolicitud
                                ? '#d97706'
                                : esCambio
                                ? '#0369a1'
                                : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {esPassword ? (
                              <KeyRound size={16} />
                            ) : esSolicitud ? (
                              <RotateCcw size={16} />
                            ) : esCambio ? (
                              <ShieldCheck size={16} />
                            ) : (
                              <Bell size={16} />
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: n.leida ? 600 : 700,
                                  color: '#0f172a',
                                }}
                              >
                                {n.titulo}
                              </div>
                              {!n.leida && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#004d35',
                                    flexShrink: 0,
                                  }}
                                  title="No leída"
                                />
                              )}
                            </div>

                            <p
                              style={{
                                margin: '4px 0 6px',
                                fontSize: 12.5,
                                color: '#334155',
                                lineHeight: 1.45,
                              }}
                            >
                              {n.mensaje}
                            </p>

                            <div
                              style={{
                                fontSize: 11,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Clock size={11} />
                              <span>{formatearFecha(n.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            Normas NOM-004-SSA3-2012 y NOM-024-SSA3-2012
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: '#004d35',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              padding: '7px 18px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {solicitudAAtender && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            if (!procesandoId) setSolicitudAAtender(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 25px 50px -12px rgba(0, 77, 53, 0.28)',
              border: '1px solid #bbf7d0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: '#ecfdf5',
                padding: '16px 20px',
                borderBottom: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#dcfce7',
                    color: '#004d35',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#004d35' }}>
                    Restablecer credenciales de acceso
                  </h4>
                  <div style={{ fontSize: 11.5, color: '#047857' }}>
                    Hospital General San Felipe del Progreso
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSolicitudAAtender(null)}
                disabled={procesandoId === solicitudAAtender.id_solicitud}
                aria-label="Cerrar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#1e293b', lineHeight: 1.5 }}>
                ¿Desea restablecer la contraseña del usuario institucional conforme a la normativa oficial <strong>NOM-004-SSA3-2012</strong> y <strong>NOM-024-SSA3-2012</strong>?
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span
                    style={{
                      background: '#e6f4ea',
                      color: '#004d35',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    @{solicitudAAtender.username}
                  </span>
                  {solicitudAAtender.fecha_solicitud && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      {formatearFecha(solicitudAAtender.fecha_solicitud)}
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  {solicitudAAtender.nombre_solicitante || 'Personal hospitalario'}
                </div>

                {(solicitudAAtender.especialidad || solicitudAAtender.cedula_profesional) && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {solicitudAAtender.especialidad}
                    {solicitudAAtender.cedula_profesional ? ` • Cédula: ${solicitudAAtender.cedula_profesional}` : ''}
                  </div>
                )}

                {solicitudAAtender.motivo && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px dashed #cbd5e1',
                      fontSize: 12,
                      color: '#334155',
                    }}
                  >
                    <strong>Motivo reportado:</strong> {solicitudAAtender.motivo}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 14,
                  fontSize: 12.5,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <div>
                  Nueva contraseña asignada:{' '}
                  <strong style={{ fontFamily: 'monospace', fontSize: 13, color: '#004d35' }}>
                    {solicitudAAtender.username.toLowerCase()}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#92400e',
                  lineHeight: 1.45,
                }}
              >
                <strong>Protocolo de acceso institucional:</strong> El personal podrá ingresar de inmediato al sistema utilizando su nombre de usuario como clave de acceso. Se emitirá una notificación automática a su cuenta.
              </div>
            </div>

            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setSolicitudAAtender(null)}
                disabled={procesandoId === solicitudAAtender.id_solicitud}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAtender}
                disabled={procesandoId === solicitudAAtender.id_solicitud}
                style={{
                  background: '#004d35',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 22px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                {procesandoId === solicitudAAtender.id_solicitud ? (
                  <span>Restableciendo...</span>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirmar y restablecer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudARechazar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            if (!procesandoId) setSolicitudARechazar(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #fecaca',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: '#fef2f2',
                padding: '16px 20px',
                borderBottom: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#991b1b' }}>
                    Rechazar solicitud de restablecimiento
                  </h4>
                  <div style={{ fontSize: 11.5, color: '#b91c1c' }}>
                    Hospital General San Felipe del Progreso
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSolicitudARechazar(null)}
                disabled={procesandoId === solicitudARechazar.id_solicitud}
                aria-label="Cerrar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#334155', lineHeight: 1.5 }}>
                ¿Está seguro de rechazar la solicitud de restablecimiento para el usuario{' '}
                <strong style={{ color: '#0f172a' }}>@{solicitudARechazar.username}</strong> ({solicitudARechazar.nombre_solicitante})?
              </p>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: 4,
                  }}
                >
                  Motivo institucional del rechazo (opcional)
                </label>
                <textarea
                  rows={3}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Indique el motivo por el cual no procede..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 11.5,
                  color: '#64748b',
                  lineHeight: 1.4,
                }}
              >
                Nota: Se enviará una notificación oficial al usuario indicándole acudir personalmente con identificación oficial.
              </div>
            </div>

            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid #e2e8f0',
                background: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setSolicitudARechazar(null)}
                disabled={procesandoId === solicitudARechazar.id_solicitud}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRechazo}
                disabled={procesandoId === solicitudARechazar.id_solicitud}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {procesandoId === solicitudARechazar.id_solicitud ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
