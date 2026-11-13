import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Upload,
  RotateCcw,
  Save,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  X,
  FileCheck2,
  Building2,
  Plus
} from 'lucide-react';
import { configuracionApi, LogoConfigPayload } from '../../services/api';
import { useToast } from '../../components/Toast';
import PdfModal from '../../components/PdfModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function ConfiguracionLogos() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usarPredeterminado, setUsarPredeterminado] = useState(true);
  const [tipoEncabezado, setTipoEncabezado] = useState<'logos_individuales' | 'banner'>('logos_individuales');
  const [textoLinea1, setTextoLinea1] = useState('GOBIERNO DE MÉXICO');
  const [textoLinea2, setTextoLinea2] = useState('SERVICIOS DE SALUD IMSS-BIENESTAR');
  const [textoLinea3, setTextoLinea3] = useState('HOSPITAL GENERAL SAN FELIPE DEL PROGRESO');
  const [distribucionLogos, setDistribucionLogos] = useState<'auto' | 'esquinas_y_centro' | 'todos_al_centro'>('auto');
  const [bannerAltura, setBannerAltura] = useState(38);
  const [bannerModoAjuste, setBannerModoAjuste] = useState<'fit' | 'stretch'>('fit');

  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerBase64, setBannerBase64] = useState<string>('');
  const [logoIzqPreview, setLogoIzqPreview] = useState<string>('');
  const [logoIzqBase64, setLogoIzqBase64] = useState<string>('');
  const [logoDerPreview, setLogoDerPreview] = useState<string>('');
  const [logoDerBase64, setLogoDerBase64] = useState<string>('');
  const [logoCentralPreview, setLogoCentralPreview] = useState<string>('');
  const [logoCentralBase64, setLogoCentralBase64] = useState<string>('');
  const [eliminarLogoCentral, setEliminarLogoCentral] = useState(false);
  const [mostrarLogoCentral, setMostrarLogoCentral] = useState(false);

  const [defaultBannerUrl, setDefaultBannerUrl] = useState<string>('/imss_bienestar_banner.png');

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pdfTimestamp, setPdfTimestamp] = useState(Date.now());

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoIzqInputRef = useRef<HTMLInputElement>(null);
  const logoDerInputRef = useRef<HTMLInputElement>(null);
  const logoCentralInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  async function cargarConfiguracion() {
    setLoading(true);
    try {
      const res = await configuracionApi.getLogoConfig();
      if (res.success && res.data) {
        const d = res.data;
        setUsarPredeterminado(d.usar_predeterminado !== false);
        setTipoEncabezado(d.tipo_encabezado === 'banner' ? 'banner' : 'logos_individuales');
        setTextoLinea1(d.texto_linea1 || 'GOBIERNO DE MÉXICO');
        setTextoLinea2(d.texto_linea2 || 'SERVICIOS DE SALUD IMSS-BIENESTAR');
        setTextoLinea3(d.texto_linea3 || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO');
        setBannerAltura(d.banner_altura || 38);
        setBannerModoAjuste(d.banner_modo_ajuste || 'fit');
        setDistribucionLogos(d.distribucion_logos || 'auto');
        setDefaultBannerUrl(d.default_banner_url || '/imss_bienestar_banner.png');

        if (d.banner_url) setBannerPreview(d.banner_url);
        if (d.logo_izquierdo_url) setLogoIzqPreview(d.logo_izquierdo_url);
        if (d.logo_derecho_url) setLogoDerPreview(d.logo_derecho_url);
        if (d.logo_central_url) {
          setLogoCentralPreview(d.logo_central_url);
          setMostrarLogoCentral(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('No se pudo cargar la configuración de membrete', 'error');
    } finally {
      setLoading(false);
    }
  }

  function procesarArchivo(file: File, callback: (base64: string, previewUrl: string) => void) {
    if (!file.type.startsWith('image/')) {
      showToast('Seleccione un archivo de imagen válido (PNG, JPG o WEBP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          callback(pngDataUrl, pngDataUrl);
        } else {
          const raw = e.target?.result as string;
          callback(raw, raw);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file, (base64, preview) => {
      setBannerBase64(base64);
      setBannerPreview(preview);
      setUsarPredeterminado(false);
      showToast('Banner institucional cargado correctamente', 'info');
    });
  }

  function handleLogoIzqFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file, (base64, preview) => {
      setLogoIzqBase64(base64);
      setLogoIzqPreview(preview);
      setUsarPredeterminado(false);
      showToast('Logotipo izquierdo cargado', 'info');
    });
  }

  function handleLogoDerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file, (base64, preview) => {
      setLogoDerBase64(base64);
      setLogoDerPreview(preview);
      setUsarPredeterminado(false);
      showToast('Logotipo derecho cargado', 'info');
    });
  }

  function handleLogoCentralFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    procesarArchivo(file, (base64, preview) => {
      setLogoCentralBase64(base64);
      setLogoCentralPreview(preview);
      setEliminarLogoCentral(false);
      setUsarPredeterminado(false);
      showToast('Logotipo central cargado', 'info');
    });
  }

  function handleQuitarLogoCentral() {
    setLogoCentralPreview('');
    setLogoCentralBase64('');
    setEliminarLogoCentral(true);
    setMostrarLogoCentral(false);
    showToast('Logotipo central removido', 'info');
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      const payload: LogoConfigPayload = {
        tipo_encabezado: tipoEncabezado,
        usar_predeterminado: usarPredeterminado,
        distribucion_logos: distribucionLogos,
        texto_linea1: textoLinea1,
        texto_linea2: textoLinea2,
        texto_linea3: textoLinea3,
        banner_altura: Number(bannerAltura),
        banner_modo_ajuste: bannerModoAjuste,
      };

      if (bannerBase64) payload.banner_base64 = bannerBase64;
      if (logoIzqBase64) payload.logo_izquierdo_base64 = logoIzqBase64;
      if (logoDerBase64) payload.logo_derecho_base64 = logoDerBase64;
      if (logoCentralBase64) payload.logo_central_base64 = logoCentralBase64;
      if (eliminarLogoCentral) payload.eliminar_logo_central = true;

      const res = await configuracionApi.updateLogoConfig(payload);
      if (res.success) {
        showToast('Membrete y logotipos actualizados exitosamente', 'success');
        const d = res.data;
        const t = Date.now();
        setBannerBase64('');
        setLogoIzqBase64('');
        setLogoDerBase64('');
        setLogoCentralBase64('');
        setEliminarLogoCentral(false);
        setPdfTimestamp(t);

        if (d?.usar_predeterminado) {
          setBannerPreview(`${d.banner_url || '/imss_bienestar_banner.png'}?t=${t}`);
          setLogoIzqPreview(`/logo_gobierno_mexico.png?t=${t}`);
          setLogoDerPreview(`/logo_imss_bienestar.png?t=${t}`);
          setLogoCentralPreview('');
          setMostrarLogoCentral(false);
        } else if (d) {
          if (d.banner_url) setBannerPreview(`${d.banner_url}?t=${t}`);
          if (d.logo_izquierdo_url) setLogoIzqPreview(`${d.logo_izquierdo_url}?t=${t}`);
          if (d.logo_derecho_url) setLogoDerPreview(`${d.logo_derecho_url}?t=${t}`);
          if (d.logo_central_url) {
            setLogoCentralPreview(`${d.logo_central_url}?t=${t}`);
            setMostrarLogoCentral(true);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    setConfirmResetOpen(false);
    setSaving(true);
    try {
      const res = await configuracionApi.resetLogoConfig();
      if (res.success && res.data) {
        const d = res.data;
        const t = Date.now();
        setUsarPredeterminado(true);
        setTipoEncabezado('logos_individuales');
        setTextoLinea1(d.texto_linea1 || 'GOBIERNO DE MÉXICO');
        setTextoLinea2(d.texto_linea2 || 'SERVICIOS DE SALUD IMSS-BIENESTAR');
        setTextoLinea3(d.texto_linea3 || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO');
        setBannerAltura(d.banner_altura || 38);
        setBannerModoAjuste(d.banner_modo_ajuste || 'fit');
        setDistribucionLogos(d.distribucion_logos || 'auto');
        setBannerBase64('');
        setLogoIzqBase64('');
        setLogoDerBase64('');
        setLogoCentralBase64('');
        setLogoCentralPreview('');
        setMostrarLogoCentral(false);
        setBannerPreview(`${d.banner_url || '/imss_bienestar_banner.png'}?t=${t}`);
        setLogoIzqPreview(`/logo_gobierno_mexico.png?t=${t}`);
        setLogoDerPreview(`/logo_imss_bienestar.png?t=${t}`);
        setPdfTimestamp(t);
        showToast('Membrete oficial predeterminado restaurado exitosamente', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error al restablecer membrete oficial', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading" style={{ marginTop: '25vh' }}>
        <div className="spinner" />
        <p>Cargando configuración de membrete y logos...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', paddingBottom: 50 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#e6f4ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#004d35',
            }}
          >
            <Sliders size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              Membrete y logotipos
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
              Configuración del encabezado oficial para los documentos impresos del expediente clínico.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmResetOpen(true)}
            disabled={saving}
            title="Restablecer membrete oficial predeterminado"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '7px 12px' }}
          >
            <RotateCcw size={14} />
            <span>Restablecer oficial</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPdfTimestamp(Date.now());
              setPdfModalOpen(true);
            }}
            title="Previsualizar encabezado en documento PDF real"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '7px 12px', color: '#004d35', borderColor: '#004d35' }}
          >
            <Printer size={14} />
            <span>Ver en PDF</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGuardar}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '7px 16px', background: '#004d35', borderColor: '#004d35' }}
          >
            {saving ? <div className="spinner-small" /> : <Save size={14} />}
            <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: '#ffffff' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#0f172a' }}>
          Modalidad del membrete institucional
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div
            onClick={() => setUsarPredeterminado(true)}
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              border: `2px solid ${usarPredeterminado ? '#004d35' : '#e2e8f0'}`,
              background: usarPredeterminado ? '#f0fdf4' : '#ffffff',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${usarPredeterminado ? '#004d35' : '#cbd5e1'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {usarPredeterminado && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#004d35' }} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                Membrete oficial predeterminado (IMSS-Bienestar)
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Aplica los logotipos institucionales del Gobierno de México y Servicios de Salud IMSS-Bienestar.
              </p>
            </div>
          </div>

          <div
            onClick={() => setUsarPredeterminado(false)}
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              border: `2px solid ${!usarPredeterminado ? '#004d35' : '#e2e8f0'}`,
              background: !usarPredeterminado ? '#f0fdf4' : '#ffffff',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${!usarPredeterminado ? '#004d35' : '#cbd5e1'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {!usarPredeterminado && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#004d35' }} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                Personalizar logotipos del hospital
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Permite cargar imágenes específicas para la unidad médica o dependencia estatal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!usarPredeterminado && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Carga de imágenes institucionales
            </h2>

            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
              <button
                type="button"
                onClick={() => setTipoEncabezado('logos_individuales')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: tipoEncabezado === 'logos_individuales' ? '#ffffff' : 'transparent',
                  color: tipoEncabezado === 'logos_individuales' ? '#004d35' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: tipoEncabezado === 'logos_individuales' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Logotipos individuales
              </button>
              <button
                type="button"
                onClick={() => setTipoEncabezado('banner')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: tipoEncabezado === 'banner' ? '#ffffff' : 'transparent',
                  color: tipoEncabezado === 'banner' ? '#004d35' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: tipoEncabezado === 'banner' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Banner completo
              </button>
            </div>
          </div>

          {tipoEncabezado === 'logos_individuales' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Logotipo izquierdo</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Esquina superior izquierda</span>
                  </div>
                  <div
                    onClick={() => logoIzqInputRef.current?.click()}
                    style={{
                      height: 80,
                      border: '2px dashed #cbd5e1',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      ref={logoIzqInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleLogoIzqFileChange}
                    />
                    {logoIzqPreview ? (
                      <img src={logoIzqPreview} alt="Logo izquierdo" style={{ maxHeight: 60, maxWidth: '85%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Upload size={16} /> Cargar logotipo izquierdo
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Logotipo derecho</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Esquina superior derecha</span>
                  </div>
                  <div
                    onClick={() => logoDerInputRef.current?.click()}
                    style={{
                      height: 80,
                      border: '2px dashed #cbd5e1',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      ref={logoDerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleLogoDerFileChange}
                    />
                    {logoDerPreview ? (
                      <img src={logoDerPreview} alt="Logo derecho" style={{ maxHeight: 60, maxWidth: '85%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Upload size={16} /> Cargar logotipo derecho
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {mostrarLogoCentral ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Logotipo central (opcional)</span>
                      <button
                        type="button"
                        onClick={handleQuitarLogoCentral}
                        style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <X size={14} /> Quitar
                      </button>
                    </div>
                    <div
                      onClick={() => logoCentralInputRef.current?.click()}
                      style={{
                        height: 70,
                        border: '2px dashed #cbd5e1',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        ref={logoCentralInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleLogoCentralFileChange}
                      />
                      {logoCentralPreview ? (
                        <img src={logoCentralPreview} alt="Logo central" style={{ maxHeight: 55, maxWidth: '85%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Upload size={16} /> Cargar logotipo central
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMostrarLogoCentral(true)}
                    style={{
                      background: 'none',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      color: '#004d35',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 500,
                    }}
                  >
                    <Plus size={14} />
                    <span>Agregar logotipo central (opcional)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div
                onClick={() => bannerInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 8,
                  padding: 20,
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleBannerFileChange}
                />
                {bannerPreview && !usarPredeterminado ? (
                  <img src={bannerPreview} alt="Banner" style={{ maxHeight: 50, maxWidth: '90%', objectFit: 'contain' }} />
                ) : (
                  <div>
                    <Upload size={24} style={{ color: '#004d35', margin: '0 auto 6px', display: 'block' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      Cargar imagen del banner completo
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      Formato horizontal con todos los sellos institucionales incluidos
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: '#ffffff' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
          Identificación de la unidad médica
        </h2>
        <label
          htmlFor="input-unidad"
          style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}
        >
          Nombre oficial del hospital (impreso en la casilla de unidad médica)
        </label>
        <input
          id="input-unidad"
          type="text"
          value={textoLinea3}
          onChange={(e) => setTextoLinea3(e.target.value)}
          placeholder="HOSPITAL GENERAL SAN FELIPE DEL PROGRESO"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Vista previa del encabezado
          </h2>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Alineación reglamentaria conforme a la NOM-004-SSA3-2012
          </span>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '18px 24px 14px 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            {tipoEncabezado === 'banner' && !usarPredeterminado && bannerPreview ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <img
                  src={bannerPreview}
                  alt="Banner"
                  style={{ maxHeight: 38, maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <img
                  src={usarPredeterminado ? '/logo_gobierno_mexico.png' : (logoIzqPreview || '/logo_gobierno_mexico.png')}
                  alt="Logo izquierdo"
                  style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }}
                />
                {!usarPredeterminado && logoCentralPreview && (
                  <img
                    src={logoCentralPreview}
                    alt="Logo central"
                    style={{ maxHeight: 32, maxWidth: 75, objectFit: 'contain' }}
                  />
                )}
                <img
                  src={usarPredeterminado ? '/logo_imss_bienestar.png' : (logoDerPreview || '/logo_imss_bienestar.png')}
                  alt="Logo derecho"
                  style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1.6px solid #000000', marginBottom: 2 }} />
          <div style={{ borderTop: '0.6px solid #000000', marginBottom: 6 }} />

          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: '#0f172a',
            }}
          >
            {textoLinea3 || 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO'}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#004d35',
          }}
        >
          <FileCheck2 size={15} />
          <span>Este encabezado se aplica de forma uniforme a los 15 formatos oficiales del expediente clínico.</span>
        </div>
      </div>

      <PdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfUrl={`/api/configuracion/logo/preview-pdf?t=${pdfTimestamp}`}
        title="Validación de membrete y logos en formato PDF"
      />

      <ConfirmModal
        isOpen={confirmResetOpen}
        onConfirm={handleResetDefault}
        onCancel={() => setConfirmResetOpen(false)}
        title="¿Restablecer membrete oficial predeterminado?"
        message="Esta acción reactivará el membrete oficial predeterminado de IMSS-Bienestar con sus logotipos institucionales para todos los documentos PDF del expediente clínico."
        confirmText="Restablecer oficial"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
}
