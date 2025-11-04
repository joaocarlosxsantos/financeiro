'use client';

/**
 * Month Comparison Card
 * 
 * Card que mostra comparações com o mês anterior:
 * - Tendência de gastos (↑↓)
 * - Tendência de receitas (↑↓)
 * - Categorias que mais cresceram/diminuíram
 * - Percentuais de mudança
 * 
 * @component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface MonthComparisonData {
  currentMonth: {
    income: number;
    expenses: number;
    balance: number;
  };
  previousMonth: {
    income: number;
    expenses: number;
    balance: number;
  };
  topChanges: Array<{
    category: string;
    current: number;
    previous: number;
    percentageChange: number;
    type: 'increase' | 'decrease';
  }>;
}

interface ComparisonItemProps {
  label: string;
  current: number;
  previous: number;
  type: 'income' | 'expense' | 'balance';
}

function ComparisonItem({ label, current, previous, type }: ComparisonItemProps) {
  const diff = current - previous;
  const percentageChange = previous !== 0 ? (diff / previous) * 100 : 0;
  
  // Para balance, inverter a lógica (positivo é bom)
  const isPositive = type === 'balance' ? diff >= 0 : diff <= 0;
  
  const colorClass = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(previous)} → {formatCurrency(current)}
        </div>
      </div>
      
      <div className={`flex items-center gap-1 ${colorClass} font-semibold`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">
          {diff > 0 ? '+' : ''}
          {percentageChange.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

interface CategoryChangeProps {
  category: string;
  current: number;
  previous: number;
  percentageChange: number;
  type: 'increase' | 'decrease';
}

function CategoryChange({ category, current, previous, percentageChange, type }: CategoryChangeProps) {
  const isIncrease = type === 'increase';
  const Icon = isIncrease ? ArrowUp : ArrowDown;
  const colorClass = isIncrease
    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
    : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';

  return (
    <div className={`flex items-center justify-between p-2 rounded-md ${colorClass}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{category}</div>
        <div className="text-xs opacity-80">
          {formatCurrency(previous)} → {formatCurrency(current)}
        </div>
      </div>
      
      <div className="flex items-center gap-1 font-bold text-sm ml-2">
        <Icon className="w-3.5 h-3.5" />
        {Math.abs(percentageChange).toFixed(0)}%
      </div>
    </div>
  );
}

interface MonthComparisonCardProps {
  data: MonthComparisonData;
}

export function MonthComparisonCard({ data }: MonthComparisonCardProps) {
  const increases = data.topChanges
    .filter(c => c.type === 'increase')
    .sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange))
    .slice(0, 3);

  const decreases = data.topChanges
    .filter(c => c.type === 'decrease')
    .sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange))
    .slice(0, 3);

  return (
    <Card data-tour="month-comparison">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Comparação com Mês Anterior
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparações gerais */}
        <div className="space-y-2">
          <ComparisonItem
            label="Receitas"
            current={data.currentMonth.income}
            previous={data.previousMonth.income}
            type="income"
          />
          <ComparisonItem
            label="Despesas"
            current={data.currentMonth.expenses}
            previous={data.previousMonth.expenses}
            type="expense"
          />
          <ComparisonItem
            label="Saldo"
            current={data.currentMonth.balance}
            previous={data.previousMonth.balance}
            type="balance"
          />
        </div>

        {/* Top aumentos */}
        {increases.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
              <ArrowUp className="w-4 h-4 text-red-600" />
              Categorias que mais cresceram
            </h4>
            <div className="space-y-1.5">
              {increases.map((item) => (
                <CategoryChange
                  key={item.category}
                  category={item.category}
                  current={item.current}
                  previous={item.previous}
                  percentageChange={item.percentageChange}
                  type="increase"
                />
              ))}
            </div>
          </div>
        )}

        {/* Top reduções */}
        {decreases.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
              <ArrowDown className="w-4 h-4 text-green-600" />
              Categorias que mais reduziram
            </h4>
            <div className="space-y-1.5">
              {decreases.map((item) => (
                <CategoryChange
                  key={item.category}
                  category={item.category}
                  current={item.current}
                  previous={item.previous}
                  percentageChange={item.percentageChange}
                  type="decrease"
                />
              ))}
            </div>
          </div>
        )}

        {/* Mensagem se não houver dados */}
        {increases.length === 0 && decreases.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Sem dados do mês anterior para comparação
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Processa dados para gerar comparação mensal
 */
export function generateMonthComparisonData(
  currentExpenses: number,
  currentIncome: number,
  categories: Array<{
    category: string;
    amount: number;
    prevAmount?: number;
    diff: number;
  }>
): MonthComparisonData | null {
  // Calcular totais do mês anterior
  const previousExpenses = categories.reduce(
    (sum, cat) => sum + (cat.prevAmount || 0),
    0
  );

  if (previousExpenses === 0 && currentExpenses === 0) {
    return null; // Sem dados suficientes
  }

  const previousIncome = currentIncome - (currentExpenses - previousExpenses); // Estimativa
  const currentBalance = currentIncome - currentExpenses;
  const previousBalance = previousIncome - previousExpenses;

  // Processar mudanças por categoria
  const topChanges = categories
    .filter(cat => cat.prevAmount !== undefined && cat.prevAmount > 0)
    .map(cat => {
      const percentageChange = ((cat.amount - (cat.prevAmount || 0)) / (cat.prevAmount || 1)) * 100;
      return {
        category: cat.category,
        current: cat.amount,
        previous: cat.prevAmount || 0,
        percentageChange,
        type: (cat.amount > (cat.prevAmount || 0) ? 'increase' : 'decrease') as 'increase' | 'decrease',
      };
    })
    .filter(cat => Math.abs(cat.percentageChange) > 5); // Apenas mudanças significativas (>5%)

  return {
    currentMonth: {
      income: currentIncome,
      expenses: currentExpenses,
      balance: currentBalance,
    },
    previousMonth: {
      income: previousIncome,
      expenses: previousExpenses,
      balance: previousBalance,
    },
    topChanges,
  };
}
