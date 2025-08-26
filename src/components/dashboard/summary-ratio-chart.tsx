'use client';

interface SummaryRatioChartProps {
  totalIncome: number;
  totalExpenses: number;
}

export function SummaryRatioChart({ totalIncome, totalExpenses }: SummaryRatioChartProps) {
  const safeIncome = Math.max(0, Number(totalIncome) || 0);
  const safeExpenses = Math.max(0, Number(totalExpenses) || 0);
  const balance = safeIncome - safeExpenses;

  const expensePct = safeIncome > 0 ? Math.min(100, (safeExpenses / safeIncome) * 100) : 0;
  const balancePct = safeIncome > 0 ? Math.max(0, 100 - expensePct) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          <span>Despesas</span>
        </div>
        <span className="font-medium">{expensePct.toFixed(1)}%</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          <span>Saldo</span>
        </div>
        <span className="font-medium">{balancePct.toFixed(1)}%</span>
      </div>

      <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full bg-red-500" style={{ width: `${expensePct}%` }} />
        <div className="h-full bg-blue-500" style={{ width: `${balancePct}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-md border p-3 text-center">
          <p className="text-gray-500">Renda</p>
          <p className="font-semibold text-green-600">
            {safeIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-gray-500">Despesas</p>
          <p className="font-semibold text-red-600">
            {safeExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-gray-500">Saldo</p>
          <p className={`font-semibold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {safeIncome === 0 && (
        <p className="text-xs text-gray-500">Sem renda no período. Percentuais exibidos como 0%.</p>
      )}
      {safeExpenses > safeIncome && (
        <p className="text-xs text-red-600">
          Atenção: despesas superiores à renda (
          {((safeExpenses / (safeIncome || 1)) * 100).toFixed(1)}%).
        </p>
      )}
    </div>
  );
}
