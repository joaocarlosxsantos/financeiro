'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandedTransaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  } | null;
  wallet: {
    id: string;
    name: string;
  };
  isRecurringExpanded: boolean;
}

interface SmartReportExpandedData {
  current: {
    expenses: ExpandedTransaction[];
    incomes: ExpandedTransaction[];
    totalExpenses: number;
    totalIncomes: number;
    balance: number;
    recurringExpensesCount: number;
    recurringIncomesCount: number;
  };
  previous: {
    totalExpenses: number;
    totalIncomes: number;
    balance: number;
  };
  comparison: {
    expensesDiff: number;
    incomesDiff: number;
    balanceDiff: number;
  };
}

interface SmartReportExpandedTransactionsProps {
  data: SmartReportExpandedData;
  loading?: boolean;
}

export function SmartReportExpandedTransactions({
  data,
  loading = false,
}: SmartReportExpandedTransactionsProps) {
  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getDiffColor = (diff: number): string => {
    if (diff > 0) return 'text-red-600'; // expenses increased (bad)
    if (diff < 0) return 'text-green-600'; // expenses decreased (good)
    return 'text-gray-600';
  };

  const getDiffIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="w-4 h-4" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">Carregando dados...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expenses Comparison */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Despesas</span>
              <ArrowDownLeft className="w-4 h-4 text-red-600" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(data.current.totalExpenses)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Mês anterior:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {formatCurrency(data.previous.totalExpenses)}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  getDiffColor(data.comparison.expensesDiff)
                )}
              >
                {getDiffIcon(data.comparison.expensesDiff)}
                {Math.abs(data.comparison.expensesDiff) > 0.01
                  ? formatCurrency(Math.abs(data.comparison.expensesDiff))
                  : 'Sem variação'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 pt-1">
                {data.current.recurringExpensesCount > 0 && (
                  <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-medium">
                    • {data.current.recurringExpensesCount} recorrências
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Incomes Comparison */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ganhos</span>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(data.current.totalIncomes)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Mês anterior:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {formatCurrency(data.previous.totalIncomes)}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  data.comparison.incomesDiff > 0
                    ? 'text-green-600 dark:text-green-400'
                    : data.comparison.incomesDiff < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {data.comparison.incomesDiff > 0 && <TrendingUp className="w-4 h-4" />}
                {data.comparison.incomesDiff < 0 && <TrendingDown className="w-4 h-4" />}
                {Math.abs(data.comparison.incomesDiff) > 0.01
                  ? formatCurrency(Math.abs(data.comparison.incomesDiff))
                  : 'Sem variação'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 pt-1">
                {data.current.recurringIncomesCount > 0 && (
                  <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-medium">
                    • {data.current.recurringIncomesCount} recorrências
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Balance Comparison */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo</span>
              <div className={cn('w-4 h-4', data.current.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                {data.current.balance >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div
                className={cn(
                  'text-2xl font-bold',
                  data.current.balance >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {formatCurrency(data.current.balance)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Mês anterior:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {formatCurrency(data.previous.balance)}
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  data.comparison.balanceDiff > 0
                    ? 'text-green-600 dark:text-green-400'
                    : data.comparison.balanceDiff < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {data.comparison.balanceDiff > 0 && <TrendingUp className="w-4 h-4" />}
                {data.comparison.balanceDiff < 0 && <TrendingDown className="w-4 h-4" />}
                {Math.abs(data.comparison.balanceDiff) > 0.01
                  ? formatCurrency(Math.abs(data.comparison.balanceDiff))
                  : 'Sem variação'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-red-600" />
              Despesas ({data.current.expenses.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {data.current.expenses.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Data
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Descrição
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Categoria
                    </th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.current.expenses.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          {tx.isRecurringExpanded && (
                            <div
                              className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"
                              title="Projeção de recorrência"
                            />
                          )}
                          {formatDate(tx.date)}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {tx.description}
                      </td>
                      <td className="py-2 px-3">
                        {tx.category ? (
                          <span className="inline-block px-2 py-1 rounded text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 text-xs font-medium border border-gray-200 dark:border-gray-700">
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma despesa registrada
              </div>
            )}
          </div>
          <div className="p-3 border-t bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-right">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Total:{' '}
              <span className="text-red-600 dark:text-red-400">
                {formatCurrency(data.current.totalExpenses)}
              </span>
            </span>
          </div>
        </Card>

        {/* Incomes */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              Ganhos ({data.current.incomes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {data.current.incomes.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Data
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Descrição
                    </th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Categoria
                    </th>
                    <th className="text-right py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.current.incomes.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          {tx.isRecurringExpanded && (
                            <div
                              className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"
                              title="Projeção de recorrência"
                            />
                          )}
                          {formatDate(tx.date)}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {tx.description}
                      </td>
                      <td className="py-2 px-3">
                        {tx.category ? (
                          <span className="inline-block px-2 py-1 rounded text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 text-xs font-medium border border-gray-200 dark:border-gray-700">
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-green-600 dark:text-green-400">
                        +{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum ganho registrado
              </div>
            )}
          </div>
          <div className="p-3 border-t bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-right">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Total:{' '}
              <span className="text-green-600 dark:text-green-400">
                {formatCurrency(data.current.totalIncomes)}
              </span>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
