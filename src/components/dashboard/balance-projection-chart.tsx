'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export interface BalanceProjectionPoint { day: number; real: number; baseline: number }
export const BalanceProjectionChart = ({ data }: { data: BalanceProjectionPoint[] }) => {
  return (
    <div className="w-full h-72">
      {data.length === 0 ? (
        <div className="text-sm text-gray-500">Sem dados suficientes para projeção.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v:number)=> v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} labelFormatter={l=>`Dia ${l}`} />
            <Legend formatter={(value)=> value === 'baseline' ? 'Projeção Linear' : value === 'real' ? 'Real' : value} />
            <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} dot={false} name="Projeção Linear" />
            <Line type="monotone" dataKey="real" stroke="#10b981" strokeWidth={2} dot={false} name="Real" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default BalanceProjectionChart;
