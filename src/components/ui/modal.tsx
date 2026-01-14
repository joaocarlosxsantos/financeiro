import * as React from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  // Keep a stable ref to onClose so the effect below doesn't re-run when
  // a parent recreates the onClose callback on every render. That was
  // causing the effect to re-run while the modal remained open and the
  // modal container to be focused again, making inputs lose caret/focus.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) {
      // When modal is closed, restore previously focused element if any.
      previouslyFocused.current?.focus();
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // focus the modal container once when opened
    const focusTimer = window.setTimeout(() => modalRef.current?.focus(), 0);

    // trap focus and handle Escape using the stable ref
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      // restore focus when modal is unmounted/closed
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  const outerSizeClass =
    size === 'sm'
      ? 'max-w-md min-h-[18vh] max-h-[70vh]'
      : size === 'xl'
      ? 'max-w-5xl min-h-[60vh] max-h-[95vh]'
      : size === 'lg'
      ? 'max-w-3xl min-h-[40vh] max-h-[90vh]'
      : size === 'full'
        ? 'w-[80vw] h-[80vh] max-w-none'
      : 'max-w-xl min-h-[30vh] max-h-[80vh]';

  const contentMaxHeight =
    size === 'sm'
      ? 'calc(70vh - 48px)'
      : size === 'xl'
      ? 'calc(95vh - 96px)'
      : size === 'lg'
      ? 'calc(90vh - 80px)'
      : size === 'full'
        ? 'calc(80vh - 48px)'
      : 'calc(80vh - 64px)';

  const contentPaddingClass = size === 'sm' ? 'px-4 pb-4 pt-3' : 'px-4 sm:px-8 pb-6 sm:pb-8 pt-2';

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      aria-hidden={!open}
      style={{ overflow: 'auto' }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Modal'}
        className={`bg-background border border-border rounded-lg shadow-lg w-full mx-auto my-auto relative animate-in fade-in zoom-in-95 p-0 flex flex-col ${outerSizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-background/80 shadow border border-gray-200 dark:border-gray-700 text-xl font-bold text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all z-10"
          onClick={onClose}
          aria-label="Fechar"
          type="button"
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
        </button>
        {title && (
          <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-2 text-base sm:text-lg font-semibold">
            {title}
          </div>
        )}
        <div className={`${contentPaddingClass} overflow-y-auto`} style={{ maxHeight: contentMaxHeight }}>
          {children}
        </div>
      </div>
    </div>
  );

  // Renderiza o modal usando portal para garantir que apareça no topo da página
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
