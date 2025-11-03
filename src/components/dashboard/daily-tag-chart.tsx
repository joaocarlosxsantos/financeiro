'use client';
import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface DailyTagChartProps {
  data: Array<{ date: string; [tag: string]: number | string }>;
  tagNames?: Record<string, string>;
  height?: number | string;
}

function getColor(idx: number) {
  const palette = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--danger))',
    'hsl(34 95% 60%)',
    'hsl(214 90% 56%)',
    'hsl(286 60% 47%)',
    'hsl(48 85% 50%)',
    'hsl(197 90% 56%)',
    'hsl(344 85% 58%)',
    'hsl(187 85% 50%)',
    'hsl(88 65% 45%)',
    'hsl(326 70% 62%)',
  ];
  return palette[idx % palette.length];
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label, tags, tagNames }: any) => {
  if (!active || !payload || !Array.isArray(payload)) return null;

  const total = payload.reduce((s: number, p: any) => s + (Number(p?.value) || 0), 0);
  if (!total) return null;

  const items = payload
    .map((p: any) => {
      const name = p.name ?? p.dataKey ?? String(p.payload?.name ?? '');
      const value = Number(p.value) || 0;
      const color = p.color || p.fill || getColor(Math.max(0, tags.indexOf(name)));
      const displayName = tagNames?.[name] ?? name;
      return { name: displayName, value, color };
    })
    .filter((it: any) => it.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  if (items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px]">
      <p className="font-semibold text-card-foreground mb-2">
        Dia {String(Number(String(label).split('-').slice(-1)[0]))}
      </p>
      <div className="space-y-2">
        {items.map((it: any) => (
          <div key={it.name} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: it.color }} 
              />
              <span className="text-sm truncate">{it.name}</span>
            </div>
            <div className="font-mono text-sm font-medium">
              {formatCurrency(it.value)}
              <span className="ml-2 text-xs text-muted-foreground">
                ({Math.round((it.value / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-mono text-sm font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function DailyTagChart({ data, tagNames, height = 320 }: DailyTagChartProps) {
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());

  const tags = useMemo(() => 
    data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'date') : [], 
    [data]
  );

  // Filtrar dados baseado em tags ocultas
  const visibleData = useMemo(() => {
    if (hiddenTags.size === 0) return data;
    return data.map(item => {
      const filtered: any = { date: item.date };
      tags.forEach(tag => {
        if (!hiddenTags.has(tag)) {
          filtered[tag] = item[tag];
        }
      });
      return filtered;
    });
  }, [data, tags, hiddenTags]);

  // Calcular totalizadores
  const metrics = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;
    
    tags.forEach(tag => {
      totals[tag] = data.reduce((sum, item) => {
        const val = Number(item[tag]) || 0;
        return sum + val;
      }, 0);
      grandTotal += totals[tag];
    });

    const maxDay = data.reduce((max, item) => {
      const dayTotal = tags.reduce((sum, tag) => sum + (Number(item[tag]) || 0), 0);
      return Math.max(max, dayTotal);
    }, 0);

    const avgPerDay = data.length > 0 ? grandTotal / data.length : 0;

    return { totals, grandTotal, maxDay, avgPerDay, tagsCount: tags.length };
  }, [data, tags]);

  // Toggle tag
  const toggleTag = (tag: string) => {
    setHiddenTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full">
      {/* Totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.grandTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Tags</p>
          <p className="font-bold text-sm md:text-base">{metrics.tagsCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Maior Dia</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.maxDay)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Média/Dia</p>
          <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.avgPerDay)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height as any}>
        <BarChart data={visibleData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(d) => String(Number(String(d).split('-').slice(-1)[0]))} 
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip content={<CustomTooltip tags={tags} tagNames={tagNames} />} />
          <Legend 
            formatter={(value) => tagNames?.[value] || value}
            onClick={(e) => {
              // e.value contém o display name, precisamos encontrar o tag original
              const originalTag = tags.find(t => (tagNames?.[t] || t) === e.value) || e.value;
              toggleTag(originalTag);
            }}
            wrapperStyle={{ cursor: 'pointer', fontSize: '13px' }}
            iconType="circle"
          />
          {tags.map((tag, idx) => {
            const display = tagNames?.[tag] || tag;
            return (
              <Bar
                key={tag}
                dataKey={tag}
                stackId="a"
                fill={getColor(idx)}
                name={display}
                opacity={hiddenTags.has(tag) ? 0.3 : 1}
                style={{ 
                  cursor: 'pointer',
                  transition: 'opacity 0.3s ease'
                }}
                animationDuration={800}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DailyTagChart;
