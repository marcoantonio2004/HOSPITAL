import React from 'react';
import { Lock } from 'lucide-react';

interface AutoFieldProps {
  label: string;
  value: string | number | undefined | null;
  badgeText?: string;
  width?: string;
}

export default function AutoField({ label, value, badgeText = 'AUTO', width }: AutoFieldProps) {
  return (
    <div className="form-group" style={{ width: width || '100%', marginBottom: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
        {label}
        <span 
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            background: '#e2e8f0',
            color: '#475569',
            fontFamily: 'monospace',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3
          }}
          title="Autocompletado desde el Maestro de Pacientes. Solo lectura en este formulario."
        >
          <Lock size={9} /> {badgeText}
        </span>
      </label>
      <input
        type="text"
        readOnly
        disabled
        value={value ?? '---'}
        style={{
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          color: '#334155',
          cursor: 'not-allowed',
          fontWeight: 500,
          fontSize: 13,
          padding: '8px 12px',
          borderRadius: 6,
          width: '100%'
        }}
      />
    </div>
  );
}
