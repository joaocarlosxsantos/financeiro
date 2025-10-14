'use client';

import { Input } from './input';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  value: string; // YYYY-MM format
  onChange: (value: string) => void;
  className?: string;
}

export function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor="month-selector" className="block text-sm font-medium mb-1">
        Mês/Ano
      </label>
      <Input
        id="month-selector"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}