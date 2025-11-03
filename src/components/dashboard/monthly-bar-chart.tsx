import { useState, useMemo } from 'react';
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
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyBarChartProps {
  data: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  height?: number | string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
  const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
  const balance = payload.find((p: any) => p.dataKey === 'balance')?.value || 0;
  const saveRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4 min-w-[240px]">
      <p className="font-semibold text-card-foreground mb-3 text-base">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span className="text-sm text-muted-foreground">Ganhos:</span>
          </div>
          <span className="font-bold text-success">{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-danger" />
            <span className="text-sm text-muted-foreground">Gastos:</span>
          </div>
          <span className="font-bold text-danger">{formatCurrency(expense)}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-sm text-muted-foreground">Saldo:</span>
          </div>
          <span className={`font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-muted-foreground">Taxa de Poupança:</span>
          <span className="font-semibold text-xs">{saveRate}%</span>
        </div>
      </div>
    </div>
  );
};

export function MonthlyBarChart({ data, height = 300 }: MonthlyBarChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Calcular totalizadores
  const totals = useMemo(() => {
    const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
    const totalBalance = totalIncome - totalExpense;
    const avgIncome = data.length > 0 ? totalIncome / data.length : 0;
    const avgExpense = data.length > 0 ? totalExpense / data.length : 0;
    const saveRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0.0';

    return {
      totalIncome,
      totalExpense,
      totalBalance,
      avgIncome,
      avgExpense,
      saveRate,
    };
  }, [data]);

  const toggleSeries = (dataKey: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(dataKey)) {
      newHidden.delete(dataKey);
    } else {
      newHidden.add(dataKey);
    }
    setHiddenSeries(newHidden);
  };

  const handleLegendClick = (e: any) => {
    toggleSeries(e.dataKey);
  };

  return (
    <div className="w-full">
      {/* Totalizadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Ganhos</p>
          <p className="font-bold text-sm md:text-base text-success">{formatCurrency(totals.totalIncome)}</p>
          <p className="text-xs text-muted-foreground mt-1">Média: {formatCurrency(totals.avgIncome)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
          <p className="font-bold text-sm md:text-base text-danger">{formatCurrency(totals.totalExpense)}</p>
          <p className="text-xs text-muted-foreground mt-1">Média: {formatCurrency(totals.avgExpense)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Saldo Líquido</p>
          <p className={`font-bold text-sm md:text-base ${totals.totalBalance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(totals.totalBalance)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Taxa Poupança</p>
          <p className="font-bold text-sm md:text-base text-primary">{totals.saveRate}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height as any}>
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.28} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            onClick={handleLegendClick}
            wrapperStyle={{ cursor: 'pointer' }}
            formatter={(value) => value === 'income' ? 'Ganhos' : value === 'expense' ? 'Gastos' : value === 'balance' ? 'Saldo' : value}
          />
          {!hiddenSeries.has('income') && (
            <Bar dataKey="income" fill="hsl(var(--success))" name="Ganhos" animationDuration={800} />
          )}
          {!hiddenSeries.has('expense') && (
            <Bar dataKey="expense" fill="hsl(var(--danger))" name="Gastos" animationDuration={800} />
          )}
          {!hiddenSeries.has('balance') && (
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              name="Saldo"
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
              strokeWidth={2}
              animationDuration={800}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
