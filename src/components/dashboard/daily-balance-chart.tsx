'use client';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export interface DailyBalancePoint { date: string; balance: number }

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload[0]) return null;

  const balance = payload[0].value;
  const dayNumber = String(Number(String(label).split('-')[2]));

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-semibold text-card-foreground mb-2">Dia {dayNumber}</p>
      <div className="flex justify-between items-center gap-4">
        <span className="text-sm text-muted-foreground">Saldo:</span>
        <span className={`font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
};

export const DailyBalanceChart = ({ data }: { data: DailyBalancePoint[] }) => {
  // Calcular métricas
  const metrics = useMemo(() => {
    if (data.length === 0) return null;

    const balances = data.map(d => d.balance);
    const currentBalance = balances[balances.length - 1];
    const initialBalance = balances[0];
    const maxBalance = Math.max(...balances);
    const minBalance = Math.min(...balances);
    const avgBalance = balances.reduce((sum, b) => sum + b, 0) / balances.length;
    const variation = currentBalance - initialBalance;
    const variationPercent = initialBalance !== 0 ? ((variation / Math.abs(initialBalance)) * 100).toFixed(1) : '0.0';

    return {
      currentBalance,
      initialBalance,
      maxBalance,
      minBalance,
      avgBalance,
      variation,
      variationPercent,
    };
  }, [data]);

  return (
    <div className="w-full">
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 text-center">Sem movimentos no mês.</div>
      ) : (
        <>
          {/* Totalizadores */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                <p className={`font-bold text-sm md:text-base ${metrics.currentBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(metrics.currentBalance)}
                </p>
                <p className={`text-xs mt-1 ${metrics.variation >= 0 ? 'text-success' : 'text-danger'}`}>
                  {metrics.variation >= 0 ? '+' : ''}{metrics.variationPercent}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                <p className="font-bold text-sm md:text-base">{formatCurrency(metrics.initialBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Maior Saldo</p>
                <p className="font-bold text-sm md:text-base text-success">{formatCurrency(metrics.maxBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Menor Saldo</p>
                <p className="font-bold text-sm md:text-base text-danger">{formatCurrency(metrics.minBalance)}</p>
              </div>
            </div>
          )}

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(d) => String(Number(String(d).split('-')[2]))} 
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--border))" 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Saldo"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props || {};
                    const isPositive = payload?.balance >= 0;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3.2}
                        fill={isPositive ? 'hsl(var(--success))' : 'hsl(var(--danger))'}
                        stroke={isPositive ? 'hsl(var(--success) / 0.8)' : 'hsl(var(--danger) / 0.8)'}
                        strokeWidth={1}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
export default DailyBalanceChart;
