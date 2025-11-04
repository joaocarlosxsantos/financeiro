'use client';

/**
 * Quick Insights Card
 * 
 * Card que mostra insights rápidos e métricas importantes:
 * - Taxa de economia mensal
 * - Maior gasto do mês
 * - Dias até próxima meta
 * - Status de orçamento
 * 
 * @component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingDown, Target, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface QuickInsightsData {
  savingsRate: number; // Percentual de economia
  biggestExpense: {
    category: string;
    amount: number;
  };
  budgetStatus: {
    spent: number;
    total: number;
    percentage: number;
  };
  daysToGoal?: number; // Dias até próxima meta
  averageDailyExpense: number;
  projectedMonthEnd: number;
}

interface QuickInsightsCardProps {
  data: QuickInsightsData;
}

interface InsightItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

function InsightItem({ icon, label, value, subtext, color = 'text-foreground' }: InsightItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={`mt-0.5 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className={`text-sm font-semibold ${color} truncate`}>{value}</div>
        {subtext && (
          <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>
        )}
      </div>
    </div>
  );
}

export function QuickInsightsCard({ data }: QuickInsightsCardProps) {
  const budgetColor = data.budgetStatus.percentage >= 100
    ? 'text-red-600 dark:text-red-400'
    : data.budgetStatus.percentage >= 80
    ? 'text-yellow-600 dark:text-yellow-500'
    : 'text-green-600 dark:text-green-400';

  const savingsColor = data.savingsRate >= 20
    ? 'text-green-600 dark:text-green-400'
    : data.savingsRate >= 10
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-yellow-600 dark:text-yellow-500';

  return (
    <Card data-tour="quick-insights">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Insights Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {/* Taxa de Economia */}
        <InsightItem
          icon={<DollarSign className="w-4 h-4" />}
          label="Taxa de Economia"
          value={`${data.savingsRate.toFixed(1)}%`}
          subtext={
            data.savingsRate >= 20
              ? 'Excelente! Meta de 20% alcançada'
              : data.savingsRate >= 10
              ? 'Bom! Continue economizando'
              : 'Tente aumentar sua economia'
          }
          color={savingsColor}
        />

        {/* Maior Gasto */}
        <InsightItem
          icon={<TrendingDown className="w-4 h-4" />}
          label="Maior Gasto do Mês"
          value={formatCurrency(data.biggestExpense.amount)}
          subtext={`Categoria: ${data.biggestExpense.category}`}
          color="text-red-600 dark:text-red-400"
        />

        {/* Status do Orçamento */}
        <InsightItem
          icon={
            data.budgetStatus.percentage >= 100 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )
          }
          label="Orçamento do Mês"
          value={`${data.budgetStatus.percentage.toFixed(0)}%`}
          subtext={`${formatCurrency(data.budgetStatus.spent)} de ${formatCurrency(data.budgetStatus.total)}`}
          color={budgetColor}
        />

        {/* Dias até Próxima Meta */}
        {data.daysToGoal !== undefined && data.daysToGoal > 0 && (
          <InsightItem
            icon={<Target className="w-4 h-4" />}
            label="Próxima Meta"
            value={`${data.daysToGoal} dias`}
            subtext="Continue economizando!"
            color="text-blue-600 dark:text-blue-400"
          />
        )}

        {/* Média Diária */}
        <div className="pt-2 border-t border-muted">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Gasto médio diário:</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(data.averageDailyExpense)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Projeção fim do mês:</span>
            <span className={`font-semibold ${
              data.projectedMonthEnd > data.budgetStatus.total
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(data.projectedMonthEnd)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
