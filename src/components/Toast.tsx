'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error' | 'match';
}

interface ToastContextType {
  showToast: {
    (title: string, type?: 'success' | 'info' | 'warning' | 'error' | 'match'): void;
    (toast: Omit<ToastMessage, 'id'>): void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    arg1: string | Omit<ToastMessage, 'id'>, 
    arg2?: 'success' | 'info' | 'warning' | 'error' | 'match'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    let newToast: ToastMessage;

    if (typeof arg1 === 'string') {
      newToast = {
        id,
        title: arg1,
        type: arg2 || 'info',
      };
    } else {
      newToast = { ...arg1, id };
    }

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '360px',
        width: '100%',
      }}>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';
          const isMatch = toast.type === 'match';

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                color: 'var(--text-primary)',
                animation: 'slideUp 160ms ease-out',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {isSuccess && <CheckCircle2 size={16} style={{ color: '#059669' }} />}
                {isMatch && <Info size={16} style={{ color: '#D97706' }} />}
                {(isWarning || isError) && <AlertCircle size={16} style={{ color: '#DC2626' }} />}
                {!isSuccess && !isMatch && !isWarning && !isError && <Info size={16} style={{ color: '#0F172A' }} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {toast.title}
                </div>
                {toast.message && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
