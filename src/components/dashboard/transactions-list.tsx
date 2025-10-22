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

interface TransactionListProps {
  type: 'expense' | 'income';
  from: string;
  to: string;
  categoryIds?: string;
  tags?: string;
  walletId?: string;
  sort?: 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc';
  page?: number;
  limit?: number;
}

export function TransactionsList({
  type,
  from,
  to,
  categoryIds,
  tags,
  walletId,
  sort = 'date_desc',
  page = 1,
  limit = 100,
}: TransactionListProps) {
  const [data, setData] = useState<ExpandedTransaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [type, from, to, categoryIds, tags, walletId, sort, page, limit]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type,
        from,
        to,
        sort,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (categoryIds) params.append('categoryIds', categoryIds);
      if (tags) params.append('tags', tags);
      if (walletId) params.append('walletId', walletId);

      const response = await fetch(`/api/transactions/expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar transações');
      }

      const result = await response.json();
      setData(result.data);
      setPagination(result.pagination);
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
    return format(new Date(dateStr + 'T00:00:00'), 'dd/MMM/yyyy', { locale: pt });
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
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Data
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Descrição
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Categoria
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Carteira
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                Valor
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
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
                        title="Recorrente expandida"
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
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
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

      {/* Paginação */}
      <div className="flex items-center justify-between mt-6 text-sm text-gray-700 dark:text-gray-300">
        <div>
          Mostrando{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {(pagination.page - 1) * pagination.limit + 1}
          </span>{' '}
          a{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{' '}
          de{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {pagination.total}
          </span>{' '}
          resultados
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newPage = Math.max(1, pagination.page - 1);
              window.history.replaceState({}, '', `?page=${newPage}`);
            }}
            disabled={!pagination.hasPrev}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-900 dark:text-gray-100 transition-colors"
          >
            Anterior
          </button>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded font-semibold text-gray-900 dark:text-gray-100">
            {pagination.page}
          </span>
          <button
            onClick={() => {
              const newPage = Math.min(pagination.totalPages, pagination.page + 1);
              window.history.replaceState({}, '', `?page=${newPage}`);
            }}
            disabled={!pagination.hasNext}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-900 dark:text-gray-100 transition-colors"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
}
