import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';

interface TopExpenseCategoriesChartProps {
  data: Array<{
    category: string;
    amount: number;
    diff: number;
  }>;
}

export function TopExpenseCategoriesChart({ data }: TopExpenseCategoriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="category" type="category" width={120} />
        <Tooltip
          formatter={(value: number) =>
            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          }
        />
        <Bar dataKey="amount" fill="#ef4444" name="Despesas">
          <LabelList
            dataKey="diff"
            position="right"
            formatter={(diff: number) =>
              diff > 0
                ? `+${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                : diff < 0
                  ? `${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : ''
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
