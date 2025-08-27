'use client';

interface SummaryFixedVariableChartProps {
  incomeFixed: number;
  incomeVariable: number;
  expenseFixed: number;
  expenseVariable: number;
}

export function SummaryFixedVariableChart({
  incomeFixed,
  incomeVariable,
  expenseFixed,
  expenseVariable,
}: SummaryFixedVariableChartProps) {
  const safe = (v: number) => Math.max(0, Number(v) || 0);
  const incF = safe(incomeFixed);
  const incV = safe(incomeVariable);
  const expF = safe(expenseFixed);
  const expV = safe(expenseVariable);

  const totalIncome = incF + incV;
  const totalExpense = expF + expV;

  const pct = (part: number, total: number) => (total > 0 ? ((part / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-md p-3 space-y-1">
          <p className="font-medium text-green-600">Entradas</p>
          <div className="flex justify-between"><span>Fixas</span><span>{pct(incF, totalIncome)}%</span></div>
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: pct(incF, totalIncome) + '%' }} />
          </div>
          <div className="flex justify-between mt-2"><span>Variáveis</span><span>{pct(incV, totalIncome)}%</span></div>
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div className="h-full bg-emerald-300" style={{ width: pct(incV, totalIncome) + '%' }} />
          </div>
        </div>
        <div className="border rounded-md p-3 space-y-1">
          <p className="font-medium text-red-600">Saídas</p>
          <div className="flex justify-between"><span>Fixas</span><span>{pct(expF, totalExpense)}%</span></div>
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: pct(expF, totalExpense) + '%' }} />
            </div>
          <div className="flex justify-between mt-2"><span>Variáveis</span><span>{pct(expV, totalExpense)}%</span></div>
            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-red-300" style={{ width: pct(expV, totalExpense) + '%' }} />
            </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center border rounded-md p-2">
          <p className="text-gray-500">Total Entradas</p>
          <p className="font-semibold text-green-600">{totalIncome.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
        </div>
        <div className="text-center border rounded-md p-2">
          <p className="text-gray-500">Total Saídas</p>
          <p className="font-semibold text-red-600">{totalExpense.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
        </div>
      </div>
    </div>
  );
}

export default SummaryFixedVariableChart;
