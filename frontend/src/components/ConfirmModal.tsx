import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmInputOptions {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  input?: ConfirmInputOptions;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  promptConfirm: (options: ConfirmOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface ModalState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolveBool?: (val: boolean) => void;
  resolvePrompt?: (val: string | null) => void;
  isPrompt: boolean;
}

const initialModalState: ModalState = {
  isOpen: false,
  options: { title: '' },
  isPrompt: false,
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof options === 'string'
        ? { title: 'Confirmación', message: options }
        : options;

    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        options: normalized,
        resolveBool: resolve,
        isPrompt: false,
      });
      setInputValue('');
      setInputError('');
    });
  }, []);

  const promptConfirm = useCallback((options: ConfirmOptions): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolvePrompt: resolve,
        isPrompt: true,
      });
      setInputValue(options.input?.defaultValue || '');
      setInputError('');
    });
  }, []);

  const handleClose = useCallback(() => {
    if (modalState.isPrompt) {
      modalState.resolvePrompt?.(null);
    } else {
      modalState.resolveBool?.(false);
    }
    setModalState(initialModalState);
    setInputValue('');
    setInputError('');
  }, [modalState]);

  const handleConfirm = useCallback(() => {
    if (modalState.isPrompt) {
      const isRequired = modalState.options.input?.required ?? true;
      const trimmed = inputValue.trim();
      if (isRequired && !trimmed) {
        setInputError('Este campo es obligatorio.');
        return;
      }
      modalState.resolvePrompt?.(trimmed);
    } else {
      modalState.resolveBool?.(true);
    }
    setModalState(initialModalState);
    setInputValue('');
    setInputError('');
  }, [modalState, inputValue]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!modalState.isOpen) return;
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        if (modalState.isPrompt && modalState.options.input?.multiline) {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleConfirm();
          }
        } else {
          e.preventDefault();
          handleConfirm();
        }
      }
    }

    if (modalState.isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalState.isOpen, modalState.isPrompt, modalState.options.input?.multiline, handleClose, handleConfirm]);

  const { options, isPrompt, isOpen } = modalState;
  const variant = options.variant || (isPrompt ? 'info' : 'warning');

  return (
    <ConfirmContext.Provider value={{ confirm, promptConfirm }}>
      {children}
      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrapper">
                {variant === 'danger' && <AlertCircle size={24} style={{ color: 'var(--danger)' }} />}
                {variant === 'warning' && <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />}
                {variant === 'info' && <Info size={24} style={{ color: 'var(--info)' }} />}
                <h3 id="confirm-modal-title">{options.title}</h3>
              </div>
              <button className="modal-close" onClick={handleClose} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {options.message && <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{options.message}</p>}

              {isPrompt && (
                <div style={{ marginTop: options.message ? '14px' : 0 }}>
                  {options.input?.label && (
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      {options.input.label}
                    </label>
                  )}
                  {options.input?.multiline ? (
                    <textarea
                      autoFocus
                      rows={3}
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (inputError) setInputError('');
                      }}
                      placeholder={options.input?.placeholder || ''}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: inputError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      autoFocus
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (inputError) setInputError('');
                      }}
                      placeholder={options.input?.placeholder || ''}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: inputError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                  {inputError && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', marginBottom: 0 }}>
                      {inputError}
                    </p>
                  )}
                  {options.input?.multiline && (
                    <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '5px', marginBottom: 0 }}>
                      Presione Ctrl+Enter o use el botón para confirmar.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose}>
                {options.cancelText || 'Cancelar'}
              </button>
              <button
                className={`btn btn-${variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}`}
                onClick={handleConfirm}
              >
                {options.confirmText || (isPrompt ? 'Aceptar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

// Standalone component for existing manual usages
export interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
}: ConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            {variant === 'danger' && <AlertCircle size={24} style={{ color: 'var(--danger)' }} />}
            {variant === 'warning' && <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />}
            {variant === 'info' && <Info size={24} style={{ color: 'var(--info)' }} />}
            <h3 id="modal-title">{title}</h3>
          </div>
          <button className="modal-close" onClick={onCancel} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{message}</p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn btn-${variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
