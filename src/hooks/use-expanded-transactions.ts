'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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

interface UseExpandedTransactionsOptions {
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

interface UseExpandedTransactionsReturn {
  data: ExpandedTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useExpandedTransactions(options: UseExpandedTransactionsOptions): UseExpandedTransactionsReturn {
  const [data, setData] = useState<ExpandedTransaction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: options.type,
        from: options.from,
        to: options.to,
        sort: options.sort || 'date_desc',
        page: (options.page || 1).toString(),
        limit: (options.limit || 100).toString(),
      });

      if (options.categoryIds) params.append('categoryIds', options.categoryIds);
      if (options.tags) params.append('tags', options.tags);
      if (options.walletId) params.append('walletId', options.walletId);

      const response = await fetch(`/api/transactions/expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar transações expandidas');
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

  useEffect(() => {
    fetchTransactions();
  }, [options.type, options.from, options.to, options.categoryIds, options.tags, options.walletId, options.sort, options.page, options.limit]);

  return {
    data,
    pagination,
    loading,
    error,
    refetch: fetchTransactions,
  };
}
