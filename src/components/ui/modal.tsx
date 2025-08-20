import * as React from "react"

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-xl min-h-[30vh] max-h-[80vh] mx-4 relative animate-in fade-in zoom-in-95 p-0 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-background/80 shadow border border-gray-200 dark:border-gray-700 text-xl font-bold text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all z-10"
          onClick={onClose}
          aria-label="Fechar"
          type="button"
        >
          <span style={{fontSize: '1.5rem', lineHeight: 1}}>×</span>
        </button>
        {title && <div className="px-8 pt-8 pb-2 text-lg font-semibold">{title}</div>}
        <div className="px-8 pb-8 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>{children}</div>
      </div>
    </div>
  )
}
