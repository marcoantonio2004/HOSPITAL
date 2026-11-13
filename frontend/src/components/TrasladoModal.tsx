import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, AlertTriangle, Check, Building2, Bed, ShieldAlert, UserCheck } from 'lucide-react';
import { encuentro } from '../services/api';
import { useToast } from './Toast';

interface TrasladoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevoEncuentro: any) => void;
  idEncuentro: number;
  areaActual: string;
  camaActual?: string;
  paciente: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    sexo: string;
    edadAnios: number;
    edadTexto: string;
    expediente_clinico: string;
  };
}

export default function TrasladoModal({
  isOpen,
  onClose,
  onSuccess,
  idEncuentro,
  areaActual,
  camaActual,
  paciente,
}: TrasladoModalProps) {
  const { showToast } = useToast();
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [camaDestino, setCamaDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [medicoAutoriza, setMedicoAutoriza] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAreas();
      setSelectedAreaId('');
      setCamaDestino('');
      setMotivo('');
      setMedicoAutoriza('');
      setErrorMsg('');
    }
  }, [isOpen]);

  async function loadAreas() {
    try {
      const res = await encuentro.getAreasHospitalarias();
      if (res.success) setAreas(res.data);
    } catch (e) {
      console.error('Error al cargar áreas:', e);
    }
  }

  if (!isOpen) return null;

  const esMujer = (paciente.sexo || '').toUpperCase().startsWith('F');
  const esHombre = (paciente.sexo || '').toUpperCase().startsWith('M');
  const esPediatrico = paciente.edadAnios < 18;

  function evaluarRestriccion(area: any): { permitida: boolean; razon?: string } {
    if (area.soloSexo === 'F' && !esMujer) {
      return { permitida: false, razon: 'No permitida para pacientes de sexo masculino' };
    }
    if (area.soloSexo === 'M' && !esHombre) {
      return { permitida: false, razon: 'No permitida para pacientes de sexo femenino' };
    }
    if (area.soloPediatricos && !esPediatrico) {
      return { permitida: false, razon: 'Exclusiva para pacientes pediátricos (<18 años)' };
    }
    if (area.soloAdultos && esPediatrico) {
      return { permitida: false, razon: 'Exclusiva para adultos (≥18 años). Los niños deben ingresar a Pediatría' };
    }
    return { permitida: true };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAreaId) {
      setErrorMsg('Debes seleccionar un área de destino válida.');
      return;
    }
    if (!motivo.trim()) {
      setErrorMsg('El motivo del traslado es obligatorio conforme a la NOM-004-SSA3-2012.');
      return;
    }

    const areaElegida = areas.find(a => a.id === selectedAreaId);
    const validacion = evaluarRestriccion(areaElegida);
    if (!validacion.permitida) {
      setErrorMsg(validacion.razon || 'Área no permitida para el perfil del paciente');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await encuentro.trasladar(idEncuentro, {
        area_destino_id: selectedAreaId,
        cama_destino: camaDestino.trim() || undefined,
        motivo_traslado: motivo.trim(),
        medico_autoriza: medicoAutoriza.trim() || undefined,
      });

      if (res.success) {
        showToast(res.message || 'Paciente trasladado exitosamente', 'success');
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.error || 'No se pudo realizar el traslado');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en el servidor al procesar el traslado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '16px 22px',
            background: '#0f3f2f',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRightLeft size={20} color="#6ee7b7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                Traslado / cambio de área hospitalaria
              </h3>
              <span style={{ fontSize: 11.5, color: '#d1fae5', opacity: 0.9 }}>
                Transferencia de servicio y cama (NOM-004-SSA3-2012)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Perfil del Paciente y Validación Clínica */}
        <div
          style={{
            padding: '12px 22px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              Paciente en traslado
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              {paciente.apellido_paterno} {paciente.apellido_materno || ''} {paciente.nombre}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: esMujer ? '#fce7f3' : '#dbeafe',
                color: esMujer ? '#9d174d' : '#1e40af',
                border: `1px solid ${esMujer ? '#fbcfe8' : '#bfdbfe'}`,
              }}
            >
              {esMujer ? '♀ Femenino' : '♂ Masculino'}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 6,
                background: esPediatrico ? '#e0f2fe' : '#dcfce7',
                color: esPediatrico ? '#0369a1' : '#15803d',
                border: `1px solid ${esPediatrico ? '#bae6fd' : '#bbf7d0'}`,
              }}
            >
              {esPediatrico ? `Pediátrico (${paciente.edadTexto})` : `Adulto (${paciente.edadTexto})`}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#475569',
              }}
            >
              Origen: <strong style={{ color: '#0f3f2f' }}>{areaActual.toUpperCase()}</strong> {camaActual ? `(${camaActual})` : ''}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de Áreas con Bloqueos Visuales */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              Seleccionar área / servicio destino *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {areas.map((area) => {
                const { permitida, razon } = evaluarRestriccion(area);
                const isSelected = selectedAreaId === area.id;

                return (
                  <div
                    key={area.id}
                    onClick={() => {
                      if (permitida) {
                        setSelectedAreaId(area.id);
                        setErrorMsg('');
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: isSelected
                        ? '2px solid #0f3f2f'
                        : permitida
                        ? '1px solid #e2e8f0'
                        : '1px solid #fee2e2',
                      background: isSelected
                        ? '#f0fdf4'
                        : permitida
                        ? '#ffffff'
                        : '#fafafa',
                      cursor: permitida ? 'pointer' : 'not-allowed',
                      opacity: permitida ? 1 : 0.65,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: permitida ? '#1e293b' : '#94a3b8' }}>
                        {area.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: permitida ? '#64748b' : '#b91c1c', marginTop: 2 }}>
                        {permitida ? area.descripcion : `🚫 ${razon}`}
                      </div>
                    </div>

                    <div>
                      {isSelected && (
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#0f3f2f',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </span>
                      )}
                      {!permitida && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#dc2626',
                            background: '#fee2e2',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          Bloqueada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cama y Médico Responsable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Nueva cama / camilla (opcional)
              </label>
              <input
                type="text"
                value={camaDestino}
                onChange={(e) => setCamaDestino(e.target.value)}
                placeholder="Ej. Cama 204 / Cuna 3"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Médico que autoriza el traslado
              </label>
              <input
                type="text"
                value={medicoAutoriza}
                onChange={(e) => setMedicoAutoriza(e.target.value)}
                placeholder="Ej. Dr. Morales - Céd. 76421"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Motivo del Traslado */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Motivo del traslado / transferencia (obligatorio NOM-004) *
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describa el motivo clínico del traslado (ej. Paciente estabilizado hemodinámicamente en choque de urgencias, se transfiere a piso de medicina interna para tratamiento antibiótico y vigilancia...)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                resize: 'vertical',
                lineHeight: 1.45,
              }}
              required
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedAreaId}
              style={{
                background: '#0f3f2f',
                color: '#ffffff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: submitting || !selectedAreaId ? 'not-allowed' : 'pointer',
                opacity: submitting || !selectedAreaId ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ArrowRightLeft size={16} />
              {submitting ? 'Procesando traslado...' : 'Confirmar traslado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
