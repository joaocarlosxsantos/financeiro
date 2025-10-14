'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetGoal {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
}

interface BudgetProgressCardProps {
  budgetGoals: BudgetGoal[];
}

export function BudgetProgressCard({ budgetGoals }: BudgetProgressCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const getProgressPercentage = (spent: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return Math.min((Math.abs(spent) / budgeted) * 100, 100);
  };

  const getStatusIcon = (spent: number, budgeted: number) => {
    const percentage = getProgressPercentage(spent, budgeted);
    if (percentage <= 70) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage <= 90) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (spent: number, budgeted: number) => {
    const percentage = getProgressPercentage(spent, budgeted);
    if (percentage <= 70) return 'text-green-600 dark:text-green-400';
    if (percentage <= 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (spent: number, budgeted: number) => {
    const percentage = getProgressPercentage(spent, budgeted);
    if (percentage <= 70) return 'bg-green-500';
    if (percentage <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!budgetGoals || budgetGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progresso do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma meta orçamentária definida para este período.</p>
            <p className="text-sm mt-2">Configure suas metas para acompanhar o progresso dos gastos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBudgeted = budgetGoals.reduce((sum, goal) => sum + goal.budgeted, 0);
  const totalSpent = budgetGoals.reduce((sum, goal) => sum + Math.abs(goal.spent), 0);
  const overallProgress = getProgressPercentage(totalSpent, totalBudgeted);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progresso do Orçamento
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total orçado: {formatCurrency(totalBudgeted)}
          </div>
          <Badge variant={overallProgress > 90 ? "destructive" : overallProgress > 70 ? "secondary" : "default"}>
            {overallProgress.toFixed(0)}% utilizado
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progresso geral */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Progresso Geral</span>
              <span className={cn(
                "font-bold text-lg",
                getStatusColor(totalSpent, totalBudgeted)
              )}>
                {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
              </span>
            </div>
            <div className="relative">
              <Progress value={overallProgress} className="h-3" />
              <div 
                className={cn(
                  "absolute top-0 left-0 h-3 rounded-full transition-all",
                  getProgressColor(totalSpent, totalBudgeted)
                )}
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Progresso por categoria */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Por Categoria
            </h4>
            {budgetGoals.map((goal) => {
              const progress = getProgressPercentage(goal.spent, goal.budgeted);
              const isOverBudget = Math.abs(goal.spent) > goal.budgeted;
              
              return (
                <div key={goal.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(goal.spent, goal.budgeted)}
                      <span className="font-medium text-sm">{goal.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(Math.abs(goal.spent))} / {formatCurrency(goal.budgeted)}
                      </div>
                      <div className={cn(
                        "text-xs",
                        isOverBudget 
                          ? "text-red-600 dark:text-red-400" 
                          : goal.remaining > 0 
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                      )}>
                        {isOverBudget 
                          ? `Excedeu em ${formatCurrency(Math.abs(goal.remaining))}` 
                          : goal.remaining > 0 
                            ? `Restam ${formatCurrency(goal.remaining)}`
                            : 'Orçamento esgotado'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress value={progress} className="h-2" />
                    <div 
                      className={cn(
                        "absolute top-0 left-0 h-2 rounded-full transition-all",
                        getProgressColor(goal.spent, goal.budgeted)
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-right">
                    {progress.toFixed(1)}% do orçamento
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}