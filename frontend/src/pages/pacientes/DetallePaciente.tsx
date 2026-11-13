import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pacientes, encuentro as encuentroApi, getPdfUrl } from '../../services/api';
import PdfModal from '../../components/PdfModal';
import TrasladoModal from '../../components/TrasladoModal';
import {
  ShieldCheck, FileText, BookOpen, AlertTriangle,
  Stethoscope, Syringe, Baby, FlaskConical, Scan,
  LogOut, Printer, Lock,
  FileSpreadsheet, Siren, Building2, Edit, Edit3,
  ArrowRightLeft, Bed, UserCheck, CheckCircle2, Clock, FilePlus
} from 'lucide-react';

export default function DetallePaciente() {
  const { id } = useParams();
  const { user } = useAuth();
  const userRole = (user?.rol || '').toLowerCase();
  const [patient, setPatient] = useState<any>(null);
  const [encuentros, setEncuentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [encuentroActivo, setEncuentroActivo] = useState<any>(null);
  const [modalTrasladoOpen, setModalTrasladoOpen] = useState(false);
  const [resumenDocs, setResumenDocs] = useState<any>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Seccionador de bloques del expediente clínico
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  // Visor de PDF interno
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [pRes, eRes] = await Promise.all([
        pacientes.get(parseInt(id!)),
        pacientes.getEncuentros(parseInt(id!)),
      ]);
      if (pRes.success) setPatient(pRes.data);
      if (eRes.success) {
        if (eRes.data.length === 0) {
          // Auto-crear encuentro inicial si por alguna razón no existía
          const nuevoEnc = await pacientes.crearEncuentro(parseInt(id!), { area_ingreso: 'admision' });
          if (nuevoEnc.success) {
            setEncuentros([nuevoEnc.data]);
            setEncuentroActivo(nuevoEnc.data);
          }
        } else {
          setEncuentros(eRes.data);
          const activo = eRes.data.find((e: any) => e.estatus === 'activo');
          if (activo) setEncuentroActivo(activo);
          else setEncuentroActivo(eRes.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (encuentroActivo?.id_encuentro) {
      loadResumenDocs(encuentroActivo.id_encuentro);
    }
  }, [encuentroActivo?.id_encuentro]);

  async function loadResumenDocs(encId: number) {
    setLoadingDocs(true);
    try {
      const res = await encuentroApi.getResumenDocumentos(encId);
      if (res.success && res.data) {
        setResumenDocs(res.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen de documentos:', err);
    } finally {
      setLoadingDocs(false);
    }
  }

  function renderDocActions(
    key: string,
    url: string,
    pdfTipo: string,
    pdfTitulo: string,
    options?: { isMulti?: boolean; isLocked?: boolean; lockedLabel?: string; allowedRoles?: string[] }
  ) {
    const docInfo = resumenDocs?.[key];
    const isReg = !!docInfo?.registrado;

    const hasWritePermission =
      !options?.allowedRoles ||
      userRole === 'admin' ||
      options.allowedRoles.includes(userRole);

    if (options?.isLocked) {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {hasWritePermission ? (
            <Link
              to={url}
              style={{
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 7,
                background: '#0f3f2f',
                color: '#ffffff',
                border: '1px solid #0f3f2f',
                boxShadow: '0 1px 2px rgba(15, 63, 47, 0.15)',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              title="Registrar nota de egreso y contrarreferencia"
            >
              <LogOut size={13} />
              <span>{options.lockedLabel || 'Registrar egreso'}</span>
            </Link>
          ) : (
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '4px 8px', whiteSpace: 'nowrap' }}>
              Solo lectura
            </span>
          )}
          <button
            onClick={() => openPdf(pdfTipo, pdfTitulo)}
            style={{
              fontSize: 11.5,
              padding: '5px 10px',
              borderRadius: 7,
              background: '#f8fafc',
              color: '#94a3b8',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontWeight: 600,
              cursor: 'not-allowed',
            }}
            title="Vista previa PDF oficial (disponible al registrar el egreso)"
            disabled
          >
            <Printer size={13} color="#94a3b8" /> PDF
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {hasWritePermission ? (
          <Link
            to={url}
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 7,
              background: '#0f3f2f',
              color: '#ffffff',
              border: '1px solid #0f3f2f',
              boxShadow: '0 1px 2px rgba(15, 63, 47, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Capturar o consultar información de este formato"
          >
            {isReg ? <Edit3 size={13} /> : <FilePlus size={13} />}
            <span>Capturar / ver</span>
          </Link>
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '4px 8px', whiteSpace: 'nowrap' }}>
            Solo lectura
          </span>
        )}
        <button
          onClick={() => openPdf(pdfTipo, pdfTitulo)}
          style={{
            fontSize: 11.5,
            padding: '5px 10px',
            borderRadius: 7,
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Vista previa PDF oficial"
        >
          <Printer size={13} color="#0f3f2f" /> PDF
        </button>
      </div>
    );
  }

  function renderStatusBadge(
    key: string,
    options?: { isLocked?: boolean; lockedText?: string }
  ) {
    if (options?.isLocked) {
      return (
        <span
          style={{
            fontSize: 10.5,
            padding: '3px 10px',
            borderRadius: 999,
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 112,
            gap: 4,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Lock size={11} /> {options.lockedText || 'Bloqueada'}
        </span>
      );
    }

    const docInfo = resumenDocs?.[key];
    const isReg = !!docInfo?.registrado;
    const count = docInfo?.count || 0;

    if (isReg) {
      return (
        <span
          style={{
            fontSize: 10.5,
            padding: '3px 10px',
            borderRadius: 999,
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 112,
            gap: 4,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={11} /> {count > 1 ? `${count} registrados` : 'Registrado'}
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: 10.5,
          padding: '3px 10px',
          borderRadius: 999,
          background: '#f8fafc',
          color: '#64748b',
          border: '1px solid #cbd5e1',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 112,
          gap: 4,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Clock size={11} /> Pendiente
      </span>
    );
  }

  function openPdf(tipo: string, tituloDoc: string) {
    if (!encuentroActivo) return;
    setPdfModal({
      isOpen: true,
      url: getPdfUrl(encuentroActivo.id_encuentro, tipo),
      title: tituloDoc,
    });
  }

  function calcularEdad(fechaNacimiento: string): { anios: number; texto: string } {
    if (!fechaNacimiento) return { anios: 0, texto: '--' };
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let anios = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) anios--;
    return { anios, texto: anios === 1 ? '1 año' : `${anios} años` };
  }

  function formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Cargando expediente clínico...</p></div>;
  }

  if (!patient) {
    return <div className="empty-state"><p>Paciente no encontrado</p></div>;
  }

  const edadInfo = calcularEdad(patient.fecha_nacimiento);
  const esPediatrico = edadInfo.anios < 18;
  const sexoLower = (patient.sexo || '').toLowerCase();
  const esMujer = sexoLower.startsWith('f') || sexoLower.includes('fem');

  return (
    <div>
      {/* Banner Maestro Permanente de Paciente Único */}
      <div className="patient-banner" style={{ background: '#0f3f2f', color: '#ffffff', borderRadius: 8, padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.8, display: 'block' }}>Expediente</span>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{patient.expediente_clinico}</span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.8, display: 'block' }}>Paciente</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{patient.apellido_paterno} {patient.apellido_materno || ''} {patient.nombre}</span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>CURP</span>
          <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{patient.curp || 'NO ASIGNADA'}</span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>Edad / clasificación</span>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {edadInfo.texto}
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: esPediatrico ? '#0284c7' : 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontWeight: 700
            }}>
              {esPediatrico ? 'PEDIÁTRICO' : 'ADULTO'}
            </span>
          </span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>Sexo</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>Tipo sanguíneo</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
            {patient.grupo_sanguineo ? `${patient.grupo_sanguineo}${patient.rh || ''}` : 'Desconocido'}
          </span>
        </div>
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <span style={{ fontSize: 10, opacity: 0.8, display: 'block' }}>Alergias</span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: patient.alergias && !patient.alergias.toLowerCase().includes('negad') ? '#dc2626' : 'rgba(255,255,255,0.15)',
            color: '#ffffff'
          }}>
            {patient.alergias || 'Negadas'}
          </span>
        </div>

        {/* Botón directo de Editar Paciente */}
        <div style={{ marginLeft: 'auto' }}>
          <Link
            to={`/pacientes/${patient.id_paciente}/editar`}
            className="btn"
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            <Edit size={13} /> Editar datos
          </Link>
        </div>
      </div>

      {/* Barra de Control del Episodio de Atención (1 sola línea ejecutiva) */}
      {encuentroActivo ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #0f3f2f',
          borderRadius: 10,
          padding: '10px 18px',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#0f3f2f', letterSpacing: 0.4 }}>
              Episodio:
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, background: '#0f3f2f', color: '#fff', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              #{encuentroActivo.id_encuentro} — {encuentroActivo.servicio_actual || encuentroActivo.area_ingreso}
            </span>
            {encuentroActivo.cama_asignada && (
              <span style={{ fontSize: 12, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Bed size={13} /> {encuentroActivo.cama_asignada}
              </span>
            )}
            <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
              Ingreso: <strong style={{ color: '#1e293b', fontWeight: 600 }}>{formatearFecha(encuentroActivo.fecha_hora_ingreso)}</strong>
            </span>
            <span className={`badge badge-${encuentroActivo.estatus}`}>
              {encuentroActivo.estatus}
            </span>
            <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
            {encuentroActivo.medico_responsable || encuentroActivo.medico_nombre ? (
              <span style={{ fontSize: 12, fontWeight: 600, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <UserCheck size={13} /> Dr(a). {encuentroActivo.medico_responsable || encuentroActivo.medico_nombre}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 500, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <UserCheck size={13} /> Med. de Guardia
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {encuentros.length > 1 && (
              <select
                value={encuentroActivo.id_encuentro}
                onChange={(e) => {
                  const found = encuentros.find((x: any) => x.id_encuentro === parseInt(e.target.value));
                  if (found) setEncuentroActivo(found);
                }}
                title="Cambiar de episodio clínico"
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
              >
                {encuentros.map((enc: any) => (
                  <option key={enc.id_encuentro} value={enc.id_encuentro}>
                    Historial: #{enc.id_encuentro} — {enc.area_ingreso?.toUpperCase()} ({new Date(enc.fecha_hora_ingreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })})
                  </option>
                ))}
              </select>
            )}

            {encuentroActivo.estatus === 'activo' && (
              <button
                onClick={() => setModalTrasladoOpen(true)}
                className="btn"
                style={{
                  fontSize: 12,
                  padding: '5px 12px',
                  background: 'linear-gradient(135deg, #0f3f2f 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(4, 120, 87, 0.25)',
                }}
                title="Trasladar o cambiar de servicio/área médica"
              >
                <ArrowRightLeft size={13} /> Trasladar / cambiar de área
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: 16 }}>
          <p>Cargando información del episodio de atención...</p>
        </div>
      )}

      {/* ÍNDICE DE FORMATOS OFICIALES CON SECCIONADOR SUPERIOR POR BLOQUE */}
      {encuentroActivo && (() => {
        const totalFormatos = esMujer ? 14 : 13;

        const renderDocRow = (
          num: number,
          IconComponent: any,
          title: string,
          normTag: string,
          docKey: string,
          url: string,
          pdfTipo: string,
          pdfTitulo: string,
          accentColor: string,
          tintBg: string,
          isLast?: boolean,
          actionOptions?: { isMulti?: boolean; isLocked?: boolean; lockedLabel?: string; allowedRoles?: string[] },
          badgeOptions?: { isLocked?: boolean; lockedText?: string }
        ) => (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: tintBg,
                color: accentColor,
                border: `1px solid ${accentColor}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11.5,
                fontWeight: 800,
                flexShrink: 0,
              }}>
                {num}
              </span>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <IconComponent size={16} color={accentColor} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                  {title}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 4,
                  background: '#f1f5f9',
                  color: '#64748b',
                  letterSpacing: 0.2,
                }}>
                  {normTag}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              {renderStatusBadge(docKey, badgeOptions)}
              {renderDocActions(docKey, url, pdfTipo, pdfTitulo, actionOptions)}
            </div>
          </div>
        );

        return (
          <div>
            {/* Encabezado Principal del Índice */}
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f3f2f', letterSpacing: -0.2 }}>
                Índice del expediente clínico
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Seleccione un bloque para filtrar o consulte el orden cronológico completo (NOM-004-SSA3-2012)
              </span>
            </div>

            {/* Apartado Superior para Seccionar cada Bloque */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: 5,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              overflowX: 'auto',
            }}>
              {[
                { id: 'todos', label: 'Todos los bloques', count: totalFormatos, icon: BookOpen },
                { id: 'admision', label: 'Bloque 0 · Ingreso y legal', count: 2, icon: ShieldCheck },
                { id: 'medico', label: 'Bloque 1 · Núcleo NOM-004', count: 4, icon: Stethoscope },
                { id: 'hospitalizacion', label: 'Bloque 2 · Urgencias y hosp.', count: esMujer ? 5 : 4, icon: Bed },
                { id: 'diagnostico', label: 'Bloque 3 · Laboratorio y gabinete', count: 3, icon: FlaskConical },
              ].map((tab) => {
                const isActive = filtroCategoria === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFiltroCategoria(tab.id)}
                    style={{
                      flex: '1 1 0%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      padding: '8px 14px',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 600,
                      background: isActive ? '#0f3f2f' : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      boxShadow: isActive ? '0 2px 5px rgba(15, 63, 47, 0.2)' : 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: 10.5,
                      padding: '1px 7px',
                      borderRadius: 999,
                      fontWeight: 700,
                      background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#475569',
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* BLOQUE 0: INGRESO */}
            {(filtroCategoria === 'todos' || filtroCategoria === 'admision') && (
              <div className="card" style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: '4px solid #334155', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
                <div className="card-header" style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: '#334155', color: '#fff', letterSpacing: 0.4 }}>
                      BLOQUE 0
                    </span>
                    <h3 style={{ margin: 0, fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
                      Ingreso y consentimientos legales
                    </h3>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Formatos 1 – 2</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {renderDocRow(1, ShieldCheck, 'Aviso de Privacidad y Consentimiento de Transferencia', 'LGPDPPSO', 'aviso_privacidad', `/encuentros/${encuentroActivo.id_encuentro}/aviso-privacidad`, 'aviso-privacidad', 'Aviso de Privacidad (LGPDPPSO)', '#334155', '#f1f5f9', false, { allowedRoles: ['admin', 'admision', 'medico'] })}
                  {renderDocRow(2, FileText, 'Carta de Consentimiento Informado', 'NOM-004', 'consentimiento', `/encuentros/${encuentroActivo.id_encuentro}/consentimiento`, 'consentimiento', 'Carta de Consentimiento Informado', '#334155', '#f1f5f9', true, { isMulti: true, allowedRoles: ['admin', 'admision', 'medico'] })}
                </div>
              </div>
            )}

            {/* BLOQUE 1: NÚCLEO DEL EXPEDIENTE */}
            {(filtroCategoria === 'todos' || filtroCategoria === 'medico') && (
              <div className="card" style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: '4px solid #0f3f2f', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
                <div className="card-header" style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: '#0f3f2f', color: '#fff', letterSpacing: 0.4 }}>
                      BLOQUE 1
                    </span>
                    <h3 style={{ margin: 0, fontSize: 13, color: '#0f3f2f', fontWeight: 700 }}>
                      Núcleo del expediente clínico (NOM-004-SSA3-2012)
                    </h3>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Formatos 3 – 6</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {renderDocRow(3, BookOpen, 'Hoja Frontal (Portada de Resumen)', 'NOM-004', 'hoja_frontal', `/encuentros/${encuentroActivo.id_encuentro}/hoja-frontal`, 'hoja-frontal', 'Hoja Frontal del Expediente', '#0f3f2f', '#ecfdf5', false, { allowedRoles: ['admin', 'admision', 'medico'] })}
                  {!esPediatrico
                    ? renderDocRow(4, Stethoscope, 'Historia Clínica General (Adultos)', 'NOM-004', 'historia_clinica', `/encuentros/${encuentroActivo.id_encuentro}/historia-clinica`, 'historia-clinica', 'Historia Clínica General (Adultos)', '#0f3f2f', '#ecfdf5', false, { allowedRoles: ['admin', 'medico'] })
                    : renderDocRow(4, Baby, 'Historia Clínica Pediátrica', 'NOM-004', 'historia_clinica', `/encuentros/${encuentroActivo.id_encuentro}/hc-pediatrica`, 'hc-pediatrica', 'Historia Clínica Pediátrica', '#0284c7', '#e0f2fe', false, { allowedRoles: ['admin', 'medico', 'pediatria'] })
                  }
                  {renderDocRow(5, FileText, 'Notas de Evolución Médica (SOAP)', 'NOM-004', 'evolucion', `/encuentros/${encuentroActivo.id_encuentro}/evolucion`, 'evolucion', 'Notas de Evolución Médica (SOAP)', '#0f3f2f', '#ecfdf5', false, { isMulti: true, allowedRoles: ['admin', 'medico', 'enfermeria'] })}
                  {renderDocRow(
                    6,
                    LogOut,
                    'Nota de Egreso / Contrarreferencia',
                    'NOM-004',
                    'nota_egreso',
                    `/encuentros/${encuentroActivo.id_encuentro}/nota-egreso`,
                    'nota-egreso',
                    'Nota de Egreso y Contrarreferencia',
                    '#0f3f2f',
                    '#ecfdf5',
                    true,
                    { isLocked: encuentroActivo.estatus === 'activo', lockedLabel: 'Registrar egreso', allowedRoles: ['admin', 'medico'] },
                    { isLocked: encuentroActivo.estatus === 'activo', lockedText: 'Bloqueada' }
                  )}
                </div>
              </div>
            )}

            {/* BLOQUE 2: MÓDULOS ESPECÍFICOS SEGÚN ÁREA */}
            {(filtroCategoria === 'todos' || filtroCategoria === 'hospitalizacion') && (
              <div className="card" style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: '4px solid #b45309', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
                <div className="card-header" style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: '#b45309', color: '#fff', letterSpacing: 0.4 }}>
                      BLOQUE 2
                    </span>
                    <h3 style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 700 }}>
                      Módulos por área de atención (urgencias y hospitalización)
                    </h3>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Formatos 7 – {esMujer ? 11 : 10}</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {renderDocRow(7, AlertTriangle, 'Hoja de Consulta de Urgencias (Triage)', 'URGENCIAS', 'urgencias', `/encuentros/${encuentroActivo.id_encuentro}/urgencias`, 'urgencias', 'Consulta de Urgencias (Triage)', '#b45309', '#fef3c7', false, { allowedRoles: ['admin', 'medico'] })}
                  {renderDocRow(8, Siren, 'Hoja Diaria de Urgencias (SINBA-SEUL-16-P)', 'SINBA-DGIS', 'sinba16', `/encuentros/${encuentroActivo.id_encuentro}/sinba-16`, 'sinba-16', 'Hoja Diaria Urgencias SINBA-16', '#b45309', '#fef3c7', false, { allowedRoles: ['admin', 'medico'] })}
                  {renderDocRow(9, Syringe, 'Hoja de Indicaciones Médicas (Hospitalización)', 'HOSPITALIZACIÓN', 'indicaciones', `/encuentros/${encuentroActivo.id_encuentro}/indicaciones`, 'indicaciones', 'Hoja de Indicaciones Médicas', '#b45309', '#fef3c7', false, { isMulti: true, allowedRoles: ['admin', 'medico', 'enfermeria'] })}
                  {renderDocRow(10, Building2, 'Hoja de Hospitalización (SINBA-SEUL-14-P)', 'SINBA-DGIS', 'sinba14', `/encuentros/${encuentroActivo.id_encuentro}/sinba-14`, 'sinba-14', 'Hoja de Hospitalización SINBA-14', '#b45309', '#fef3c7', !esMujer, { allowedRoles: ['admin', 'medico'] })}
                  {esMujer && renderDocRow(11, Baby, 'Partograma y Vigilancia (Tococirugía)', 'OBSTETRICIA', 'partograma', `/encuentros/${encuentroActivo.id_encuentro}/partograma`, 'partograma', 'Partograma y Curvas de Vigilancia', '#db2777', '#fce7f3', true, { isMulti: true, allowedRoles: ['admin', 'medico', 'enfermeria', 'obstetricia'] })}
                </div>
              </div>
            )}

            {/* BLOQUE 3: ESTUDIOS Y SOLICITUDES */}
            {(filtroCategoria === 'todos' || filtroCategoria === 'diagnostico') && (
              <div className="card" style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: '4px solid #4f46e5', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
                <div className="card-header" style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: '#4f46e5', color: '#fff', letterSpacing: 0.4 }}>
                      BLOQUE 3
                    </span>
                    <h3 style={{ margin: 0, fontSize: 13, color: '#4338ca', fontWeight: 700 }}>
                      Estudios auxiliares, laboratorios e interconsulta
                    </h3>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Formatos {esMujer ? '12 – 14' : '11 – 13'}</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {renderDocRow(esMujer ? 12 : 11, FlaskConical, 'Solicitud de Laboratorio Clínico', 'AUX. DIAGNÓSTICO', 'laboratorio', `/encuentros/${encuentroActivo.id_encuentro}/laboratorio`, 'laboratorio', 'Solicitud de Laboratorio Clínico', '#4f46e5', '#ede9fe', false, { isMulti: true, allowedRoles: ['admin', 'medico', 'laboratorio'] })}
                  {renderDocRow(esMujer ? 13 : 12, Scan, 'Solicitud y Reporte de Gabinete (Imagenología)', 'IMAGENOLOGÍA', 'gabinete', `/encuentros/${encuentroActivo.id_encuentro}/gabinete`, 'gabinete', 'Solicitud y Reporte de Gabinete', '#4f46e5', '#ede9fe', false, { isMulti: true, allowedRoles: ['admin', 'medico', 'laboratorio'] })}
                  {renderDocRow(esMujer ? 14 : 13, FileSpreadsheet, 'Solicitud - Recepción de Interconsulta Médica', 'INTERCONSULTA', 'interconsulta', `/encuentros/${encuentroActivo.id_encuentro}/interconsultas`, 'interconsulta', 'Interconsulta Médica', '#4f46e5', '#ede9fe', true, { isMulti: true, allowedRoles: ['admin', 'medico'] })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Visor de PDF Integrado en Modal */}
      <PdfModal
        isOpen={pdfModal.isOpen}
        onClose={() => setPdfModal({ isOpen: false, url: '', title: '' })}
        pdfUrl={pdfModal.url}
        title={pdfModal.title}
        pacienteNombre={`${patient.nombre} ${patient.apellido_paterno} ${patient.apellido_materno || ''}`}
        expediente={patient.expediente_clinico}
      />

      {/* Modal de Traslado Intrahospitalario con Restricciones Clínicas */}
      {encuentroActivo && (
        <TrasladoModal
          isOpen={modalTrasladoOpen}
          onClose={() => setModalTrasladoOpen(false)}
          onSuccess={(updatedEnc) => {
            setEncuentroActivo(updatedEnc);
            setEncuentros(prev => prev.map(e => e.id_encuentro === updatedEnc.id_encuentro ? updatedEnc : e));
          }}
          idEncuentro={encuentroActivo.id_encuentro}
          areaActual={encuentroActivo.servicio_actual || encuentroActivo.area_ingreso}
          camaActual={encuentroActivo.cama_asignada}
          paciente={{
            nombre: patient.nombre,
            apellido_paterno: patient.apellido_paterno,
            apellido_materno: patient.apellido_materno,
            sexo: patient.sexo,
            edadAnios: edadInfo.anios,
            edadTexto: edadInfo.texto,
            expediente_clinico: patient.expediente_clinico,
          }}
        />
      )}
    </div>
  );
}
