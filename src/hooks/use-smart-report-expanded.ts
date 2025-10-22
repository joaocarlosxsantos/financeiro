'use client';

import { useState, useEffect } from 'react';

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

interface SmartReportData {
  period: {
    month: string;
    year: number;
    monthNum: number;
    from: string;
    to: string;
  };
  current: {
    expenses: ExpandedTransaction[];
    incomes: ExpandedTransaction[];
    totalExpenses: number;
    totalIncomes: number;
    balance: number;
    expensesCount: number;
    incomesCount: number;
    recurringExpensesCount: number;
    recurringIncomesCount: number;
  };
  previous: {
    month: string;
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

interface UseSmartReportExpandedOptions {
  month: string; // YYYY-MM
  walletId?: string;
}

interface UseSmartReportExpandedReturn {
  data: SmartReportData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSmartReportExpanded(options: UseSmartReportExpandedOptions): UseSmartReportExpandedReturn {
  const [data, setData] = useState<SmartReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: options.month,
      });

      if (options.walletId) {
        params.append('walletId', options.walletId);
      }

      const response = await fetch(`/api/smart-report/transactions-expanded?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do smart report');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [options.month, options.walletId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
