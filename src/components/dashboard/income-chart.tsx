'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatCurrency } from '@/lib/utils';

interface IncomeChartProps {
  data: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
  maxItems?: number; // opcional: limitar número de categorias exibidas
}

export function IncomeChart({ data, maxItems }: IncomeChartProps) {
  const isMobile = useIsMobile();
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  let chartData = data
    .map((item) => ({
      name: item.category, // já em português vindo do backend
      value: item.amount,
      color: item.color,
      percentage: ((item.amount / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value); // ordena decrescente
  if (maxItems && chartData.length > maxItems) {
    chartData = chartData.slice(0, maxItems);
  }

  return (
    <div className="w-full">
      <div className="h-72 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              label={false}
              labelLine={false}
              outerRadius={isMobile ? 100 : 150}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name: any, props: any) => {
                const pct = props?.payload?.percentage;
                return [formatCurrency(value) + (pct ? ` (${pct}%)` : ''), 'Valor'];
              }}
              labelFormatter={(label) => `Categoria: ${label}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2 w-full min-w-0 max-w-full">
        {chartData.map((item, index) => (
          <div
            key={index}
            className="flex w-full flex-col sm:flex-row sm:justify-between text-sm gap-2 min-w-0 items-start"
          >
            <div className="flex items-start space-x-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="whitespace-normal break-words">{item.name}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="font-medium">{formatCurrency(item.value)}</span>
              <span className="text-gray-500">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
