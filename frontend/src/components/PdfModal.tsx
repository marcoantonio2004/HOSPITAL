import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Printer, Download, ExternalLink, X, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  pacienteNombre?: string;
  expediente?: string;
}

export default function PdfModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  pacienteNombre,
  expediente,
}: PdfModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Escuchar tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Función para cargar el PDF en memoria mediante Blob
  const cargarPdf = useCallback(() => {
    if (!isOpen || !pdfUrl) return;

    setLoading(true);
    setError(null);

    let isMounted = true;
    let localBlobUrl: string | null = null;

    fetch(pdfUrl, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Error ${res.status}: ${txt || res.statusText || 'No se pudo generar el PDF'}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        localBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(localBlobUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error cargando documento PDF:', err);
        setError(err.message || 'Error al comunicarse con el servidor para generar el PDF');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [isOpen, pdfUrl]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const cleanup = cargarPdf();
      return () => {
        document.body.style.overflow = '';
        if (cleanup) cleanup();
      };
    } else {
      document.body.style.overflow = '';
      setBlobUrl(null);
      setError(null);
    }
  }, [isOpen, cargarPdf]);

  if (!isOpen) return null;

  function handlePrint() {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Fallo impresión directa de iframe, abriendo enlace:', err);
      }
    }
    const targetUrl = blobUrl || pdfUrl;
    window.open(targetUrl, '_blank');
  }

  const activeDocUrl = blobUrl || pdfUrl;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 1100,
        padding: '16px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96vw',
          maxWidth: '1150px',
          height: '92vh',
          background: '#ffffff',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          animation: 'modalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabecera del Visor de PDF */}
        <div
          style={{
            padding: '12px 20px',
            background: '#0f3f2f',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={18} color="#6ee7b7" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </h3>
              {(pacienteNombre || expediente) && (
                <div style={{ fontSize: 11.5, color: '#d1fae5', opacity: 0.9, marginTop: 2 }}>
                  {expediente && <span style={{ fontFamily: 'monospace', fontWeight: 600, marginRight: 8 }}>[{expediente}]</span>}
                  {pacienteNombre}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Herramientas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrint}
              disabled={loading || Boolean(error)}
              className="btn"
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: loading || error ? 'not-allowed' : 'pointer',
                opacity: loading || error ? 0.6 : 1,
              }}
              title="Imprimir documento"
            >
              <Printer size={15} /> Imprimir
            </button>

            <a
              href={activeDocUrl}
              download={`${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
                cursor: loading || error ? 'not-allowed' : 'pointer',
                pointerEvents: loading || error ? 'none' : 'auto',
                opacity: loading || error ? 0.6 : 1,
              }}
              title="Descargar archivo PDF"
            >
              <Download size={15} /> Descargar
            </a>

            <a
              href={activeDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12.5,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                cursor: loading || error ? 'not-allowed' : 'pointer',
                pointerEvents: loading || error ? 'none' : 'auto',
                opacity: loading || error ? 0.6 : 1,
              }}
              title="Abrir en pestaña nueva"
            >
              <ExternalLink size={15} />
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '6px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}
              aria-label="Cerrar visor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor con iframe / error */}
        <div style={{ position: 'relative', flex: 1, width: '100%', background: '#525659' }}>
          {loading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                zIndex: 2,
              }}
            >
              <Loader2 size={36} color="#0f3f2f" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ margin: 0, fontSize: 14, color: '#1e293b', fontWeight: 600 }}>
                Generando documento oficial en PDF...
              </p>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Preparando el formato oficial con membrete y datos clínicos validados
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                gap: 14,
                zIndex: 3,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                }}
              >
                <AlertCircle size={28} />
              </div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                No se pudo cargar el documento oficial
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', maxWidth: 460 }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={cargarPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    background: '#0f3f2f',
                    borderColor: '#0f3f2f',
                  }}
                >
                  <RefreshCw size={15} /> Reintentar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {blobUrl && (
            <iframe
              ref={iframeRef}
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
