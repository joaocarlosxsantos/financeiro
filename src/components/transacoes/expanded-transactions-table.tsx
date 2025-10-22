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

interface ExpandedTransactionsTableProps {
  transactionType: 'expense' | 'income';
  from: string;
  to: string;
  currentDate: Date;
}

export function ExpandedTransactionsTable({
  transactionType,
  from,
  to,
  currentDate,
}: ExpandedTransactionsTableProps) {
  const [data, setData] = useState<ExpandedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [transactionType, from, to]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: transactionType,
        from,
        to,
        sort: 'date_desc',
        limit: '500',
      });

      const response = await fetch(`/api/transactions/expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar transações');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: ExpandedTransaction['category']) => {
    return category?.color || '#9CA3AF';
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(amount));
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'dd/MMM', { locale: pt });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Carregando transações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Data
              </th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Descrição
              </th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Categoria
              </th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Carteira
              </th>
              <th className="text-right py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Valor
              </th>
              <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                  {formatDate(transaction.date)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {transaction.isRecurringExpanded && (
                      <span
                        className="inline-block w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0"
                        title="Transação recorrente expandida (simulada para este mês)"
                      ></span>
                    )}
                    <span className="text-gray-900 dark:text-gray-100">
                      {transaction.description}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {transaction.category && (
                      <>
                        <div
                          className="w-3 h-3 rounded flex-shrink-0 border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: getCategoryColor(transaction.category) }}
                        ></div>
                        <span className="text-gray-900 dark:text-gray-100">
                          {transaction.category.name}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100 text-sm font-medium">
                  {transaction.wallet.name}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {formatAmount(transaction.amount)}
                </td>
                <td className="py-3 px-4">
                  {transaction.tags.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {transaction.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <strong className="text-gray-900 dark:text-gray-100">
            Total ({data.length} transações):
          </strong>{' '}
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(data.reduce((sum, t) => sum + Number(t.amount), 0).toString())}
          </span>
        </div>
      </div>
    </div>
  );
}
