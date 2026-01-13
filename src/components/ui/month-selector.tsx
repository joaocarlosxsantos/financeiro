'use client';

import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
}

export function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <Label htmlFor="month-selector" className="text-sm font-medium text-foreground">
        Período da Fatura
      </Label>
      <Input
        id="month-selector"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-background dark:bg-white/5 border border-input 
                   dark:border-white/15 rounded-md backdrop-blur-sm transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 
                   focus-visible:border-primary/50 hover:border-muted-foreground/40
                   placeholder:text-muted-foreground/80 text-sm text-foreground
                   month-selector-input"
        placeholder="Selecione o mês e ano"
      />
      <p className="text-xs text-muted-foreground/70">
        Selecione o mês/ano da fatura que está importando
      </p>
    </div>
  );
}