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
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
        />
        <Legend />
        <Bar dataKey="income" fill="#10b981" name="Entradas" />
        <Bar dataKey="expense" fill="#ef4444" name="Saídas" />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#3b82f6"
          name="Saldo"
          dot={false}
          strokeWidth={2}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
