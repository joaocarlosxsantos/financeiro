'use client';

import { useState } from 'react';
import { useMonth } from '@/components/providers/month-provider';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

import RendasUnificadas from './rendas-unificadas';

export default function RendasContent() {
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
          <Button variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center px-2 py-1 border rounded bg-background text-foreground">
            <Calendar className="w-4 h-4 mr-1" />
            {monthLabelCapitalized} {yearLabel}
          </div>
          <Button variant="outline" size="sm" onClick={handleNextMonth} aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <RendasUnificadas currentDate={currentDate} />
    </div>
  );
}
