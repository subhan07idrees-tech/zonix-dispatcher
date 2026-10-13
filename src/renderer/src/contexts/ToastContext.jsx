import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'ok') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const copyToClipboard = useCallback(async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label, 'ok');
    } catch (e) {
      showToast('Failed to copy', 'err');
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, copyToClipboard }}>
      {children}
      {/* Toast Stack in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          let dotColor = 'bg-ok';
          if (t.type === 'err') dotColor = 'bg-err';
          if (t.type === 'warn') dotColor = 'bg-warn';
          if (t.type === 'neutral') dotColor = 'bg-ink-3';

          return (
            <div
              key={t.id}
              className="pointer-events-auto bg-surface border border-line rounded-ctl px-3.5 py-2.5 shadow-modal flex items-center gap-2.5 text-[13px] font-medium text-ink min-w-[200px]"
            >
              <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      copyToClipboard: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {}
      },
    };
  }
  return ctx;
}
