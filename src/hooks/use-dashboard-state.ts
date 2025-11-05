/**
 * Hook customizado para gerenciar o estado e lógica de dados do Dashboard
 * Extrai toda a complexidade de gerenciamento de estado do componente DashboardContent
 * 
 * Responsabilidades:
 * - Gerenciar múltiplos estados de dados (summary, totals, wallets, etc)
 * - Executar 3 useEffects principais: cards, charts, e dados históricos
 * - Suportar modo demo para onboarding/tour
 * - Lidar com filtros de carteira e tipo de pagamento
 * - Lógica de cálculo de saldos e comparações mensais
 * 
 * @module hooks/use-dashboard-state
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMonth } from '@/components/providers/month-provider';
import { PaymentType } from '@/components/ui/payment-type-multi-select';
import { fetchAll } from '@/lib/fetchAll';
import { getMonthRange } from '@/lib/utils';
import { SmartInsight, generateSmartInsights } from '@/components/dashboard/smart-insights-widget';
import { generateMonthComparisonData, MonthComparisonData } from '@/components/dashboard/month-comparison-card';
import { QuickInsightsData } from '@/components/dashboard/quick-insights-card';
import { isTransferCategory } from '@/lib/transaction-filters';

// Type definitions
export type Summary = {
  expensesByCategory: Array<{ category: string; amount: number; color: string }>;
  incomesByCategory: Array<{ category: string; amount: number; color: string }>;
  monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>;
  topExpenseCategories: Array<{ category: string; amount: number; diff: number; prevAmount?: number }>;
  expenseDiffAll: Array<{ category: string; amount: number; diff: number; prevAmount: number }>;
  dailyBalanceData: Array<{ date: string; balance: number }>;
  balanceProjectionData: Array<{
    day: number;
    real?: number;
    baselineLinear?: number;
    baselineRecent?: number;
  }>;
  expensesByCategoryComplete?: Array<{ category: string; amount: number; color: string }>;
  incomesByCategoryComplete?: Array<{ category: string; amount: number; color: string }>;
  expenseDiffAllComplete?: Array<{ category: string; amount: number; diff: number; prevAmount: number }>;
};

export type DailyData = any[];
export type Wallet = { id: string; name: string; type: string };

export interface DashboardStateReturn {
  // Card data
  totalIncome: number;
  totalExpenses: number;
  saldoDoMes: number;
  saldoAcumulado: number;
  limiteDiario: number;

  // State setters
  setSaldoDoMes: (v: number) => void;
  setSaldoAcumulado: (v: number) => void;
  setTotalIncome: (v: number) => void;
  setTotalExpenses: (v: number) => void;
  setLimiteDiario: (v: number) => void;

  // Summary data
  summary: Summary;
  setSummary: (v: Summary | ((prev: Summary) => Summary)) => void;

  // Daily data
  dailyByCategory: DailyData;
  dailyByWallet: DailyData;
  dailyByTag: DailyData;
  setByCategory: (v: DailyData) => void;
  setByWallet: (v: DailyData) => void;
  setByTag: (v: DailyData) => void;

  // Wallets
  wallets: Wallet[];
  setWallets: (v: Wallet[]) => void;
  selectedWallet: string[];
  setSelectedWallet: (v: string[]) => void;

  // Payment types
  selectedPaymentTypes: PaymentType[];
  setSelectedPaymentTypes: (v: PaymentType[]) => void;

  // Tags mapping
  tagNames: Record<string, string>;
  setTagNames: (v: Record<string, string>) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  loadingDaily: boolean;
  setLoadingDaily: (v: boolean) => void;
  chartsLoaded: boolean;
  setChartsLoaded: (v: boolean) => void;

  // Date navigation
  currentDate: Date;
  setCurrentDate: (v: Date) => void;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  isAtCurrentMonth: boolean;

  // Tour & demo
  tourOpen: boolean;
  setTourOpen: (v: boolean) => void;
  isDemoMode: boolean;

  // Modal states
  quickAddOpen: boolean;
  setQuickAddOpen: (v: boolean) => void;
  quickTab: 'despesa' | 'renda' | 'cartao' | 'transferencia';
  setQuickTab: (v: 'despesa' | 'renda' | 'cartao' | 'transferencia') => void;
  modal: null | 'income' | 'expense' | 'balance' | 'diff';
  setModal: (v: null | 'income' | 'expense' | 'balance' | 'diff') => void;
  chartModal: null | 'monthly' | 'top' | 'dailyCategory' | 'dailyWallet' | 'dailyTag';
  setChartModal: (v: null | 'monthly' | 'top' | 'dailyCategory' | 'dailyWallet' | 'dailyTag') => void;

  // Helper
  handleQuickAddSuccess: () => void;

  // Smart insights
  smartInsights: SmartInsight[];

  // Financial health data
  healthScoreData: {
    totalIncome: number;
    totalExpenses: number;
    saldoDoMes: number;
    savingsRate: number;
    consecutivePositiveMonths: number;
    goalsAchieved: number;
    totalGoals: number;
    expensesVsAverage: number;
  };

  // Month comparison data
  monthComparisonData: MonthComparisonData | null;

  // Quick insights data
  quickInsightsData: QuickInsightsData;
}

// Helper function to convert date to yyyy-MM-dd format
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Main hook for dashboard state management
 * Combines 3 API fetch patterns with demo mode support
 */
export function useDashboardState(): DashboardStateReturn {
  // ===== Basic card totals =====
  const [saldoDoMes, setSaldoDoMes] = useState<number>(0);
  const [saldoAcumulado, setSaldoAcumulado] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [limiteDiario, setLimiteDiario] = useState<number>(0);

  // ===== Summary & daily data =====
  const [summary, setSummary] = useState<Summary>({
    expensesByCategory: [],
    incomesByCategory: [],
    monthlyData: [],
    topExpenseCategories: [],
    expenseDiffAll: [],
    dailyBalanceData: [],
    balanceProjectionData: [],
    expensesByCategoryComplete: [],
    incomesByCategoryComplete: [],
    expenseDiffAllComplete: [],
  });

  const [dailyByCategory, setByCategory] = useState<DailyData>([]);
  const [dailyByWallet, setByWallet] = useState<DailyData>([]);
  const [dailyByTag, setByTag] = useState<DailyData>([]);

  // ===== Wallets & filters =====
  const [wallets, setWallets] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedWallet, setSelectedWallet] = useState<string[]>([]);
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<PaymentType[]>([]);

  // ===== Tag mapping =====
  const [tagNames, setTagNames] = useState<Record<string, string>>({});

  // ===== Loading states =====
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // ===== Modal states =====
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<'despesa' | 'renda' | 'cartao' | 'transferencia'>('despesa');
  const [modal, setModal] = useState<null | 'income' | 'expense' | 'balance' | 'diff'>(null);
  const [chartModal, setChartModal] = useState<
    null | 'monthly' | 'top' | 'dailyCategory' | 'dailyWallet' | 'dailyTag'
  >(null);

  // ===== Tour =====
  const [tourOpen, setTourOpen] = useState(false);

  // ===== Date management =====
  const { currentDate, setCurrentDate } = useMonth();
  const today = new Date();
  const isAtCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();

  // ===== Demo mode detection =====
  const isDemoMode = useMemo(() => {
    try {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1';
    } catch {
      return false;
    }
  }, []);

  // ===== Month navigation =====
  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate, setCurrentDate]);

  const handleNextMonth = useCallback(() => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (
      next.getFullYear() > today.getFullYear() ||
      (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())
    ) {
      return;
    }
    setCurrentDate(next);
  }, [currentDate, setCurrentDate, today]);

  // ===== Effect 1: Fetch cards data =====
  useEffect(() => {
    const controller = new AbortController();
    const fetchCards = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const walletParam =
          selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';
        const paymentTypeParam =
          selectedPaymentTypes && selectedPaymentTypes.length > 0
            ? `&paymentType=${selectedPaymentTypes.join(',')}`
            : '';
        const res = await fetch(
          `/api/dashboard/cards?year=${year}&month=${month}${walletParam}${paymentTypeParam}`,
          { cache: 'no-store', signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();

        setTotalExpenses(data.totalExpenses || 0);
        setTotalIncome(data.totalIncomes || 0);
        setSaldoDoMes((data.totalIncomes || 0) - (data.totalExpenses || 0));
        setSaldoAcumulado(data.saldoAcumulado || 0);
        setLimiteDiario(data.limiteDiario || 0);
        if (Array.isArray(data.wallets)) setWallets(data.wallets);
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return;
      }
    };
    fetchCards();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet, selectedPaymentTypes, currentDate]);

  // ===== Effect 2: Fetch charts data =====
  useEffect(() => {
    const controller = new AbortController();
    const fetchCharts = async () => {
      try {
        setChartsLoaded(false);
        setLoadingDaily(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const walletParam =
          selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';
        const paymentTypeParam =
          selectedPaymentTypes && selectedPaymentTypes.length > 0
            ? `&paymentType=${selectedPaymentTypes.join(',')}`
            : '';
        const res = await fetch(
          `/api/dashboard/charts?year=${year}&month=${month}${walletParam}${paymentTypeParam}`,
          { cache: 'no-store', signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();

        const newSummary = (() => {
          const s = data.summary || {};
          return (prev: Summary) => {
            const merged: typeof prev = { ...prev };
            if (s.expensesByCategory && Array.isArray(s.expensesByCategory))
              merged.expensesByCategory = s.expensesByCategory;
            if (s.incomesByCategory && Array.isArray(s.incomesByCategory))
              merged.incomesByCategory = s.incomesByCategory;
            if (s.monthlyData && Array.isArray(s.monthlyData)) merged.monthlyData = s.monthlyData;
            if (s.topExpenseCategories && Array.isArray(s.topExpenseCategories))
              merged.topExpenseCategories = s.topExpenseCategories;
            if (s.expenseDiffAll && Array.isArray(s.expenseDiffAll))
              merged.expenseDiffAll = s.expenseDiffAll;
            if (s.dailyBalanceData && Array.isArray(s.dailyBalanceData))
              merged.dailyBalanceData = s.dailyBalanceData;
            if (s.balanceProjectionData && Array.isArray(s.balanceProjectionData))
              merged.balanceProjectionData = s.balanceProjectionData;
            return merged;
          };
        })();

        const newDailyByCategory = data.dailyByCategory || [];
        const newDailyByWallet = data.dailyByWallet || [];
        const newDailyByTag = data.dailyByTag || [];

        setSummary(newSummary);
        setByCategory(newDailyByCategory);
        setByWallet(newDailyByWallet);
        setByTag(newDailyByTag);
        setChartsLoaded(true);
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return;
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchCharts();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet, selectedPaymentTypes, currentDate]);

  // ===== Effect 3: Fetch summary & historical data =====
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);

      // Demo mode
      if (isDemoMode) {
        const fakeWallets = [{ id: 'w1', name: 'Carteira Demo', type: 'cash' }];
        setWallets(fakeWallets as any);
        const totalIncomeLocal = 12500;
        const totalExpensesLocal = 7800;
        const saldoDoMesLocal = totalIncomeLocal - totalExpensesLocal;
        setTotalIncome(totalIncomeLocal);
        setTotalExpenses(totalExpensesLocal);
        setSaldoDoMes(saldoDoMesLocal);
        setSaldoAcumulado(45200);
        setLimiteDiario(120);

        const demoMonthly = Array.from({ length: 12 }).map((_, i) => {
          const month = new Date();
          month.setMonth(month.getMonth() - (11 - i));
          const label = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
          const income = 8000 + Math.round(Math.sin(i / 2) * 1500 + Math.random() * 800);
          const expense = 5000 + Math.round(Math.cos(i / 3) * 1200 + Math.random() * 600);
          return { month: label, income, expense, balance: income - expense };
        });

        const demoDailyBalance = Array.from({ length: 30 }).map((_, idx) => ({
          date: toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), idx + 1)),
          balance: 30000 + idx * 50 + Math.round(Math.sin(idx / 3) * 400),
        }));

        const demoProjection = Array.from({ length: 30 }).map((_, idx) => ({
          day: idx + 1,
          real: 30000 + idx * 50 + Math.round(Math.sin(idx / 4) * 300),
        }));

        const demoExpensesByCategory = [
          { category: 'Alimentação', amount: 3200, color: '#f97316' },
          { category: 'Moradia', amount: 1800, color: '#ef4444' },
          { category: 'Transporte', amount: 800, color: '#60a5fa' },
          { category: 'Lazer', amount: 600, color: '#a78bfa' },
          { category: 'Saúde', amount: 400, color: '#34d399' },
        ];

        const demoIncomesByCategory = [{ category: 'Salário', amount: 12500, color: '#10b981' }];

        const demoDailyByCategory = Array.from({ length: 30 }).flatMap((_, dayIdx) =>
          demoExpensesByCategory.map((c) => ({
            date: toYmd(
              new Date(new Date().getFullYear(), new Date().getMonth(), dayIdx + 1)
            ),
            category: c.category,
            amount: Math.round((c.amount / 30) * (0.5 + Math.random())),
            color: c.color,
          }))
        );

        const demoWallets = [{ id: 'w1', name: 'Carteira Demo', type: 'cash', color: '#f43f5e' }];
        setWallets(demoWallets as any);
        const demoDailyByWallet = Array.from({ length: 30 }).map((_, dayIdx) => ({
          date: toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), dayIdx + 1)),
          wallet: demoWallets[0].name,
          amount: Math.round(200 + Math.random() * 150),
        }));

        const demoDailyByTag = Array.from({ length: 30 }).flatMap((_, dayIdx) => [
          {
            date: toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), dayIdx + 1)),
            tag: 'Almoço',
            amount: Math.round(20 + Math.random() * 30),
          },
          {
            date: toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), dayIdx + 1)),
            tag: 'Uber',
            amount: Math.round(5 + Math.random() * 20),
          },
        ]);

        setSummary({
          expensesByCategory: demoExpensesByCategory,
          incomesByCategory: demoIncomesByCategory,
          monthlyData: demoMonthly,
          topExpenseCategories: demoExpensesByCategory.slice(0, 5).map((c) => ({
            category: c.category,
            amount: c.amount,
            diff: Math.round((Math.random() - 0.5) * 300),
          })),
          expenseDiffAll: demoExpensesByCategory.map((c) => ({
            category: c.category,
            amount: c.amount,
            diff: Math.round((Math.random() - 0.5) * 300),
            prevAmount: Math.round(c.amount - Math.random() * 200),
          })),
          dailyBalanceData: demoDailyBalance,
          balanceProjectionData: demoProjection,
        });

        setByCategory(demoDailyByCategory);
        setByWallet(demoDailyByWallet);
        setByTag(demoDailyByTag);
        setChartsLoaded(true);
        setIsLoading(false);
        return;
      }

      // Real data fetching
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const { start, end } = getMonthRange(year, month);
      const startStr = toYmd(start);
      const endStr = toYmd(end);

      const fetchOpts: RequestInit = {
        cache: 'no-store',
        credentials: 'same-origin',
      };
      const walletParam =
        selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';

      try {
        const [expVar, expFix, incVar, incFix, tagsList] = await Promise.all([
          fetchAll(
            `/api/expenses?type=PUNCTUAL&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
            fetchOpts
          ),
          fetchAll(
            `/api/expenses?type=RECURRING&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
            fetchOpts
          ),
          fetchAll(
            `/api/incomes?type=PUNCTUAL&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
            fetchOpts
          ),
          fetchAll(
            `/api/incomes?type=RECURRING&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
            fetchOpts
          ),
          fetch('/api/tags', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
        ]);

        const tagIdToNameLocal: Record<string, string> = {};
        if (Array.isArray(tagsList)) for (const t of tagsList) tagIdToNameLocal[t.id] = t.name;
        setTagNames(tagIdToNameLocal);

        // Filtrar transferências ANTES de combinar
        const allExpenses: any[] = [...expVar, ...expFix].filter((e: any) => !isTransferCategory(e));
        const allIncomes: any[] = [...incVar, ...incFix].filter((i: any) => !isTransferCategory(i));

        const totalExpensesLocal = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const totalIncomeLocal = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

        const expenseMap = new Map<string, { amount: number; color: string }>();
        for (const e of allExpenses) {
          const key = e.category?.name || 'Sem categoria';
          const color = e.category?.color || 'hsl(var(--muted-foreground))';
          const cur = expenseMap.get(key) || { amount: 0, color };
          cur.amount += Number(e.amount);
          cur.color = color;
          expenseMap.set(key, cur);
        }
        const expensesByCategory = Array.from(expenseMap.entries()).map(([category, v]) => ({
          category,
          amount: v.amount,
          color: v.color,
        }));

        const incomeMap = new Map<string, { amount: number; color: string }>();
        for (const i of allIncomes) {
          const key = i.category?.name || 'Sem categoria';
          const color = i.category?.color || 'hsl(var(--success))';
          const cur = incomeMap.get(key) || { amount: 0, color };
          cur.amount += Number(i.amount);
          cur.color = color;
          incomeMap.set(key, cur);
        }
        const incomesByCategory = Array.from(incomeMap.entries()).map(([category, v]) => ({
          category,
          amount: v.amount,
          color: v.color,
        }));

        const topCategoriesAll = [...expensesByCategory];

        const prevMonth = new Date(currentDate);
        prevMonth.setMonth(currentDate.getMonth() - 1);
        const { start: prevStart, end: prevEnd } = getMonthRange(
          prevMonth.getFullYear(),
          prevMonth.getMonth() + 1
        );
        const prevStartStr = toYmd(prevStart);
        const prevEndStr = toYmd(prevEnd);

        let prevExpensesByCategory: Array<{ category: string; amount: number }> = [];
        try {
          const [prevExpVar, prevExpFix] = await Promise.all([
            fetchAll(
              `/api/expenses?type=PUNCTUAL&start=${prevStartStr}&end=${prevEndStr}${walletParam}&perPage=200&_=${Date.now()}`,
              { cache: 'no-store', credentials: 'same-origin' }
            ),
            fetchAll(
              `/api/expenses?type=RECURRING&start=${prevStartStr}&end=${prevEndStr}${walletParam}&perPage=200&_=${Date.now()}`,
              { cache: 'no-store', credentials: 'same-origin' }
            ),
          ]);
          const allPrevExpenses: any[] = [...prevExpVar, ...prevExpFix].filter((e: any) => !isTransferCategory(e));
          const prevExpenseMap = new Map<string, number>();
          for (const e of allPrevExpenses) {
            const key = e.category?.name || 'Sem categoria';
            prevExpenseMap.set(key, (prevExpenseMap.get(key) || 0) + Number(e.amount));
          }
          prevExpensesByCategory = Array.from(prevExpenseMap.entries()).map(([category, amount]) => ({
            category,
            amount,
          }));
        } catch {}

        const prevAmounts: Record<string, number> = {};
        for (const c of prevExpensesByCategory) prevAmounts[c.category] = c.amount;

        const categoriesWithDiff = topCategoriesAll.map((c) => ({
          category: c.category,
          amount: c.amount,
          prevAmount: prevAmounts[c.category] || 0,
          diff: c.amount - (prevAmounts[c.category] || 0),
        }));
        const expenseDiffAll = categoriesWithDiff
          .filter((c) => c.diff !== 0)
          .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        const topExpenseCategories = expenseDiffAll.slice(0, 5);

        setTotalIncome(totalIncomeLocal);
        setTotalExpenses(totalExpensesLocal);
        setSaldoDoMes(totalIncomeLocal - totalExpensesLocal);
        setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [currentDate, selectedWallet, isDemoMode]);

  // ===== Auto-start tour in demo mode =====
  useEffect(() => {
    if (isDemoMode && chartsLoaded && !tourOpen) {
      setTourOpen(true);
    }
  }, [isDemoMode, chartsLoaded, tourOpen]);

  // ===== Quick add success handler =====
  const handleQuickAddSuccess = useCallback(() => {
    setQuickAddOpen(false);
    setCurrentDate(new Date(currentDate));
  }, [currentDate, setCurrentDate]);

  // ===== Smart Insights - Gerar automaticamente =====
  const smartInsights = useMemo(() => {
    // Calcular taxa de poupança
    const savingsRate = totalIncome > 0 ? ((saldoDoMes / totalIncome) * 100) : 0;

    // Calcular despesas recorrentes (estimativa simples)
    const recurringExpenses = totalExpenses * 0.4; // Aproximação

    // Calcular comparação com mês anterior (se disponível)
    let monthComparison: { expensesDiff: number; incomeDiff: number } | undefined;
    let historicalData: { expenses: number[]; savingsRate?: number } | undefined;
    
    if (summary.topExpenseCategories.length > 0) {
      const totalPrevExpenses = summary.topExpenseCategories.reduce(
        (sum, cat) => sum + (cat.prevAmount || 0),
        0
      );
      
      if (totalPrevExpenses > 0) {
        const expensesDiff = ((totalExpenses - totalPrevExpenses) / totalPrevExpenses) * 100;
        monthComparison = { expensesDiff, incomeDiff: 0 };
        
        // Dados históricos para alertas inteligentes
        historicalData = {
          expenses: [totalPrevExpenses], // Pode ser expandido com mais meses
          savingsRate: totalPrevExpenses > 0 && totalIncome > 0 
            ? ((totalIncome - totalPrevExpenses) / totalIncome) * 100 
            : undefined,
        };
      }
    }

    return generateSmartInsights({
      totalIncome,
      totalExpenses,
      saldoDoMes,
      savingsRate,
      topExpenseCategories: summary.topExpenseCategories,
      recurringExpenses,
      monthComparison,
      historicalData, // Passar dados históricos para alertas inteligentes
    });
  }, [
    totalIncome,
    totalExpenses,
    saldoDoMes,
    summary.topExpenseCategories,
  ]);

  // ===== Financial Health Data =====
  const healthScoreData = useMemo(() => {
    const savingsRate = totalIncome > 0 ? ((saldoDoMes / totalIncome) * 100) : 0;
    
    // Calcular média de gastos (simplificado - usar mês anterior)
    const totalPrevExpenses = summary.topExpenseCategories.reduce(
      (sum, cat) => sum + (cat.prevAmount || 0),
      0
    );
    const expensesVsAverage = totalPrevExpenses > 0 
      ? ((totalExpenses - totalPrevExpenses) / totalPrevExpenses) * 100 
      : 0;

    return {
      totalIncome,
      totalExpenses,
      saldoDoMes,
      savingsRate,
      consecutivePositiveMonths: saldoDoMes > 0 ? 1 : 0, // Simplificado - pode ser expandido
      goalsAchieved: 0, // TODO: Integrar com sistema de metas
      totalGoals: 0, // TODO: Integrar com sistema de metas
      expensesVsAverage,
    };
  }, [
    totalIncome,
    totalExpenses,
    saldoDoMes,
    summary.topExpenseCategories,
  ]);

  // ===== Month Comparison Data =====
  const monthComparisonData = useMemo(() => {
    return generateMonthComparisonData(
      totalExpenses,
      totalIncome,
      summary.topExpenseCategories.map(cat => ({
        category: cat.category,
        amount: cat.amount,
        prevAmount: cat.prevAmount,
        diff: cat.diff,
      }))
    );
  }, [
    totalIncome,
    totalExpenses,
    summary.topExpenseCategories,
  ]);

  // ===== Quick Insights Data =====
  const quickInsightsData = useMemo(() => {
    // Encontrar maior gasto
    const biggestExpense = summary.expensesByCategory.length > 0
      ? summary.expensesByCategory.reduce((max, cat) => 
          cat.amount > max.amount ? cat : max
        )
      : { category: 'N/A', amount: 0 };

    // Calcular média diária (dias corridos do mês até hoje)
    const today = new Date();
    const currentDay = currentDate.getMonth() === today.getMonth() && 
                       currentDate.getFullYear() === today.getFullYear()
      ? today.getDate()
      : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    const averageDailyExpense = currentDay > 0 ? totalExpenses / currentDay : 0;
    
    // Projeção fim do mês
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const projectedMonthEnd = averageDailyExpense * daysInMonth;

    // Status de orçamento (simples - pode ser expandido com orçamento real)
    const estimatedBudget = totalIncome; // Simplificado
    const budgetPercentage = estimatedBudget > 0 ? (totalExpenses / estimatedBudget) * 100 : 0;

    const savingsRate = totalIncome > 0 ? ((saldoDoMes / totalIncome) * 100) : 0;

    return {
      savingsRate,
      biggestExpense: {
        category: biggestExpense.category,
        amount: biggestExpense.amount,
      },
      budgetStatus: {
        spent: totalExpenses,
        total: estimatedBudget,
        percentage: budgetPercentage,
      },
      daysToGoal: undefined, // TODO: Integrar com sistema de metas
      averageDailyExpense,
      projectedMonthEnd,
    };
  }, [
    totalIncome,
    totalExpenses,
    saldoDoMes,
    summary.expensesByCategory,
    currentDate,
  ]);

  return {
    // Card data
    totalIncome,
    totalExpenses,
    saldoDoMes,
    saldoAcumulado,
    limiteDiario,
    setSaldoDoMes,
    setSaldoAcumulado,
    setTotalIncome,
    setTotalExpenses,
    setLimiteDiario,

    // Summary
    summary,
    setSummary,

    // Daily data
    dailyByCategory,
    dailyByWallet,
    dailyByTag,
    setByCategory,
    setByWallet,
    setByTag,

    // Wallets
    wallets,
    setWallets,
    selectedWallet,
    setSelectedWallet,

    // Payment types
    selectedPaymentTypes,
    setSelectedPaymentTypes,

    // Tags
    tagNames,
    setTagNames,

    // Loading
    isLoading,
    setIsLoading,
    loadingDaily,
    setLoadingDaily,
    chartsLoaded,
    setChartsLoaded,

    // Date
    currentDate,
    setCurrentDate,
    handlePreviousMonth,
    handleNextMonth,
    isAtCurrentMonth,

    // Tour & demo
    tourOpen,
    setTourOpen,
    isDemoMode,

    // Modals
    quickAddOpen,
    setQuickAddOpen,
    quickTab,
    setQuickTab,
    modal,
    setModal,
    chartModal,
    setChartModal,

    // Helper
    handleQuickAddSuccess,

    // Smart insights
    smartInsights,

    // Financial health
    healthScoreData,

    // Month comparison
    monthComparisonData,

    // Quick insights
    quickInsightsData,
  };
}
