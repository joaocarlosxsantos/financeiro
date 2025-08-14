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
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        {title && <div className="px-8 pt-8 pb-2 text-lg font-semibold">{title}</div>}
        <div className="px-8 pb-8 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>{children}</div>
      </div>
    </div>
  )
}
