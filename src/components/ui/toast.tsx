import React, { useEffect } from 'react';

interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ open, message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded shadow-lg animate-in fade-in">
      {message}
    </div>
  );
}
