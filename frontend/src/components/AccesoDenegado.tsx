import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccesoDenegadoProps {
  rolActual: string;
  rolesPermitidos: string[];
  moduloNombre?: string;
}

export default function AccesoDenegado({
  rolActual,
  rolesPermitidos,
  moduloNombre = 'este módulo clínico'
}: AccesoDenegadoProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: 'Administrador del Sistema',
    medico: 'Médico Tratante / Especialista',
    admision: 'Recepción y Admisión Continua',
    enfermeria: 'Enfermería General y Piso',
    obstetricia: 'Especialista en Ginecología / Obstetricia',
    pediatria: 'Especialista en Pediatría / Neonatología',
    laboratorio: 'Laboratorio Clínico e Imagenología'
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <div
        className="card"
        style={{
          borderTop: '5px solid #dc2626',
          boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <ShieldAlert size={36} strokeWidth={2.2} />
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 20,
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              border: '1px solid #fecaca'
            }}
          >
            Seguridad Clínica • NOM-004-SSA3-2012
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 10px' }}>
            Acceso Restringido por Perfil Clínico
          </h2>

          <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
            Tu usuario actual (<strong>{user?.username}</strong> —{' '}
            <span style={{ color: '#0f766e', fontWeight: 600 }}>{roleLabels[rolActual] || rolActual}</span>) no cuenta
            con las facultades legales ni técnicas para operar {moduloNombre}.
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '14px 16px',
              textAlign: 'left',
              marginBottom: 24,
              fontSize: 12.5
            }}
          >
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Roles autorizados para este módulo:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rolesPermitidos.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: 11.5,
                    fontWeight: 600
                  }}
                >
                  {roleLabels[r] || r}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={15} /> Regresar a la Pantalla Anterior
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Home size={15} /> Ir a mi Panel de Trabajo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
