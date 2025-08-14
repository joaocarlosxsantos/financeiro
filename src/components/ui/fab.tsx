import { Plus } from 'lucide-react'
import React from 'react'

interface FabProps {
  onClick: () => void
  label?: string
}

export function Fab({ onClick, label }: FabProps) {
  return (
    <button
      onClick={onClick}
  className="fixed z-50 bottom-6 right-10 flex items-center gap-2 bg-primary text-white rounded-full shadow-lg px-5 py-3 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
      aria-label={label || 'Adicionar'}
      type="button"
    >
      <Plus className="w-6 h-6" />
      {label && <span className="font-semibold text-base">{label}</span>}
    </button>
  )
}
