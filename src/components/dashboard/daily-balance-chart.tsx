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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v:number)=> v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} labelFormatter={l=>`Dia ${l}`} />
            <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default DailyBalanceChart;
