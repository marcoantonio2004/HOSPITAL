import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import { useToast } from './Toast';
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface CredencialesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CredencialesModal({ isOpen, onClose }: CredencialesModalProps) {
  const { user, updateCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [verPasswordActual, setVerPasswordActual] = useState(false);
  const [verNuevaPassword, setVerNuevaPassword] = useState(false);
  const [verConfirmarPassword, setVerConfirmarPassword] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      setUsername(user?.username || '');
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
      setVerPasswordActual(false);
      setVerNuevaPassword(false);
      setVerConfirmarPassword(false);
      setErrorLocal(null);
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  function handleClose() {
    if (guardando || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }, 240);
  }

  useEffect(() => {
    if (!isRendered) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isClosing && !guardando) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isClosing, guardando]);

  function getRolLabel(rol?: string) {
    switch ((rol || '').toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'medico':
        return 'Médico tratante';
      case 'enfermeria':
        return 'Enfermería';
      case 'admision':
        return 'Admisión y archivo';
      default:
        return rol || 'Usuario institucional';
    }
  }

  const tiene8Caracteres = nuevaPassword.trim().length >= 8;
  const tieneNumeroOMayuscula = /[A-Z0-9]/.test(nuevaPassword.trim());
  const coincidenPasswords = confirmarPassword.trim().length > 0 && nuevaPassword.trim() === confirmarPassword.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorLocal(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanActual = passwordActual.trim();
    const cleanNueva = nuevaPassword.trim();
    const cleanConfirmar = confirmarPassword.trim();

    if (!cleanActual) {
      setErrorLocal('Debe ingresar su contraseña actual para autorizar la actualización.');
      return;
    }

    if (!cleanNueva) {
      setErrorLocal('El cambio de contraseña es obligatorio. Ingrese una nueva contraseña.');
      return;
    }

    if (cleanNueva.length < 8) {
      setErrorLocal('La nueva contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }

    if (!/[A-Z0-9]/.test(cleanNueva)) {
      setErrorLocal('La nueva contraseña debe incluir al menos un número o una letra mayúscula.');
      return;
    }

    if (!cleanConfirmar) {
      setErrorLocal('Debe confirmar la nueva contraseña.');
      return;
    }

    if (cleanNueva !== cleanConfirmar) {
      setErrorLocal('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    const usernameCambio = cleanUsername !== (user?.username || '').toLowerCase();
    if (usernameCambio) {
      if (cleanUsername.length < 3) {
        setErrorLocal('El nombre de usuario debe contener un mínimo de 3 caracteres.');
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
        setErrorLocal('El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.');
        return;
      }
    }

    setGuardando(true);
    try {
      const payload: { username?: string; password_actual: string; nueva_password: string } = {
        password_actual: cleanActual,
        nueva_password: cleanNueva,
      };

      if (usernameCambio) {
        payload.username = cleanUsername;
      }

      const res = await auth.actualizarCredenciales(payload);
      if (res.success) {
        if (usernameCambio && res.data?.username) {
          updateCurrentUser({ username: res.data.username });
        }
        showToast('Credenciales actualizadas exitosamente', 'success');
        handleClose();
      } else {
        setErrorLocal(res.error || res.message || 'No se pudieron actualizar las credenciales.');
      }
    } catch (err: any) {
      setErrorLocal(err.message || 'Error de conexión al actualizar las credenciales.');
    } finally {
      setGuardando(false);
    }
  }

  if (!isRendered) return null;

  return (
    <div
      className="modal-animated-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: 16,
        animation: isClosing ? 'panelFadeOut 0.24s ease-in forwards' : 'panelFadeIn 0.24s ease-out forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) handleClose();
      }}
    >
      <div
        className="card modal-animated-card"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: isClosing
            ? 'modalSlideDownOut 0.24s cubic-bezier(0.32, 0, 0.67, 0) forwards'
            : 'modalSlideDownIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
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
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#004d35',
                flexShrink: 0,
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Actualización de credenciales
              </h2>
              <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                Modificación de nombre de usuario y actualización obligatoria de contraseña
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={guardando}
            aria-label="Cerrar modal"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 8,
              padding: '6px 8px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#e6f4ea',
                  color: '#004d35',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  border: '1px solid #bbf7d0',
                }}
              >
                {(user?.nombre || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  {user?.nombre || user?.username}
                </div>
                <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                  {getRolLabel(user?.rol)}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 11.5,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                borderRadius: 6,
                color: '#334155',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              @{user?.username}
            </span>
          </div>

          {errorLocal && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errorLocal}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="input-username"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}
            >
              Nombre de usuario
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                @
              </span>
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ejemplo_usuario"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 26px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 3, display: 'block' }}>
              Identificador alfanumérico para el acceso a la plataforma.
            </span>
          </div>

          <div>
            <label
              htmlFor="input-pass-actual"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}
            >
              Contraseña actual <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-pass-actual"
                type={verPasswordActual ? 'text' : 'password'}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingrese su contraseña vigente"
                required
                style={{
                  width: '100%',
                  padding: '8px 36px 8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setVerPasswordActual(!verPasswordActual)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {verPasswordActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', marginTop: 3, display: 'block' }}>
              Requerida para autenticar y autorizar la modificación.
            </span>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} color="#004d35" />
              <span>Cambio de contraseña (obligatorio)</span>
              <span style={{ color: '#dc2626' }}>*</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label
                  htmlFor="input-nueva-pass"
                  style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 3 }}
                >
                  Nueva contraseña <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="input-nueva-pass"
                    type={verNuevaPassword ? 'text' : 'password'}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres (al menos un número o mayúscula)"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerNuevaPassword(!verNuevaPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {verNuevaPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-confirm-pass"
                  style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 3 }}
                >
                  Confirmar nueva contraseña <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="input-confirm-pass"
                    type={verConfirmarPassword ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Confirme la nueva contraseña"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirmarPassword(!verConfirmarPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {verConfirmarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: 2,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 11.5,
                }}
              >
                <span style={{ fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Requisitos de seguridad obligatorios:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tiene8Caracteres ? '#166534' : '#64748b' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: tiene8Caracteres ? '#dcfce7' : '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: tiene8Caracteres ? '#166534' : '#94a3b8' }}>
                    {tiene8Caracteres ? '✓' : '•'}
                  </span>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tieneNumeroOMayuscula ? '#166534' : '#64748b' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: tieneNumeroOMayuscula ? '#dcfce7' : '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: tieneNumeroOMayuscula ? '#166534' : '#94a3b8' }}>
                    {tieneNumeroOMayuscula ? '✓' : '•'}
                  </span>
                  <span>Al menos un número o una letra mayúscula</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: coincidenPasswords ? '#166534' : '#64748b' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: coincidenPasswords ? '#dcfce7' : '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: coincidenPasswords ? '#166534' : '#94a3b8' }}>
                    {coincidenPasswords ? '✓' : '•'}
                  </span>
                  <span>Las contraseñas coinciden</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: 11.5,
              color: '#166534',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: '#004d35' }} />
            <span>
              La actualización se aplica de forma inmediata sin requerir aprobación. La administración del hospital recibirá una notificación informativa del cambio conforme a la NOM-004-SSA3-2012.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 6,
              paddingTop: 12,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={guardando}
              style={{ fontSize: 12.5, padding: '7px 14px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando}
              style={{
                fontSize: 12.5,
                padding: '7px 16px',
                background: '#004d35',
                borderColor: '#004d35',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {guardando ? <div className="spinner-small" /> : <CheckCircle2 size={14} />}
              <span>{guardando ? 'Guardando...' : 'Guardar credenciales'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
