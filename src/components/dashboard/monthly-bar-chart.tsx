import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
} from 'recharts';

interface MonthlyBarChartProps {
  data: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  height?: number | string;
}

export function MonthlyBarChart({ data, height = 300 }: MonthlyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height as any}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
        />
  <Legend formatter={(value)=> value === 'income' ? 'Entradas' : value === 'expense' ? 'Saídas' : value === 'balance' ? 'Saldo' : value} />
  <Bar dataKey="income" fill={`hsl(var(--success))`} name="Entradas" />
  <Bar dataKey="expense" fill={`hsl(var(--danger))`} name="Saídas" />
        <Line
          type="monotone"
          dataKey="balance"
          stroke={`hsl(var(--primary))`}
          name="Saldo"
          dot={false}
          strokeWidth={2}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
