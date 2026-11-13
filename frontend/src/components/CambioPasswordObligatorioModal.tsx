import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import { ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export default function CambioPasswordObligatorioModal() {
  const { user, updateCurrentUser, logout, loggingOut } = useAuth();
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  if (!user || !user.debe_cambiar_password) {
    return null;
  }

  const cleanNueva = nuevaPassword.trim();
  const cleanConfirmar = confirmarPassword.trim();

  const tieneMinimo8 = cleanNueva.length >= 8;
  const tieneNumeroOMayuscula = /[A-Z0-9]/.test(cleanNueva);
  const coinciden = cleanNueva.length > 0 && cleanNueva === cleanConfirmar;
  const esValido = tieneMinimo8 && tieneNumeroOMayuscula && coinciden;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorLocal('');

    if (!tieneMinimo8) {
      setErrorLocal('La nueva contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }

    if (!tieneNumeroOMayuscula) {
      setErrorLocal('La contraseña debe incluir al menos un número o una letra mayúscula.');
      return;
    }

    if (!coinciden) {
      setErrorLocal('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    setGuardando(true);
    try {
      const res = await auth.cambiarPasswordObligatorio({
        nueva_password: cleanNueva,
        confirmar_password: cleanConfirmar,
      });

      if (res.success) {
        updateCurrentUser({ debe_cambiar_password: false });
      } else {
        setErrorLocal(res.error || 'No fue posible actualizar la contraseña.');
      }
    } catch (err: any) {
      setErrorLocal(err.message || 'Error de conexión al actualizar la contraseña.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            background: '#0f3f2f',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ffffff' }}>
              Cambio de contraseña obligatorio
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#e2e8f0' }}>
              Seguridad hospitalaria y cumplimiento NOM-004-SSA3-2012
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 18,
              fontSize: 12.5,
              color: '#334155',
              lineHeight: 1.5,
            }}
          >
            Hola <strong>@{user.username}</strong>, su cuenta cuenta con una contraseña provisional o requiere actualización obligatoria. Por normativa de seguridad, debe establecer una contraseña personal segura antes de continuar navegando.
          </div>

          {errorLocal && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorLocal}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Nueva contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={verNueva ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres con número o mayúscula"
                required
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setVerNueva(!verNueva)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                {verNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              Confirmar nueva contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={verConfirmar ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                required
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setVerConfirmar(!verConfirmar)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: tieneMinimo8 ? '#15803d' : '#64748b',
                fontWeight: tieneMinimo8 ? 600 : 400,
              }}
            >
              <CheckCircle2 size={14} color={tieneMinimo8 ? '#16a34a' : '#94a3b8'} />
              <span>Mínimo 8 caracteres</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: tieneNumeroOMayuscula ? '#15803d' : '#64748b',
                fontWeight: tieneNumeroOMayuscula ? 600 : 400,
              }}
            >
              <CheckCircle2 size={14} color={tieneNumeroOMayuscula ? '#16a34a' : '#94a3b8'} />
              <span>Al menos un número o una letra mayúscula</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: coinciden ? '#15803d' : '#64748b',
                fontWeight: coinciden ? 600 : 400,
              }}
            >
              <CheckCircle2 size={14} color={coinciden ? '#16a34a' : '#94a3b8'} />
              <span>Las contraseñas coinciden</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={() => logout()}
              disabled={loggingOut}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: '#64748b',
              }}
            >
              <LogOut size={14} />
              {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
            </button>

            <button
              type="submit"
              disabled={!esValido || guardando}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                background: esValido ? '#0f3f2f' : '#94a3b8',
                borderColor: esValido ? '#0f3f2f' : '#94a3b8',
                cursor: esValido ? 'pointer' : 'not-allowed',
                padding: '9px 18px',
              }}
            >
              <KeyRound size={15} />
              {guardando ? 'Guardando...' : 'Establecer contraseña y acceder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
