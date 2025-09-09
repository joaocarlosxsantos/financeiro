'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface DailyBalancePoint { date: string; balance: number }
export const DailyBalanceChart = ({ data }: { data: DailyBalancePoint[] }) => {
  return (
    <div className="w-full h-72">
      {data.length === 0 ? (
        <div className="text-sm text-gray-500">Sem movimentos no mês.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d) => String(Number(String(d).split('-')[2]))} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <Tooltip formatter={(v:number)=> v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} labelFormatter={(label) => `Dia ${String(Number(String(label).split('-')[2]))}`} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={`hsl(var(--primary))`}
              strokeWidth={2}
              name="Saldo"
              // Exibe pontos apenas nos dias que existem dados (todos os itens do array recebido)
              dot={(props: { cx?: number | string; cy?: number | string; index?: number | string }) => {
                const { cx, cy, index } = props || {};
                const key = index ?? `${cx ?? ''}-${cy ?? ''}`;
                return (
                  <circle
                    key={String(key)}
                    cx={cx as any}
                    cy={cy as any}
                    r={3.2}
                    fill={`hsl(var(--primary))`}
                    stroke={`hsl(var(--primary) / 0.8)`}
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default DailyBalanceChart;
