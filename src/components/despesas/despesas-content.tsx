'use client';

import { useState } from 'react';
import { useMonth } from '@/components/providers/month-provider';

import DespesasUnificadas from './despesas-unificadas';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

export default function DespesasContent() {
  const [activeTab, setActiveTab] = useState('variaveis');
  const { currentDate, setCurrentDate } = useMonth();

  // Navegação de mês global
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= now) {
      setCurrentDate(nextMonth);
    }
  };
  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
          <div className="flex items-center space-x-2 px-3 h-10 rounded-md border bg-white/90 border-slate-300/70 text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100">
            <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <span className="font-medium text-sm sm:text-base">{monthLabelCapitalized} {yearLabel}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
          >
            <ArrowRight className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
          </Button>
        </div>
      </div>
      <DespesasUnificadas currentDate={currentDate} />
    </div>
  );
}
