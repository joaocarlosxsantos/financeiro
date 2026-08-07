import { Plus } from 'lucide-react';
import React from 'react';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export function Fab({ onClick, label }: FabProps) {
  return (
    <button
      onClick={onClick}
      className="fixed z-50 bottom-4 sm:bottom-6 left-4 md:left-[19.5rem] flex items-center gap-1 sm:gap-2 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 px-4 sm:px-5 py-2.5 sm:py-3 min-h-[44px] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all"
      aria-label={label || 'Adicionar'}
      type="button"
    >
      <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      {label && <span className="font-semibold text-xs sm:text-base">{label}</span>}
    </button>
  );
}
