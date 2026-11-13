import React, { useState, useEffect, useMemo, useRef } from 'react';
import { pacientes } from '../services/api';

export interface PersonalMedicoItem {
  id_medico: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  cedula_profesional?: string | null;
  especialidad?: string | null;
  area_hospitalizacion?: string | null;
}

export interface SelectorPersonalMedicoProps {
  nombre: string;
  cedula?: string;
  onChange: (nombre: string, cedula?: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

let cachedMedicos: PersonalMedicoItem[] | null = null;
let fetchMedicosPromise: Promise<PersonalMedicoItem[]> | null = null;

function normalizeString(str?: string | null): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^dr[a]?\.\s*/i, '')
    .replace(/^dr\(a\)\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDoctorPrefix(nombre: string): string {
  const clean = (nombre || '').trim();
  if (/^dr[a]?\./i.test(clean) || /^dr\(a\)\./i.test(clean)) {
    return '';
  }
  const first = clean.split(' ')[0].toLowerCase();
  const femaleNames = [
    'maria', 'maría', 'laura', 'beatriz', 'elena', 'ana', 'carmen', 'patricia',
    'rosa', 'guadalupe', 'sofia', 'sofía', 'fernanda', 'daniela', 'paola',
    'andrea', 'gabriela', 'monica', 'mónica', 'claudia', 'adriana', 'veronica', 'verónica'
  ];
  if (femaleNames.includes(first) || (first.endsWith('a') && !['joshua'].includes(first))) {
    return 'Dra. ';
  }
  return 'Dr. ';
}

function getDoctorFullName(m: PersonalMedicoItem): string {
  const prefix = getDoctorPrefix(m.nombre);
  const full = `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
  return `${prefix}${full}`.trim();
}

export default function SelectorPersonalMedico({
  nombre,
  cedula,
  onChange,
  label,
  placeholder = '-- Seleccione personal médico --',
  required = false,
  disabled = false,
  id,
}: SelectorPersonalMedicoProps) {
  const [medicos, setMedicos] = useState<PersonalMedicoItem[]>(cachedMedicos || []);
  const [esOtro, setEsOtro] = useState(false);
  const [otroTexto, setOtroTexto] = useState('');
  const otroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cachedMedicos) {
      setMedicos(cachedMedicos);
      return;
    }

    if (!fetchMedicosPromise) {
      fetchMedicosPromise = pacientes.getPersonalMedico().then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        cachedMedicos = list;
        return list;
      }).catch(() => {
        fetchMedicosPromise = null;
        return [];
      });
    }

    fetchMedicosPromise.then((list) => {
      setMedicos(list);
    });
  }, []);

  const medicosOrdenados = useMemo(() => {
    return [...medicos].sort((a, b) => {
      const nomA = `${a.nombre} ${a.apellido_paterno}`.toLowerCase();
      const nomB = `${b.nombre} ${b.apellido_paterno}`.toLowerCase();
      return nomA.localeCompare(nomB, 'es');
    });
  }, [medicos]);

  const matchedDoctor = useMemo(() => {
    if (!nombre || medicos.length === 0) return null;
    const cleanNombre = normalizeString(nombre);
    const cleanCedula = (cedula || '').trim();

    if (cleanCedula) {
      const byCed = medicos.find((m) => (m.cedula_profesional || '').trim() === cleanCedula);
      if (byCed) return byCed;
    }

    const byName = medicos.find((m) => {
      const mNom = normalizeString(`${m.nombre} ${m.apellido_paterno} ${m.apellido_materno || ''}`);
      return mNom === cleanNombre || mNom.includes(cleanNombre) || cleanNombre.includes(mNom);
    });

    return byName || null;
  }, [medicos, nombre, cedula]);

  const selectValue = useMemo(() => {
    if (esOtro) return '__OTRO__';
    if (matchedDoctor) return String(matchedDoctor.id_medico);
    if (nombre && String(nombre).trim().length > 0) return '__OTRO__';
    return '';
  }, [esOtro, matchedDoctor, nombre]);

  useEffect(() => {
    if (nombre && String(nombre).trim().length > 0 && !matchedDoctor && medicos.length > 0) {
      setEsOtro(true);
      setOtroTexto(nombre);
    }
  }, [nombre, matchedDoctor, medicos]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;

    if (val === '__OTRO__') {
      setEsOtro(true);
      const textToUse = matchedDoctor ? getDoctorFullName(matchedDoctor) : (otroTexto || nombre || '');
      setOtroTexto(textToUse);
      onChange(textToUse);
      setTimeout(() => otroInputRef.current?.focus(), 50);
      return;
    }

    setEsOtro(false);
    setOtroTexto('');

    if (!val) {
      onChange('', '');
      return;
    }

    const found = medicos.find((m) => String(m.id_medico) === val);
    if (found) {
      const formatted = getDoctorFullName(found);
      onChange(formatted, found.cedula_profesional || '');
    }
  };

  const handleOtroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOtroTexto(val);
    onChange(val);
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label
          htmlFor={id}
          style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}
        >
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <select
        id={id}
        value={selectValue}
        onChange={handleSelectChange}
        disabled={disabled}
        required={required && !esOtro}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontSize: 13,
          background: '#ffffff',
          color: '#0f172a',
          outline: 'none',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">{placeholder}</option>
        {medicosOrdenados.map((m) => {
          const nombreCompleto = `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno || ''}`.replace(/\s+/g, ' ').trim();
          const prefix = getDoctorPrefix(m.nombre).trim();
          const cedulaPart = m.cedula_profesional ? ` (Céd. ${m.cedula_profesional})` : '';
          const espPart = m.especialidad ? ` — ${m.especialidad}` : '';
          const labelOption = `${nombreCompleto} [${prefix || 'Dr(a).'}]${cedulaPart}${espPart}`;

          return (
            <option key={m.id_medico} value={String(m.id_medico)}>
              {labelOption}
            </option>
          );
        })}
        <option value="__OTRO__">Otro (especificar médico libremente)...</option>
      </select>

      {esOtro && (
        <div style={{ marginTop: 6 }}>
          <input
            id={id ? `${id}-otro` : undefined}
            ref={otroInputRef}
            type="text"
            value={otroTexto}
            onChange={handleOtroChange}
            placeholder="Escriba el nombre completo del médico..."
            disabled={disabled}
            required={required}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #94a3b8',
              fontSize: 13,
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: 11, color: '#64748b', marginTop: 3, display: 'block' }}>
            Especifique el nombre completo de puño y letra o personal externo.
          </span>
        </div>
      )}
    </div>
  );
}
