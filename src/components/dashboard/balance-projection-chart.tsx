'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceArea } from 'recharts';

export interface BalanceProjectionPoint { day: number; real: number; baselineLinear: number; baselineRecent: number }
export const BalanceProjectionChart = ({ data }: { data: BalanceProjectionPoint[] }) => {
  // identificar último dia com dado real (assumindo sequencial)
  const lastRealDay = (() => {
    let d = 0;
    for (const pt of data) {
      if (pt.real !== undefined && !isNaN(pt.real)) d = pt.day;
    }
    return d;
  })();
  return (
    <div className="w-full h-72">
      {data.length === 0 ? (
        <div className="text-sm text-gray-500">Sem dados suficientes para projeção.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v:number)=> v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} labelFormatter={l=>`Dia ${l}`} />
            <Legend formatter={(value)=> {
              if (value === 'baselineLinear') return 'Projeção Linear Global';
              if (value === 'baselineRecent') return 'Projeção Ritmo Recente';
              if (value === 'real') return 'Saldo Real';
              return value;
            }} />
            {/* Linhas de projeção com cores mais fortes para diferenciar do grid */}
            <Line
              type="monotone"
              dataKey="baselineLinear"
              stroke="#3b82f6" /* azul forte */
              strokeWidth={2.2}
              dot={false}
              strokeDasharray="6 4" /* traço mais longo para diferenciar do grid */
              name="Projeção Linear Global"
            />
            <Line
              type="monotone"
              dataKey="baselineRecent"
              stroke="#ef4444" /* vermelho forte */
              strokeWidth={2.2}
              dot={false}
              strokeDasharray="5 3" /* padrão distinto do anterior e do grid */
              name="Projeção Ritmo Recente"
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke="#10b981"
              strokeWidth={2}
              name="Saldo Real"
              dot={(props) => {
                // Recharts passes a variety of props to custom dot renderers.
                // We'll only extract the values we need and type them loosely enough
                // to satisfy TypeScript without leaking `any`.
                const p = props as { cx?: number; cy?: number; payload?: { day?: number }; index?: number };
                const { cx, cy, payload, index } = p;
                const isReal = payload?.day !== undefined && payload.day <= lastRealDay;
                // If coordinates are missing, render an empty fragment to satisfy Recharts typing
                if (cx == null || cy == null) return <></>;
                return (
                  <circle
                    key={index ?? `${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={isReal ? 3.5 : 0}
                    fill={isReal ? '#10b981' : 'transparent'}
                    stroke={isReal ? '#065f46' : 'transparent'}
                    strokeWidth={isReal ? 1 : 0}
                  />
                );
              }}
              activeDot={{ r: 5 }}
            />
            {/* sombrear período futuro */}
            {lastRealDay > 0 && lastRealDay < data[data.length-1].day && (
              <ReferenceArea x1={lastRealDay} x2={data[data.length-1].day} fill="#334155" fillOpacity={0.04} />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default BalanceProjectionChart;
