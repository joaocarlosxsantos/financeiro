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
      className="fixed z-50 bottom-4 sm:bottom-6 right-4 sm:right-10 flex items-center gap-1 sm:gap-2 bg-primary text-white rounded-full shadow-lg px-4 sm:px-5 py-2.5 sm:py-3 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
      aria-label={label || 'Adicionar'}
      type="button"
    >
      <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      {label && <span className="font-semibold text-xs sm:text-base">{label}</span>}
    </button>
  )
}
