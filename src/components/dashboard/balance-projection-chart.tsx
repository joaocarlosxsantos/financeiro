'use client';
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceArea } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export interface BalanceProjectionPoint { 
  day: number; 
  real?: number | undefined; 
  baselineLinear?: number | undefined; 
  baselineRecent?: number | undefined;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const real = payload.find((p: any) => p.dataKey === 'real')?.value;
  const linear = payload.find((p: any) => p.dataKey === 'baselineLinear')?.value;
  const recent = payload.find((p: any) => p.dataKey === 'baselineRecent')?.value;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-semibold text-card-foreground mb-2">Dia {label}</p>
      {real !== undefined && (
        <div className="flex justify-between items-center gap-4 mb-1">
          <span className="text-xs text-muted-foreground">Saldo Real:</span>
          <span className="font-bold text-sm text-success">{formatCurrency(real)}</span>
        </div>
      )}
      {linear !== undefined && (
        <div className="flex justify-between items-center gap-4 mb-1">
          <span className="text-xs text-muted-foreground">Proj. Linear:</span>
          <span className="font-medium text-sm text-primary">{formatCurrency(linear)}</span>
        </div>
      )}
      {recent !== undefined && (
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">Proj. Recente:</span>
          <span className="font-medium text-sm text-danger">{formatCurrency(recent)}</span>
        </div>
      )}
    </div>
  );
};

export const BalanceProjectionChart = ({ data }: { data: BalanceProjectionPoint[] }) => {
  // identificar último dia com dado real
  const lastRealDay = useMemo(() => {
    let d = 0;
    for (const pt of data) {
      if (pt.real !== undefined && !isNaN(pt.real)) d = pt.day;
    }
    return d;
  }, [data]);

  // Calcular métricas
  const metrics = useMemo(() => {
    if (data.length === 0) return null;

    const realData = data.filter(d => d.real !== undefined && !isNaN(d.real));
    if (realData.length === 0) return null;

    const currentBalance = realData[realData.length - 1].real!;
    const initialBalance = realData[0].real!;
    
    // Projeções finais
    const finalLinear = data[data.length - 1].baselineLinear;
    const finalRecent = data[data.length - 1].baselineRecent;
    
    // Variação projetada
    const linearVariation = finalLinear !== undefined ? finalLinear - currentBalance : 0;
    const recentVariation = finalRecent !== undefined ? finalRecent - currentBalance : 0;

    return {
      currentBalance,
      initialBalance,
      finalLinear,
      finalRecent,
      linearVariation,
      recentVariation,
      projectionDays: data.length - lastRealDay,
    };
  }, [data, lastRealDay]);

  return (
    <div className="w-full">
      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 text-center">
          Sem dados suficientes para projeção.
        </div>
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
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Proj. Linear</p>
                <p className="font-bold text-sm md:text-base text-primary">
                  {metrics.finalLinear !== undefined ? formatCurrency(metrics.finalLinear) : '-'}
                </p>
                <p className={`text-xs mt-1 ${metrics.linearVariation >= 0 ? 'text-success' : 'text-danger'}`}>
                  {metrics.linearVariation >= 0 ? '+' : ''}{formatCurrency(metrics.linearVariation)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Proj. Recente</p>
                <p className="font-bold text-sm md:text-base text-danger">
                  {metrics.finalRecent !== undefined ? formatCurrency(metrics.finalRecent) : '-'}
                </p>
                <p className={`text-xs mt-1 ${metrics.recentVariation >= 0 ? 'text-success' : 'text-danger'}`}>
                  {metrics.recentVariation >= 0 ? '+' : ''}{formatCurrency(metrics.recentVariation)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Dias Projetados</p>
                <p className="font-bold text-sm md:text-base">{metrics.projectionDays}</p>
              </div>
            </div>
          )}

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => {
                    if (value === 'baselineLinear') return 'Projeção Linear Global';
                    if (value === 'baselineRecent') return 'Projeção Ritmo Recente';
                    if (value === 'real') return 'Saldo Real';
                    return value;
                  }}
                  wrapperStyle={{ fontSize: '13px' }}
                />
                
                <Line
                  type="monotone"
                  dataKey="baselineLinear"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls={false}
                  strokeDasharray="6 4"
                  name="Projeção Linear Global"
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="baselineRecent"
                  stroke="hsl(var(--danger))"
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls={false}
                  strokeDasharray="5 3"
                  name="Projeção Ritmo Recente"
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  name="Saldo Real"
                  connectNulls={false}
                  dot={(props) => {
                    const p = props as { cx?: number; cy?: number; payload?: { day?: number }; index?: number };
                    const { cx, cy, payload, index } = p;
                    const isReal = payload?.day !== undefined && payload.day <= lastRealDay;
                    if (cx == null || cy == null) return <></>;
                    return (
                      <circle
                        key={index ?? `${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={isReal ? 3.5 : 0}
                        fill={isReal ? 'hsl(var(--success))' : 'transparent'}
                        stroke={isReal ? 'hsl(145 60% 22%)' : 'transparent'}
                        strokeWidth={isReal ? 1 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
                
                {/* Sombrear período futuro */}
                {lastRealDay > 0 && lastRealDay < data[data.length-1].day && (
                  <ReferenceArea 
                    x1={lastRealDay} 
                    x2={data[data.length-1].day} 
                    fill="hsl(var(--muted))" 
                    fillOpacity={0.04} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
export default BalanceProjectionChart;
