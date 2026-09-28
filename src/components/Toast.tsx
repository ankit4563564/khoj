'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';

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
    }, 4500);
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
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '400px',
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
                gap: '12px',
                padding: '14px 18px',
                borderRadius: '14px',
                background: 'rgba(14, 18, 28, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isMatch 
                  ? '1px solid rgba(245, 158, 11, 0.5)' 
                  : isSuccess 
                  ? '1px solid rgba(16, 185, 129, 0.4)' 
                  : (isWarning || isError)
                  ? '1px solid rgba(244, 63, 94, 0.5)' 
                  : '1px solid rgba(99, 102, 241, 0.4)',
                boxShadow: isMatch 
                  ? '0 10px 30px rgba(245, 158, 11, 0.25)' 
                  : isSuccess
                  ? '0 10px 30px rgba(16, 185, 129, 0.2)'
                  : isError
                  ? '0 10px 30px rgba(244, 63, 94, 0.25)'
                  : '0 10px 30px rgba(0, 0, 0, 0.6)',
                animation: 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#f8fafc',
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {isMatch && <Sparkles style={{ width: '18px', height: '18px', color: '#f59e0b' }} />}
                {isSuccess && <CheckCircle2 style={{ width: '18px', height: '18px', color: '#34d399' }} />}
                {(isWarning || isError) && <AlertCircle style={{ width: '18px', height: '18px', color: '#fb7185' }} />}
                {!isMatch && !isSuccess && !isWarning && !isError && <Info style={{ width: '18px', height: '18px', color: '#818cf8' }} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  {toast.title}
                </div>
                {toast.message && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X style={{ width: '15px', height: '15px' }} />
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
