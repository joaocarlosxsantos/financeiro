'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ExpandedTransaction {
  id: string;
  originalId: string;
  description: string;
  amount: string;
  date: string;
  type: 'PUNCTUAL' | 'RECURRING';
  category: {
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  } | null;
  wallet: {
    id: string;
    name: string;
    type: string;
  };
  tags: string[];
  paymentType: string;
  transferId: string | null;
  isRecurringExpanded: boolean;
  recurringInfo?: {
    dayOfMonth: number;
    originalStartDate: string | null;
    originalEndDate: string | null;
    occurrenceMonth: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DashboardTransactionsExpandedProps {
  year: number;
  month: number;
  walletId?: string;
}

export function DashboardTransactionsExpanded({
  year,
  month,
  walletId,
}: DashboardTransactionsExpandedProps) {
  const [expenses, setExpenses] = useState<ExpandedTransaction[]>([]);
  const [incomes, setIncomes] = useState<ExpandedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [year, month, walletId]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });

      if (walletId) {
        params.append('walletId', walletId);
      }

      const response = await fetch(`/api/dashboard/transactions-expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar transações expandidas');
      }

      const result = await response.json();
      setExpenses(result.expenses);
      setIncomes(result.incomes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(amount));
  };

  const getCategoryColor = (category: ExpandedTransaction['category']) => {
    return category?.color || '#9CA3AF';
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        Carregando transações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncomes = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="text-red-600">📉</span>
            Despesas ({expenses.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma despesa</p>
            ) : (
              expenses.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expense.isRecurringExpanded && (
                      <span
                        className="inline-block w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"
                        title="Recorrente expandida"
                      ></span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100 truncate font-medium">
                      {expense.description}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 ml-2 flex-shrink-0">
                    {formatAmount(expense.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Total:{' '}
              <span className="text-red-600 dark:text-red-400">
                {formatAmount(totalExpenses.toString())}
              </span>
            </p>
          </div>
        </div>

        {/* Incomes */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="text-green-600">📈</span>
            Receitas ({incomes.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {incomes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma receita</p>
            ) : (
              incomes.slice(0, 10).map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {income.isRecurringExpanded && (
                      <span
                        className="inline-block w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"
                        title="Recorrente expandida"
                      ></span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100 truncate font-medium">
                      {income.description}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 ml-2 flex-shrink-0">
                    {formatAmount(income.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Total:{' '}
              <span className="text-green-600 dark:text-green-400">
                {formatAmount(totalIncomes.toString())}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
