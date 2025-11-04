'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ScenarioResult } from '@/lib/scenario-simulator';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioComparisonProps {
  results: ScenarioResult[];
}

export function ScenarioComparison({ results }: ScenarioComparisonProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comparação de Cenários</h3>
      
      <div className="grid gap-4">
        {results.map((result) => (
          <Card 
            key={result.id} 
            className="p-4"
            style={{ borderLeft: `4px solid ${result.color}` }}
          >
            <h4 className="font-semibold mb-3">{result.name}</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Saldo Final */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Final</p>
                  <p className="text-lg font-semibold">
                    R$ {result.summary.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Total Economizado */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Economizado</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    R$ {result.summary.totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Taxa de Poupança */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de Poupança</p>
                  <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {result.summary.savingsRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Média Mensal */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Médio</p>
                  <p className="text-lg font-semibold">
                    R$ {result.summary.averageMonthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Informações adicionais */}
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Saldo mais baixo:</span>
                <p className={cn(
                  "font-medium",
                  result.summary.lowestBalance < 0 ? "text-red-600" : "text-foreground"
                )}>
                  R$ {result.summary.lowestBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Saldo mais alto:</span>
                <p className="font-medium text-green-600">
                  R$ {result.summary.highestBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Total de Renda:</span>
                <p className="font-medium">
                  R$ {result.summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Total de Despesas:</span>
                <p className="font-medium">
                  R$ {result.summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Melhor vs Pior */}
      {results.length > 1 && (
        <Card className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
          <h4 className="font-semibold mb-3">Análise Comparativa</h4>
          
          <div className="space-y-2 text-sm">
            {(() => {
              const best = [...results].sort((a, b) => 
                b.summary.finalBalance - a.summary.finalBalance
              )[0];
              const worst = [...results].sort((a, b) => 
                a.summary.finalBalance - b.summary.finalBalance
              )[0];
              const diff = best.summary.finalBalance - worst.summary.finalBalance;
              
              return (
                <>
                  <p>
                    <span className="font-medium" style={{ color: best.color }}>
                      {best.name}
                    </span>
                    {' '}é o cenário mais vantajoso, resultando em{' '}
                    <span className="font-semibold text-green-600">
                      R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {' '}a mais que{' '}
                    <span className="font-medium" style={{ color: worst.color }}>
                      {worst.name}
                    </span>.
                  </p>
                  
                  <p className="text-muted-foreground">
                    A diferença representa um ganho de{' '}
                    <span className="font-semibold">
                      {((diff / worst.summary.finalBalance) * 100).toFixed(1)}%
                    </span>
                    {' '}em relação ao pior cenário.
                  </p>
                </>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
