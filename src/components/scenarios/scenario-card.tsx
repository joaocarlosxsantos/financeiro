import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Trash2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { ScenarioParameters } from '@/lib/scenario-simulator';

interface ScenarioCardProps {
  scenario: ScenarioParameters & { id: string };
  onSimulate?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
}

export function ScenarioCard({ 
  scenario, 
  onSimulate, 
  onDelete,
  isSelected 
}: ScenarioCardProps) {
  const netChange = scenario.monthlyIncome - scenario.monthlyExpenses;
  const isPositive = netChange >= 0;

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-lg transition-all cursor-pointer",
        isSelected && "ring-2 ring-primary"
      )}
      style={{ borderLeft: `4px solid ${scenario.color}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{scenario.name}</h3>
          {scenario.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {scenario.description}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {onSimulate && (
            <Button size="sm" variant="outline" onClick={onSimulate}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Duração:</span>
          <p className="font-medium">{scenario.duration} meses</p>
        </div>
        
        <div>
          <span className="text-muted-foreground">Saldo Inicial:</span>
          <p className="font-medium">
            R$ {scenario.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div>
          <span className="text-muted-foreground">Renda Mensal:</span>
          <p className="font-medium">
            R$ {scenario.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {scenario.incomeChange && (
              <span className={cn(
                "ml-2 text-xs",
                scenario.incomeChange > 0 ? "text-green-600" : "text-red-600"
              )}>
                {scenario.incomeChange > 0 ? '+' : ''}{scenario.incomeChange}%
              </span>
            )}
          </p>
        </div>
        
        <div>
          <span className="text-muted-foreground">Despesas:</span>
          <p className="font-medium">
            R$ {scenario.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {scenario.expensesChange && (
              <span className={cn(
                "ml-2 text-xs",
                scenario.expensesChange < 0 ? "text-green-600" : "text-red-600"
              )}>
                {scenario.expensesChange > 0 ? '+' : ''}{scenario.expensesChange}%
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Indicadores de mudanças especiais */}
      <div className="mt-3 flex flex-wrap gap-2">
        {scenario.oneTimeExpense && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-xs">
            <AlertCircle className="h-3 w-3" />
            Gasto único: R$ {scenario.oneTimeExpense.toLocaleString('pt-BR')}
          </div>
        )}
        
        {scenario.oneTimeIncome && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs">
            <TrendingUp className="h-3 w-3" />
            Renda extra: R$ {scenario.oneTimeIncome.toLocaleString('pt-BR')}
          </div>
        )}
        
        {scenario.investmentReturn && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
            <TrendingUp className="h-3 w-3" />
            Retorno: {scenario.investmentReturn}% ao mês
          </div>
        )}
        
        {scenario.inflation && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded text-xs">
            <TrendingDown className="h-3 w-3" />
            Inflação: {scenario.inflation}% ao mês
          </div>
        )}
      </div>

      {/* Resultado líquido mensal */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Resultado mensal:</span>
          <span className={cn(
            "font-semibold",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? '+' : ''}R$ {netChange.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Card>
  );
}
