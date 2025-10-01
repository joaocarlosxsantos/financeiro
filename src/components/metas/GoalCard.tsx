"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
// Using simple div-based progress bar (no dedicated Progress component available)

export default function GoalCard({ goal, onClick }: { goal: any; onClick?: (g: any) => void }) {
  const percent = goal.amount ? Math.min(100, Math.round((Number(goal.currentAmount || 0) / Number(goal.amount || 1)) * 100)) : 0;
  // determine bar color
  const getBarColor = () => {
    if (goal.kind === 'LIMIT') {
      if (percent >= 100) return '#7C3AED'; // purple when over limit
      // interpolate green (#10B981) to red (#EF4444) based on percent 0..100
      const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
      const start = { r: 0x10, g: 0xB9, b: 0x81 }; // #10B981
      const end = { r: 0xEF, g: 0x44, b: 0x44 }; // #EF4444
      const t = Math.max(0, Math.min(1, percent / 100));
      const r = clamp(start.r + (end.r - start.r) * t);
      const g = clamp(start.g + (end.g - start.g) * t);
      const b = clamp(start.b + (end.b - start.b) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
    // default green for attainment
    return '#10B981';
  };

  const barColor = getBarColor();

  return (
    <Card className="rounded-2xl cursor-pointer" onClick={() => onClick?.(goal)} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(goal); }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">{goal.title}</h3>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{goal.type === 'RECURRING' ? 'Recorrente' : goal.type === 'TIMED' ? 'Com prazo' : goal.type} { /* mostra apenas a parte de recorrência */ }
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Alvo</div>
            <div className="text-lg font-bold">R$ {Number(goal.amount).toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-3 overflow-hidden">
            <div style={{ width: `${percent}%`, background: barColor }} className="h-3" />
          </div>
          <div className="mt-2 flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <div>
              R$ {Number(goal.currentAmount || 0).toFixed(2)} {' '}
              {goal.kind === 'LIMIT' ? 'Gasto' : goal.kind === 'ATTAINMENT' ? 'Atingido' : 'Acumulado'}
            </div>
            <div>{percent}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
