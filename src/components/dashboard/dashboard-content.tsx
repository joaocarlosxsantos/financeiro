'use client';

import { useDailyExpenseData } from '@/hooks/use-dashboard-data';
import dynamic from 'next/dynamic';
const DailyCategoryChart = dynamic(
  () => import('./daily-category-chart').then((mod) => mod.DailyCategoryChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
const DailyWalletChart = dynamic(
  () => import('./daily-wallet-chart').then((mod) => mod.DailyWalletChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
const DynamicDailyTagChart = dynamic(
  () => import('./daily-tag-chart').then((mod) => mod.DailyTagChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import { DailyBalanceChart } from '@/components/dashboard/daily-balance-chart';
import { BalanceProjectionChart } from '@/components/dashboard/balance-projection-chart';
import { useMonth } from '@/components/providers/month-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Função utilitária local para formatar data yyyy-MM-dd
function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
import { formatCurrency, getMonthRange, getMonthYear } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
const ExpenseChart = dynamic(() => import('./expense-chart').then((mod) => mod.ExpenseChart), {
  ssr: false,
  loading: () => <div>Carregando gráfico...</div>,
});
const IncomeChart = dynamic(() => import('./income-chart').then((mod) => mod.IncomeChart), {
  ssr: false,
  loading: () => <div>Carregando gráfico...</div>,
});
import { Loader } from '@/components/ui/loader';
const SummaryRatioChart = dynamic(
  () => import('./summary-ratio-chart').then((mod) => mod.SummaryRatioChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
// Removido gráfico de Saídas por Tag (pizza) substituído por gráfico diário por Tag
const MonthlyBarChart = dynamic(
  () => import('./monthly-bar-chart').then((mod) => mod.MonthlyBarChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
const TopExpenseCategoriesChart = dynamic(
  () => import('./top-expense-categories-chart').then((mod) => mod.TopExpenseCategoriesChart),
  { ssr: false, loading: () => <div>Carregando gráfico...</div> },
);
import { Modal } from '@/components/ui/modal';
import { Fab } from '@/components/ui/fab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import QuickDespesaForm from '../quick-add/quick-despesa-form';
import QuickRendaForm from '../quick-add/quick-renda-form';

import React from 'react';

export function DashboardContent() {
  const [saldoDoMes, setSaldoDoMes] = useState<number>(0);
  const [saldoAcumulado, setSaldoAcumulado] = useState<number>(0);
  // Estado para modal de adição rápida e tabs
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<'despesa' | 'renda'>('despesa');
  const [modal, setModal] = useState<null | 'income' | 'expense' | 'balance'>(null);
  // Estados removidos: modal agora sempre mostra todas as categorias ordenadas.
  type Summary = {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    expensesByCategory: Array<{ category: string; amount: number; color: string }>;
    incomesByCategory: Array<{ category: string; amount: number; color: string }>;
    // removido: expensesByTag
    monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>;
    topExpenseCategories: Array<{ category: string; amount: number; diff: number }>;
    dailyBalanceData: Array<{ date: string; balance: number }>;
    balanceProjectionData: Array<{ day: number; real: number; baseline: number }>;
  };
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: [],
    incomesByCategory: [],
    // expensesByTag removido
    monthlyData: [],
    topExpenseCategories: [],
    dailyBalanceData: [],
    balanceProjectionData: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [limiteDiario, setLimiteDiario] = useState<number>(0);
  const [tagNames, setTagNames] = useState<Record<string, string>>({});
  const { currentDate, setCurrentDate } = useMonth();
  const today = new Date();
  const isAtCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();

  // Carregar dados dos cards do dashboard usando múltiplas APIs (lógica antiga)
  useEffect(() => {
    const fetchCards = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const { start, end } = getMonthRange(year, month);
      const startStr = toYmd(start);
      const endStr = toYmd(end);
      const fetchOpts: RequestInit = {
        cache: 'no-store',
        credentials: 'same-origin',
      };
      const walletParam = selectedWallet ? `&walletId=${selectedWallet}` : '';
      // Entradas e saídas do mês
      const [expVarRes, expFixRes, incVarRes, incFixRes] = await Promise.all([
        fetch(
          `/api/expenses?start=${startStr}&end=${endStr}${walletParam}&type=VARIABLE&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/expenses?start=${startStr}&end=${endStr}${walletParam}&type=FIXED&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?start=${startStr}&end=${endStr}${walletParam}&type=VARIABLE&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?start=${startStr}&end=${endStr}${walletParam}&type=FIXED&_=${Date.now()}`,
          fetchOpts,
        ),
      ]);
      const [expVar, expFix, incVar, incFix] = await Promise.all([
        expVarRes.ok ? expVarRes.json() : [],
        expFixRes.ok ? expFixRes.json() : [],
        incVarRes.ok ? incVarRes.json() : [],
        incFixRes.ok ? incFixRes.json() : [],
      ]);
      const allExpenses: any[] = [...expVar, ...expFix];
      const allIncomes: any[] = [...incVar, ...incFix];
      const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncome = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
      // Construir evolução diária do saldo (cumulativo)
      const dateKey = (dStr: string) => {
        try {
          return new Date(dStr);
        } catch {
          return new Date();
        }
      };
      const dayMap: Record<string, { income: number; expense: number }> = {};
      const pushItem = (arr: any[], type: 'income' | 'expense') => {
        for (const it of arr) {
          const rawDate = it.date || it.paidAt || it.createdAt || it.updatedAt;
          if (!rawDate) continue;
          const d = dateKey(rawDate);
          const key = d.toISOString().slice(0, 10);
          if (!dayMap[key]) dayMap[key] = { income: 0, expense: 0 };
          dayMap[key][type] += Number(it.amount) || 0;
        }
      };
      pushItem(allIncomes, 'income');
      pushItem(allExpenses, 'expense');
      const dayKeysSorted = Object.keys(dayMap).sort();
      // Calcular saldo acumulado até o último dia do mês anterior (previousBalance)
      let previousBalance = 0;
      {
        const prevEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // último dia mês anterior
        const prevEndStr = prevEnd.toISOString().slice(0,10);
        const [pExpVarRes, pExpFixRes, pIncVarRes, pIncFixRes] = await Promise.all([
          fetch(`/api/expenses?start=1900-01-01&end=${prevEndStr}${walletParam}&type=VARIABLE&_=${Date.now()}`, fetchOpts),
          fetch(`/api/expenses?start=1900-01-01&end=${prevEndStr}${walletParam}&type=FIXED&_=${Date.now()}`, fetchOpts),
          fetch(`/api/incomes?start=1900-01-01&end=${prevEndStr}${walletParam}&type=VARIABLE&_=${Date.now()}`, fetchOpts),
          fetch(`/api/incomes?start=1900-01-01&end=${prevEndStr}${walletParam}&type=FIXED&_=${Date.now()}`, fetchOpts),
        ]);
        const [pExpVar, pExpFix, pIncVar, pIncFix] = await Promise.all([
          pExpVarRes.ok ? pExpVarRes.json() : [],
          pExpFixRes.ok ? pExpFixRes.json() : [],
          pIncVarRes.ok ? pIncVarRes.json() : [],
          pIncFixRes.ok ? pIncFixRes.json() : [],
        ]);
        const prevExpenses: any[] = [...pExpVar, ...pExpFix];
        const prevIncomes: any[] = [...pIncVar, ...pIncFix];
        previousBalance = prevIncomes.reduce((s,i)=>s+Number(i.amount),0) - prevExpenses.reduce((s,e)=>s+Number(e.amount),0);
      }
      let running = previousBalance;
      const dailyBalanceData: Array<{ date: string; balance: number }> = [];
      for (const k of dayKeysSorted) {
        const delta = dayMap[k].income - dayMap[k].expense;
        running += delta;
        // k.slice(-2) = dia, incorpora saldo acumulado anterior já somado
        dailyBalanceData.push({ date: k.slice(-2), balance: running });
      }
      // Projeção: baseline vs real
      const daysElapsed = dayKeysSorted.length;
      const totalDaysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      ).getDate();
  const currentNet = running - previousBalance; // variação do mês
  const avgPerDay = daysElapsed > 0 ? currentNet / daysElapsed : 0;
  const projectedFinal = previousBalance + avgPerDay * totalDaysInMonth;
      const balanceProjectionData: Array<{ day: number; real: number; baseline: number }> = [];
      for (let d = 1; d <= totalDaysInMonth; d++) {
  const realEntry = dailyBalanceData.find((x) => Number(x.date) === d);
  const real = realEntry ? realEntry.balance : running; // se dia ainda sem movimento, mantém último
  const baseline = previousBalance + (projectedFinal - previousBalance) * (d / totalDaysInMonth);
        balanceProjectionData.push({ day: d, real, baseline });
      }
      setSummary((prev: typeof summary) => ({
        ...prev,
        totalIncome,
        totalExpenses,
        dailyBalanceData,
        balanceProjectionData,
      }));
      setSaldoDoMes(totalIncome - totalExpenses);

      // Saldo acumulado até o fim do mês
      const [expVarResA, expFixResA, incVarResA, incFixResA] = await Promise.all([
        fetch(
          `/api/expenses?start=1900-01-01&end=${endStr}${walletParam}&type=VARIABLE&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/expenses?start=1900-01-01&end=${endStr}${walletParam}&type=FIXED&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?start=1900-01-01&end=${endStr}${walletParam}&type=VARIABLE&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?start=1900-01-01&end=${endStr}${walletParam}&type=FIXED&_=${Date.now()}`,
          fetchOpts,
        ),
      ]);
      const [expVarA, expFixA, incVarA, incFixA] = await Promise.all([
        expVarResA.ok ? expVarResA.json() : [],
        expFixResA.ok ? expFixResA.json() : [],
        incVarResA.ok ? incVarResA.json() : [],
        incFixResA.ok ? incFixResA.json() : [],
      ]);
      const allExpensesA: any[] = [...expVarA, ...expFixA];
      const allIncomesA: any[] = [...incVarA, ...incFixA];
      const totalExpensesA = allExpensesA.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncomeA = allIncomesA.reduce((sum, i) => sum + Number(i.amount), 0);
      setSaldoAcumulado(totalIncomeA - totalExpensesA);

      // Limite diário
      const hoje = new Date();
      const fim = new Date(year, month, 0);
      let diasRestantes = 0;
      if (
        year < hoje.getFullYear() ||
        (year === hoje.getFullYear() && month - 1 < hoje.getMonth())
      ) {
        diasRestantes = 0;
      } else {
        diasRestantes = Math.max(
          1,
          fim.getDate() -
            (year === hoje.getFullYear() && month - 1 === hoje.getMonth() ? hoje.getDate() : 1) +
            1,
        );
      }
      const limite = diasRestantes > 0 ? (totalIncomeA - totalExpensesA) / diasRestantes : 0;
      setLimiteDiario(limite);

      // Buscar carteiras
      const resWallets = await fetch('/api/wallets', { cache: 'no-store' });
      if (resWallets.ok) {
        const data = await resWallets.json();
        setWallets(Array.isArray(data) ? data : []);
      }
    };
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallet, currentDate]);

  // Carregar dados dos últimos 12 meses para gráfico de barras empilhadas
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const now = new Date();
      const months: { year: number; month: number; label: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: `${d.toLocaleString('pt-BR', { month: 'short' })}/${d
            .getFullYear()
            .toString()
            .slice(-2)}`,
        });
      }
      const fetchOpts: RequestInit = {
        cache: 'no-store',
        credentials: 'same-origin',
      };
      const walletParam = selectedWallet ? `&walletId=${selectedWallet}` : '';
      const results = await Promise.all(
        months.map(async ({ year, month }) => {
          const { start, end } = getMonthRange(year, month);
          const startStr = toYmd(start);
          const endStr = toYmd(end);
          const [expVarRes, expFixRes, incVarRes, incFixRes] = await Promise.all([
            fetch(
              `/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
              fetchOpts,
            ),
            fetch(
              `/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
              fetchOpts,
            ),
            fetch(
              `/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
              fetchOpts,
            ),
            fetch(
              `/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
              fetchOpts,
            ),
          ]);
          const [expVar, expFix, incVar, incFix] = await Promise.all([
            expVarRes.ok ? expVarRes.json() : [],
            expFixRes.ok ? expFixRes.json() : [],
            incVarRes.ok ? incVarRes.json() : [],
            incFixRes.ok ? incFixRes.json() : [],
          ]);
          const allExpenses: any[] = [...expVar, ...expFix];
          const allIncomes: any[] = [...incVar, ...incFix];
          const expense = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          const income = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
          const balance = income - expense;
          return { expense, income, balance };
        }),
      );
      setSummary((prev: typeof summary) => ({
        ...prev,
        monthlyData: months.map((m, i) => ({ month: m.label, ...results[i] })),
      }));
    };
    fetchMonthlyData();
  }, [selectedWallet]);

  // Carregar dados do mês atual e anterior para top 5 categorias
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const { start, end } = getMonthRange(year, month);
      // normalizar para yyyy-MM-dd local sem timezone
      const startStr = toYmd(start);
      const endStr = toYmd(end);

      const fetchOpts: RequestInit = {
        cache: 'no-store',
        credentials: 'same-origin',
      };
      const walletParam = selectedWallet ? `&walletId=${selectedWallet}` : '';
      const [expVarRes, expFixRes, incVarRes, incFixRes, tagsRes] = await Promise.all([
        fetch(
          `/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch(
          `/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`,
          fetchOpts,
        ),
        fetch('/api/tags', { cache: 'no-store' }),
      ]);

      const [expVar, expFix, incVar, incFix, tagsList] = await Promise.all([
        expVarRes.ok ? expVarRes.json() : [],
        expFixRes.ok ? expFixRes.json() : [],
        incVarRes.ok ? incVarRes.json() : [],
        incFixRes.ok ? incFixRes.json() : [],
        tagsRes.ok ? tagsRes.json() : [],
      ]);

      const tagIdToNameLocal: Record<string, string> = {};
      if (Array.isArray(tagsList)) for (const t of tagsList) tagIdToNameLocal[t.id] = t.name;
      setTagNames(tagIdToNameLocal);

      const allExpenses: any[] = [...expVar, ...expFix];
      const allIncomes: any[] = [...incVar, ...incFix];

      const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncome = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

      const expenseMap = new Map<string, { amount: number; color: string }>();
      for (const e of allExpenses) {
        const key = e.category?.name || 'Sem categoria';
        const color = e.category?.color || '#94a3b8';
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
        const color = i.category?.color || '#10b981';
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

      // (removido) agrupamento por tag para gráfico antigo

      // Top 5 categorias de despesa do mês atual
      const topCategories = [...expensesByCategory].sort((a, b) => b.amount - a.amount).slice(0, 5);

      // Buscar dados do mês anterior para variação
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(currentDate.getMonth() - 1);
      const { start: prevStart, end: prevEnd } = getMonthRange(
        prevMonth.getFullYear(),
        prevMonth.getMonth() + 1,
      );
      const prevStartStr = toYmd(prevStart);
      const prevEndStr = toYmd(prevEnd);
      let prevExpensesByCategory: Array<{ category: string; amount: number }> = [];
      try {
        const prevExpVarRes = await fetch(
          `/api/expenses?type=VARIABLE&start=${prevStartStr}&end=${prevEndStr}${
            selectedWallet ? `&walletId=${selectedWallet}` : ''
          }&_=${Date.now()}`,
          { cache: 'no-store', credentials: 'same-origin' },
        );
        const prevExpFixRes = await fetch(
          `/api/expenses?type=FIXED&start=${prevStartStr}&end=${prevEndStr}${
            selectedWallet ? `&walletId=${selectedWallet}` : ''
          }&_=${Date.now()}`,
          { cache: 'no-store', credentials: 'same-origin' },
        );
        const [prevExpVar, prevExpFix] = await Promise.all([
          prevExpVarRes.ok ? prevExpVarRes.json() : [],
          prevExpFixRes.ok ? prevExpFixRes.json() : [],
        ]);
        const allPrevExpenses: any[] = [...prevExpVar, ...prevExpFix];
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

      const topExpenseCategories = topCategories.map((c) => ({
        category: c.category,
        amount: c.amount,
        diff: c.amount - (prevAmounts[c.category] || 0),
      }));

      setSummary((prev: typeof summary) => ({
        ...prev,
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expensesByCategory,
        incomesByCategory,
        topExpenseCategories,
      }));
      setIsLoading(false);
    };

    fetchSummary();
  }, [currentDate, selectedWallet]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const today = new Date();
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (
      next.getFullYear() > today.getFullYear() ||
      (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())
    ) {
      return;
    }
    setCurrentDate(next);
  };

  // Limite diário agora vem da API agregadora

  // Dados diários para os novos gráficos
  const {
    byCategory: dailyByCategory,
    byWallet: dailyByWallet,
    byTag: dailyByTag,
    loading: loadingDaily,
  } = useDailyExpenseData({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    walletId: selectedWallet || undefined,
  });

  // Função para fechar o modal e recarregar o dashboard
  const handleQuickAddSuccess = () => {
    setQuickAddOpen(false);
    // Forçar recarregamento dos dados do dashboard
    setCurrentDate(new Date(currentDate));
  };

  return (
    <div className="space-y-4 flex-1 min-h-screen flex flex-col px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-foreground">Visão geral das suas finanças</p>
        </div>

        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-row sm:items-center sm:space-x-2 w-full">
          <select
            className="border border-border rounded px-2 py-2 w-full sm:w-auto text-sm bg-background text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedWallet}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedWallet(e.target.value)}
          >
            <option value="">Todas as carteiras</option>
            {wallets.map((w: { id: string; name: string; type: string }) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <div className="flex w-full sm:w-auto items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
              aria-label="Mês anterior"
              className="h-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 h-10 bg-background border border-border rounded-md w-full sm:w-auto justify-center">
              <Calendar className="h-4 w-4 text-foreground" />
              <span className="font-medium text-sm sm:text-base text-foreground dark:text-white">
                {(() => {
                  const label = getMonthYear(currentDate);
                  // Capitaliza o mês
                  return label.charAt(0).toUpperCase() + label.slice(1);
                })()}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              disabled={isAtCurrentMonth}
              aria-disabled={isAtCurrentMonth}
              aria-label="Próximo mês"
              className="h-10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Cards resumo principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 w-full">
        <Card
          onClick={() => setModal('income')}
          className="cursor-pointer flex flex-col justify-between h-full min-h-[140px] sm:min-h-0"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold">Entradas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-1 flex items-center justify-center">
            <div className="font-bold text-green-600 text-[clamp(1.3rem,4vw,2.2rem)] leading-tight w-full text-center">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card
          onClick={() => setModal('expense')}
          className="cursor-pointer flex flex-col justify-between h-full min-h-[140px] sm:min-h-0"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold">Saídas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-1 flex items-center justify-center">
            <div className="font-bold text-red-600 text-[clamp(1.3rem,4vw,2.2rem)] leading-tight w-full text-center">
              {formatCurrency(summary.totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-between h-full min-h-[140px] sm:min-h-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold">Saldo do mês</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-1 flex flex-col items-center justify-center">
            <div className="font-bold text-blue-600 text-[clamp(1.3rem,4vw,2.2rem)] leading-tight w-full text-center">
              {formatCurrency(saldoDoMes)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Entradas - Saídas do mês selecionado
            </p>
          </CardContent>
        </Card>
        <Card
          onClick={() => setModal('balance')}
          className="cursor-pointer flex flex-col justify-between h-full min-h-[140px] sm:min-h-0"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold">Saldo acumulado</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-1 flex flex-col items-center justify-center">
            <div className="font-bold text-blue-600 text-[clamp(1.3rem,4vw,2.2rem)] leading-tight w-full text-center">
              {formatCurrency(saldoAcumulado)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Entradas - Saídas de todos os meses até o selecionado
            </p>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-between h-full min-h-[140px] sm:min-h-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-base sm:text-lg font-semibold">Limite Diário</CardTitle>
            <span className="h-4 w-4 text-orange-500">💸</span>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-1 flex flex-col items-center justify-center">
            <div className="font-bold text-orange-500 text-[clamp(1.3rem,4vw,2.2rem)] leading-tight w-full text-center">
              {formatCurrency(limiteDiario)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Para não ficar com saldo ≤ 0 até o fim do mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add FAB */}
      <Fab
        onClick={() => {
          setQuickAddOpen(true);
          setQuickTab('despesa');
        }}
        label="Quick Add"
      />

      {/* Quick Add Modal */}
      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Adicionar rápido">
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <button
              className={`border rounded-md py-2 px-4 flex-1 transition-colors
                ${
                  quickTab === 'despesa'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
              onClick={() => setQuickTab('despesa')}
              type="button"
            >
              Saída
            </button>
            <button
              className={`border rounded-md py-2 px-4 flex-1 transition-colors
                ${
                  quickTab === 'renda'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
              onClick={() => setQuickTab('renda')}
              type="button"
            >
              Entrada
            </button>
          </div>
          <div className="mt-4">
            {quickTab === 'despesa' ? <QuickDespesaForm /> : <QuickRendaForm />}
          </div>
        </div>
      </Modal>
      <Modal
        open={modal !== null}
        onClose={() => {
          setModal(null);
        }}
        title={
          modal === 'income'
            ? 'Entradas do mês'
            : modal === 'expense'
            ? 'Saídas do mês'
            : modal === 'balance'
            ? 'Entradas e Saídas do mês'
            : ''
        }
      >
        {modal === 'income' && (
          <div className="mt-4">
            {summary.incomesByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma entrada encontrada.</div>
            ) : (
              <ul className="space-y-2">
                {[...summary.incomesByCategory]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <li key={item.category} className="flex justify-between items-center">
                      <span>{item.category}</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {modal === 'expense' && (
          <div className="mt-4">
            {summary.expensesByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma saída encontrada.</div>
            ) : (
              <ul className="space-y-2">
                {[...summary.expensesByCategory]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => (
                    <li key={item.category} className="flex justify-between items-center">
                      <span>{item.category}</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {modal === 'balance' && (
          <div className="space-y-6 mt-4">
            <div>
              <div className="font-semibold mb-2">Entradas</div>
              {summary.incomesByCategory.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma entrada encontrada.</div>
              ) : (
                <ul className="space-y-2">
                  {[...summary.incomesByCategory]
                    .sort((a, b) => b.amount - a.amount)
                    .map((item) => (
                      <li key={item.category} className="flex justify-between items-center">
                        <span>{item.category}</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(item.amount)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <div className="font-semibold mb-2">Saídas</div>
              {summary.expensesByCategory.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma saída encontrada.</div>
              ) : (
                <ul className="space-y-2">
                  {[...summary.expensesByCategory]
                    .sort((a, b) => b.amount - a.amount)
                    .map((item) => (
                      <li key={item.category} className="flex justify-between items-center">
                        <span>{item.category}</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(item.amount)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        <Card
          className="cursor-pointer"
          onClick={() => {
            setModal('income');
          }}
        >
          <CardHeader>
            <CardTitle>Entradas por Categoria (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando entradas..." />
            ) : summary.incomesByCategory.length > 0 ? (
              <IncomeChart data={summary.incomesByCategory} maxItems={5} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">
                Sem dados para o período selecionado
              </div>
            )}
            {summary.incomesByCategory.length > 5 && (
              <div className="mt-2 text-[10px] text-muted-foreground">Clique para ver todas</div>
            )}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer"
          onClick={() => {
            setModal('expense');
          }}
        >
          <CardHeader>
            <CardTitle>Saídas por Categoria (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando saídas..." />
            ) : summary.expensesByCategory.length > 0 ? (
              <ExpenseChart data={summary.expensesByCategory} maxItems={5} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">
                Sem dados para o período selecionado
              </div>
            )}
            {summary.expensesByCategory.length > 5 && (
              <div className="mt-2 text-[10px] text-muted-foreground">Clique para ver todas</div>
            )}
          </CardContent>
        </Card>

        {/* Coluna terceira ficará vazia agora ou pode ser usada para outro futuro gráfico */}
        <div className="hidden xl:block" />
      </div>

      {/* Gráficos diários: categoria, carteira e tag */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Gasto Diário por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : dailyByCategory.length > 0 ? (
              <DailyCategoryChart
                data={dailyByCategory}
                categoryColors={Object.fromEntries(
                  summary.expensesByCategory.map((c) => [c.category, c.color]),
                )}
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gasto Diário por Carteira</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : dailyByWallet.length > 0 ? (
              <DailyWalletChart data={dailyByWallet} walletsMeta={wallets} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gasto Diário por Tag</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <Loader text="Carregando gráfico diário..." />
            ) : dailyByTag.length > 0 ? (
              <DynamicDailyTagChart data={dailyByTag} tagNames={tagNames} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Gráfico de relação (Entradas x Saídas) logo após os cards principais */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Entradas x Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Calculando percentuais..." />
            ) : (
              <SummaryRatioChart
                totalIncome={summary.totalIncome}
                totalExpenses={summary.totalExpenses}
              />
            )}
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Evolução Diária do Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando evolução..." />
            ) : (
              <DailyBalanceChart data={summary.dailyBalanceData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projeção de Saldo Final do Mês */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Projeção do Saldo Final do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader text="Calculando projeção..." />
          ) : (
            <BalanceProjectionChart data={summary.balanceProjectionData} />
          )}
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Gráfico de barras empilhadas: renda vs despesas + saldo (últimos 12 meses) */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.monthlyData.length > 0 ? (
              <MonthlyBarChart data={summary.monthlyData} />
            ) : (
              <Loader text="Carregando histórico..." />
            )}
          </CardContent>
        </Card>

        {/* Top 5 categorias de despesa do período */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Categorias de Saída (vs mês anterior)</CardTitle>
          </CardHeader>
          <CardContent>
            <TopExpenseCategoriesChart
              data={
                summary.topExpenseCategories.length > 0
                  ? summary.topExpenseCategories
                  : [
                      { category: 'Sem categoria', amount: 0, diff: 0 },
                      { category: '---', amount: 0, diff: 0 },
                      { category: '---', amount: 0, diff: 0 },
                      { category: '---', amount: 0, diff: 0 },
                      { category: '---', amount: 0, diff: 0 },
                    ]
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
