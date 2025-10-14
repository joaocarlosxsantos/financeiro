'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseData {
  categoryName: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdownChartProps {
  data: ExpenseData[];
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#84CC16', // lime-500
  '#6B7280', // gray-500
  '#F97316', // orange-500
];

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  // Filtrar e limitar dados para melhor visualização
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Pegar apenas os 6 maiores gastos para evitar poluição visual
    const sortedData = [...data]
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    
    return sortedData.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      displayAmount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(item.amount),
      percentage: Math.max(item.percentage, 0.1) // Mín 0.1% para visibilidade
    }));
  }, [data]);

  const total = processedData.reduce((sum: number, item: ExpenseData) => sum + item.amount, 0);
  const maxAmount = Math.max(...processedData.map(item => item.amount), 1);

  if (!processedData || processedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Distribuição de Gastos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Nenhum gasto encontrado neste período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Distribuição de Gastos por Categoria
        </CardTitle>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(total)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processedData.map((item, index) => (
            <div key={item.categoryName} className="space-y-3 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
              {/* Header da categoria */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow-md ring-1 ring-gray-200 dark:ring-gray-600"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {item.categoryName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span>{item.percentage.toFixed(1)}% do total</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className="font-medium">{item.displayAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Barra de progresso melhorada */}
              <div className="relative">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{ 
                      width: `${Math.max((item.amount / maxAmount) * 100, 2)}%`,
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`
                    }}
                  />
                </div>
                {/* Porcentagem dentro da barra */}
                {item.percentage > 8 && (
                  <div 
                    className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
                    style={{ maxWidth: `${(item.amount / maxAmount) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
                {/* Porcentagem fora da barra se for muito pequena */}
                {item.percentage <= 8 && (
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Resumo */}
          {processedData.length === 6 && data.length > 6 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Mostrando os 6 maiores gastos de {data.length} categorias
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}