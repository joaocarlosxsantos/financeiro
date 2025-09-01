import React, { useEffect } from 'react';

interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
  inline?: boolean; // quando true, posiciona absolute para renderizar dentro de um modal
}

export function Toast({ open, message, onClose, duration = 3000, inline = false }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;
  // por padrão toast fica fixo no rodapé; se inline for true, posiciona absolute (útil dentro de modais)
  const baseClass = inline
    ? 'absolute top-4 right-4 z-50 bg-black/90 text-white px-4 py-2 rounded shadow-lg animate-in fade-in'
    : 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded shadow-lg animate-in fade-in';

  return <div className={baseClass}>{message}</div>;
}
