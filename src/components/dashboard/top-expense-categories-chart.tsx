'use client';
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface TopExpenseCategoriesChartProps {
  data: Array<{
    category: string;
    amount: number;
    prevAmount?: number;
    diff: number;
  }>;
  height?: number | string;
}

// Formata valores em uma forma compacta
function formatCompactCurrencyNumber(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  let suffix = '';
  let scaled = v;
  if (abs >= 1_000_000_000) {
    scaled = v / 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    scaled = v / 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    scaled = v / 1_000;
    suffix = 'K';
  }
  return `${scaled.toFixed(scaled >= 100 || suffix === '' ? 0 : 1)}${suffix}`;
}

function formatFullCurrency(v: number) {
  return formatCurrency(v);
}

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const diff = data.diff || 0;
  const currentAmount = data.amount || 0;
  const prevAmount = data.prevAmount ?? (currentAmount - diff);
  const percentChange = prevAmount !== 0 ? ((diff / Math.abs(prevAmount)) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px]">
      <p className="font-semibold text-card-foreground mb-2">{data.category}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">Mês Atual:</span>
          <span className="font-bold text-sm">{formatFullCurrency(currentAmount)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">Mês Anterior:</span>
          <span className="font-medium text-sm">{formatFullCurrency(prevAmount)}</span>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground">Variação:</span>
            <div className="text-right">
              <span className={`font-bold text-sm ${diff > 0 ? 'text-danger' : 'text-success'}`}>
                {diff > 0 ? '+' : ''}{formatFullCurrency(diff)}
              </span>
              <p className={`text-xs mt-0.5 ${diff > 0 ? 'text-danger' : 'text-success'}`}>
                ({diff > 0 ? '+' : ''}{percentChange}%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Label custom para exibir diff compacto + valor anterior/atual
const renderDiffLabel = (props: any) => {
  const { x = 0, y = 0, width = 0, height = 0, value, payload } = props || {};
  if (typeof value !== 'number' || !payload) return null;
  const diff = Number(value);
  const prevAmount: number = Number(payload.prevAmount ?? (payload.amount - diff));
  const currentAmount: number = Number(payload.amount);
  const diffCompact = `${diff > 0 ? '+' : ''}${formatCompactCurrencyNumber(diff)}`;
  const color = diff > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))';
  const centerY = Number(y) + Number(height) / 2 + 4;
  const anchor = diff >= 0 ? 'start' : 'end';
  const textX = diff >= 0 ? Number(x) + Number(width) + 6 : Number(x) - 6;
  return (
    <g>
      <text
        x={textX}
        y={centerY}
        fontSize={12}
        fontWeight={600}
        textAnchor={anchor}
        fill={color}
      >
        {diffCompact}
      </text>
      <text
        x={textX}
        y={centerY + 12}
        fontSize={10}
        fontWeight={500}
        textAnchor={anchor}
        fill="hsl(var(--muted-foreground))"
      >
        {`${formatCompactCurrencyNumber(prevAmount)} → ${formatCompactCurrencyNumber(currentAmount)}`}
      </text>
    </g>
  );
};

export function TopExpenseCategoriesChart({ data, height }: TopExpenseCategoriesChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      category: d.category,
      diff: d.diff,
      amount: d.amount,
      prevAmount: d.prevAmount ?? (d.amount - d.diff),
    }));
  }, [data]);

  // Ajusta domínio simétrico baseado no maior |diff|
  const domain = useMemo(() => {
    const maxAbs = Math.max(0, ...data.map((d) => Math.abs(d.diff)));
    return maxAbs === 0 ? [0, 0] : [-maxAbs, maxAbs];
  }, [data]);

  // Calcular totalizadores
  const metrics = useMemo(() => {
    const totalCurrent = data.reduce((sum, d) => sum + d.amount, 0);
    const totalPrev = data.reduce((sum, d) => sum + (d.prevAmount ?? (d.amount - d.diff)), 0);
    const totalDiff = totalCurrent - totalPrev;
    const increases = data.filter(d => d.diff > 0).length;
    const decreases = data.filter(d => d.diff < 0).length;
    const unchanged = data.filter(d => d.diff === 0).length;

    return {
      totalCurrent,
      totalPrev,
      totalDiff,
      increases,
      decreases,
      unchanged,
      categoriesCount: data.length,
    };
  }, [data]);

  return (
    <div className="w-full">
      {/* Totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Atual</p>
          <p className="font-bold text-sm md:text-base">{formatFullCurrency(metrics.totalCurrent)}</p>
          <p className={`text-xs mt-1 ${metrics.totalDiff > 0 ? 'text-danger' : metrics.totalDiff < 0 ? 'text-success' : 'text-muted-foreground'}`}>
            {metrics.totalDiff > 0 ? '+' : ''}{formatFullCurrency(metrics.totalDiff)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Categorias</p>
          <p className="font-bold text-sm md:text-base">{metrics.categoriesCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Aumentos</p>
          <p className="font-bold text-sm md:text-base text-danger">{metrics.increases}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Reduções</p>
          <p className="font-bold text-sm md:text-base text-success">{metrics.decreases}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height ?? 300 as any}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 16, right: 72, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
          <XAxis
            type="number"
            domain={domain as [number, number]}
            tickFormatter={(v) => formatCompactCurrencyNumber(v)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            dataKey="category"
            type="category"
            width={170}
            tick={{
              fill: 'hsl(var(--foreground))',
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="diff"
            name="Variação"
            radius={[4, 4, 4, 4]}
            barSize={20}
            animationDuration={800}
          >
            {chartData.map((d) => (
              <Cell key={d.category} fill={d.diff > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))'} />
            ))}
            <LabelList content={renderDiffLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

