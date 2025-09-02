import * as React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // focus the modal container
      setTimeout(() => modalRef.current?.focus(), 0);
      // trap focus
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
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
      return () => document.removeEventListener('keydown', handleKey);
    } else {
      // restore focus
      previouslyFocused.current?.focus();
    }
  }, [open, onClose]);

  if (!open) return null;
  const outerSizeClass =
    size === 'sm'
      ? 'max-w-md min-h-[18vh] max-h-[70vh]'
      : size === 'lg'
      ? 'max-w-3xl min-h-[40vh] max-h-[90vh]'
      : 'max-w-xl min-h-[30vh] max-h-[80vh]';

  const contentMaxHeight = size === 'sm' ? 'calc(70vh - 48px)' : size === 'lg' ? 'calc(90vh - 80px)' : 'calc(80vh - 64px)';

  const contentPaddingClass = size === 'sm' ? 'px-4 pb-4 pt-3' : 'px-4 sm:px-8 pb-6 sm:pb-8 pt-2';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Modal'}
        className={`bg-background border border-border rounded-lg shadow-lg w-full mx-2 sm:mx-4 relative animate-in fade-in zoom-in-95 p-0 flex flex-col ${outerSizeClass}`}
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
}
