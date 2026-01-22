'use client';

import { useState } from 'react';
import { useMonth } from '@/components/providers/month-provider';
import { ExpandedTransactionsTable } from '@/components/transacoes/expanded-transactions-table';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Calendar, ChevronDown } from 'lucide-react';

export default function DespesasContent() {
  const [activeTab, setActiveTab] = useState('variaveis');
  const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
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
  const handleDateChange = (year: number, month: number) => {
    setCurrentDate(new Date(year, month - 1, 1));
    setMonthSelectorOpen(false);
  };
  const monthLabel = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const yearLabel = currentDate.getFullYear();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const today = new Date().toISOString().slice(0, 10);

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
          
          <Popover open={monthSelectorOpen} onOpenChange={setMonthSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 min-w-[160px] justify-between border border-slate-300/70 bg-white/90 hover:bg-white text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <span className="font-medium text-sm sm:text-base">{monthLabelCapitalized} {yearLabel}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="year-select" className="text-sm font-medium mb-2 block">
                    Ano
                  </Label>
                  <Select
                    id="year-select"
                    value={currentDate.getFullYear().toString()}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      handleDateChange(newYear, currentDate.getMonth() + 1);
                    }}
                    className="w-full"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="month-select" className="text-sm font-medium mb-2 block">
                    Mês
                  </Label>
                  <Select
                    id="month-select"
                    value={(currentDate.getMonth() + 1).toString()}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      handleDateChange(currentDate.getFullYear(), newMonth);
                    }}
                    className="w-full"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

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

      <ExpandedTransactionsTable
        transactionType="expense"
        from={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`}
        to={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`}
        currentDate={currentDate}
      />
    </div>
  );
}
