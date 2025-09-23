import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupItem {
  key: string;
  amount: number;
  color?: string;
}

interface DayGroup {
  date: string;
  total: number;
  groups: GroupItem[];
}

interface MobileChartDetailListProps {
  // dailyData: [{ date: '2025-09-01', 'Food': 123, 'Transport': 45 }, ...]
  dailyData: Array<Record<string, any>>;
  // map of key -> color or name
  meta?: Record<string, { name?: string; color?: string }>;
  title?: string;
}

export function groupDailyData(dailyData: Array<Record<string, any>>, meta?: Record<string, { name?: string; color?: string }>) {
  const map: Record<string, Record<string, number>> = {};
  for (const row of dailyData) {
    const date = String(row.date || row.day || row.label || '');
    if (!map[date]) map[date] = {};
    for (const k of Object.keys(row)) {
      if (k === 'date' || k === 'day' || k === 'label') continue;
      const v = Number(row[k]) || 0;
      map[date][k] = (map[date][k] || 0) + v;
    }
  }
  const out: DayGroup[] = Object.keys(map)
    .sort()
    .map((date) => {
      const groups: GroupItem[] = Object.keys(map[date])
        .map((k) => ({ key: k, amount: map[date][k], color: meta?.[k]?.color }))
        .filter((g) => g.amount !== 0)
        .sort((a, b) => b.amount - a.amount);
        const total = groups.reduce((s, g) => s + g.amount, 0);
        // Se não existir já um grupo chamado 'Total', adiciona um item 'Total' ao final
        if (!groups.find((g) => g.key === 'Total') && total !== 0) {
          groups.push({ key: 'Total', amount: total, color: meta?.['Total']?.color || 'hsl(var(--muted-foreground))' });
        }
      return { date, total, groups };
    })
    .filter((d) => d.total !== 0) // remover dias cujo total é 0
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

export default function MobileChartDetailList({ dailyData, meta, title }: MobileChartDetailListProps) {
  const grouped = groupDailyData(dailyData, meta);

  if (!grouped || grouped.length === 0) {
    return <div className="text-sm text-muted-foreground">Sem dados para o período selecionado</div>;
  }

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return dateStr;
    // try ISO parse first, fallback to Date constructor
    try {
      const d = parseISO(dateStr);
      if (isNaN(d.getTime())) throw new Error('Invalid');
      return format(d, "dd LLL", { locale: ptBR });
    } catch (e) {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "dd LLL", { locale: ptBR });
    }
  };

  return (
    <div className="space-y-3">
      {title && <div className="text-lg font-semibold">{title}</div>}
      <div className="divide-y">
        {grouped.map((day) => (
          <div key={day.date} className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{formatDateLabel(day.date)}</div>
              <div className="font-semibold">{day.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div className="space-y-1">
              {day.groups.map((g) => (
                    <div key={g.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: g.color || 'hsl(var(--muted-foreground))' }}
                          aria-hidden
                        />
                        <span className={`truncate ${g.key === 'Total' ? 'font-semibold' : ''}`}>{meta?.[g.key]?.name ?? g.key}</span>
                      </div>
                      <div className={`font-mono text-sm ${g.key === 'Total' ? 'text-lg font-semibold' : ''}`}>{g.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
