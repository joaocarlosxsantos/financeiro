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
import { Select } from '@/components/ui/select';
import WalletMultiSelect from '@/components/ui/wallet-multi-select';
import { AutoFitNumber } from '@/components/ui/auto-fit-number';

// Função utilitária local para formatar data yyyy-MM-dd
function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
import { fetchAll } from '@/lib/fetchAll';
import { formatCurrency, getMonthRange, getMonthYear, formatYmd } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowLeft,
  ArrowRight,
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
// Removido SummaryRatioChart (Entradas x Saídas)
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
import { useIsMobile } from '@/hooks/use-is-mobile';
import MobileChartDetailList, { groupDailyData } from './mobile-chart-detail-list';
import { getWalletColor } from './daily-wallet-chart';

import QuickDespesaForm from '../quick-add/quick-despesa-form';
import QuickRendaForm from '../quick-add/quick-renda-form';

import React from 'react';

export function DashboardContent() {
  const [saldoDoMes, setSaldoDoMes] = useState<number>(0);
  const [saldoAcumulado, setSaldoAcumulado] = useState<number>(0);
  // Estado para modal de adição rápida e tabs
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTab, setQuickTab] = useState<'despesa' | 'renda'>('despesa');
  const [modal, setModal] = useState<null | 'income' | 'expense' | 'balance' | 'diff'>(null);
  // Estado para modal de visualização ampliada dos gráficos
  const [chartModal, setChartModal] = useState<
    null | 'monthly' | 'top' | 'dailyCategory' | 'dailyWallet' | 'dailyTag'
  >(null);
  const isMobile = useIsMobile();
  // Estados removidos: modal agora sempre mostra todas as categorias ordenadas.
  type Summary = {
    expensesByCategory: Array<{ category: string; amount: number; color: string }>;
    incomesByCategory: Array<{ category: string; amount: number; color: string }>;
    // removido: expensesByTag
    monthlyData: Array<{ month: string; income: number; expense: number; balance: number }>;
    topExpenseCategories: Array<{ category: string; amount: number; diff: number; prevAmount?: number }>;
    expenseDiffAll: Array<{ category: string; amount: number; diff: number; prevAmount: number }>;
    dailyBalanceData: Array<{ date: string; balance: number }>;
    balanceProjectionData: Array<{
      day: number;
      real?: number | undefined;
      baselineLinear?: number | undefined;
      baselineRecent?: number | undefined;
    }>;
  };
  const [summary, setSummary] = useState<Summary>({
    expensesByCategory: [],
    incomesByCategory: [],
    // expensesByTag removido
    monthlyData: [],
    topExpenseCategories: [],
    expenseDiffAll: [],
    dailyBalanceData: [],
    balanceProjectionData: [],
  });
  // Totais desacoplados do Summary (antes usados pelo gráfico removido)
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string; type: string }>>([]);
  // agora permitimos selecionar múltiplas carteiras; array vazio = todas as carteiras
  const [selectedWallet, setSelectedWallet] = useState<string[]>([]);
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
  const walletParam = selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';
      // Entradas e saídas do mês
      // Buscar todas as despesas e entradas do período (paginação automática)
      const [expVar, expFix, incVar, incFix] = await Promise.all([
        fetchAll(`/api/expenses?start=${startStr}&end=${endStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
        fetchAll(`/api/expenses?start=${startStr}&end=${endStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
        fetchAll(`/api/incomes?start=${startStr}&end=${endStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
        fetchAll(`/api/incomes?start=${startStr}&end=${endStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
      ]);
      const allExpenses: any[] = [...expVar, ...expFix];
      const allIncomes: any[] = [...incVar, ...incFix];
      const totalExpensesLocal = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncomeLocal = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
      // Construir evolução diária do saldo (cumulativo)
      const dateKey = (dStr: string) => {
        if (!dStr) return new Date();
        // If format is YYYY-MM-DD, parse as local date to avoid timezone shifts
        const m = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const y = Number(m[1]);
          const mo = Number(m[2]);
          const da = Number(m[3]);
          return new Date(y, mo - 1, da);
        }
        // Fallback to Date parsing for full ISO datetimes
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
  const key = formatYmd(d);
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
  const prevEndStr = formatYmd(prevEnd);
        const [pExpVar, pExpFix, pIncVar, pIncFix] = await Promise.all([
          fetchAll(`/api/expenses?start=1900-01-01&end=${prevEndStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
          fetchAll(`/api/expenses?start=1900-01-01&end=${prevEndStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
          fetchAll(`/api/incomes?start=1900-01-01&end=${prevEndStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
          fetchAll(`/api/incomes?start=1900-01-01&end=${prevEndStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
        ]);
        const prevExpenses: any[] = [...pExpVar, ...pExpFix];
        const prevIncomes: any[] = [...pIncVar, ...pIncFix];
        previousBalance =
          prevIncomes.reduce((s, i) => s + Number(i.amount), 0) -
          prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
      }
      let running = previousBalance;
      const dailyBalanceData: Array<{ date: string; balance: number }> = [];
      for (const k of dayKeysSorted) {
        const delta = dayMap[k].income - dayMap[k].expense;
        running += delta;
        // armazenar a data completa YYYY-MM-DD para o gráfico (o tick formatter mostrará apenas o dia)
        dailyBalanceData.push({ date: k, balance: running });
      }
      // Projeção: baseline vs real
      const daysElapsed = dayKeysSorted.length;
      const totalDaysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      ).getDate();
      const currentNet = running - previousBalance; // variação do mês (até hoje)
      const avgPerDay = daysElapsed > 0 ? currentNet / daysElapsed : 0;
      // Calcular média histórica para o mesmo período nos últimos M meses
      const M = 3; // usar 3 meses recentes por padrão
      const historicalNets: number[] = [];
      for (let i = 1; i <= M; i++) {
        const refMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const { start: hStart, end: hEnd } = getMonthRange(refMonth.getFullYear(), refMonth.getMonth() + 1);
        const hStartStr = toYmd(hStart);
        const hEndStr = toYmd(hEnd);
        try {
          // buscar despesas/entradas do mês de referência (sincrono dentro do loop pode ser lento,
          // mas M é pequeno). Usamos fetchAll com cache no-store.
          // eslint-disable-next-line no-await-in-loop
          const [hExpVar, hExpFix, hIncVar, hIncFix] = await Promise.all([
            fetchAll(`/api/expenses?type=VARIABLE&start=${hStartStr}&end=${hEndStr}${walletParam}&perPage=200`, fetchOpts),
            fetchAll(`/api/expenses?type=FIXED&start=${hStartStr}&end=${hEndStr}${walletParam}&perPage=200`, fetchOpts),
            fetchAll(`/api/incomes?type=VARIABLE&start=${hStartStr}&end=${hEndStr}${walletParam}&perPage=200`, fetchOpts),
            fetchAll(`/api/incomes?type=FIXED&start=${hStartStr}&end=${hEndStr}${walletParam}&perPage=200`, fetchOpts),
          ]);
          const hExpenses = [...hExpVar, ...hExpFix];
          const hIncomes = [...hIncVar, ...hIncFix];
          const hNet = hIncomes.reduce((s, x) => s + Number(x.amount), 0) - hExpenses.reduce((s, x) => s + Number(x.amount), 0);
          historicalNets.push(hNet);
        } catch (e) {
          // se houve erro numa das requisições históricas, ignorar esse mês
        }
      }
      const historicalAvgNet = historicalNets.length > 0 ? historicalNets.reduce((s, n) => s + n, 0) / historicalNets.length : avgPerDay * daysElapsed;
      // combinar média atual (até hoje) com histórica: ponderar mais a média atual quando houver mais dias
      // peso baseado na proporção de dias já transcorridos
      const weightCurrent = daysElapsed / Math.max(1, totalDaysInMonth);
      const combinedAvgPerDay = weightCurrent * (avgPerDay) + (1 - weightCurrent) * (historicalAvgNet / Math.max(1, totalDaysInMonth));
      const projectedFinal = previousBalance + combinedAvgPerDay * totalDaysInMonth;
      const balanceProjectionData: Array<{
        day: number;
        real?: number | undefined;
        baselineLinear?: number | undefined;
        baselineRecent?: number | undefined;
      }> = [];
      // Projeção linear global já calculada (projectedFinal)
      // Projeção recente: média dos últimos N dias com movimento (ex: 7 ou menor se menos dias)
      const N = 7;
      const lastDays = dailyBalanceData
        .filter((p) => p.date !== undefined && p.date !== '0')
        .slice(-N);
      const recentVariation = (() => {
        if (lastDays.length <= 1) return currentNet; // fallback
        const first = lastDays[0].balance;
        const last = lastDays[lastDays.length - 1].balance;
        return last - first;
      })();
      // calcular média por dia usando a diferença real de dias (evita dividir apenas pelo número de pontos)
      const recentAvgPerDay = (() => {
        if (lastDays.length <= 1) return avgPerDay;
        const firstDay = Number((lastDays[0].date || '').toString().split('-').pop() || 0);
        const lastDay = Number((lastDays[lastDays.length - 1].date || '').toString().split('-').pop() || 0);
        const daySpan = Math.max(1, lastDay - firstDay);
        return recentVariation / daySpan;
      })();
      const projectedRecentFinal = previousBalance + recentAvgPerDay * totalDaysInMonth;

      // Descobrir o último dia com dado real (ou hoje se mês corrente)
      const todayDay = new Date().getDate();
      const lastRealDay = isAtCurrentMonth
        ? Math.min(todayDay, totalDaysInMonth)
        : Math.max(...dailyBalanceData.map((p) => Number(p.date.split('-').pop() || 0)), 0);

      // balance do último dia real
      const lastRealBalance = (() => {
        if (!dailyBalanceData || dailyBalanceData.length === 0) return previousBalance;
        const found = dailyBalanceData.find((p) => Number(p.date.split('-').pop()) === lastRealDay);
        if (found) return found.balance;
        // se não encontrar, usar running (saldo acumulado até o último dia conhecido)
        return running;
      })();

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const realEntry = dailyBalanceData.find((x) => Number(x.date.split('-').pop()) === d);
        // Somente preencher real até lastRealDay — para dias futuros usar undefined (chart tratará)
        const real = realEntry && d <= lastRealDay ? realEntry.balance : undefined;

        let baselineLinear: number | undefined;
        let baselineRecent: number | undefined;

        if (!isAtCurrentMonth) {
          // Meses passados: sem projeções
          baselineLinear = undefined;
          baselineRecent = undefined;
        } else if (d <= lastRealDay) {
          // antes ou igual ao dia atual: manter baseline igual ao valor real (se existir) ou ao lastRealBalance
          baselineLinear = real !== undefined ? real : lastRealBalance;
          baselineRecent = real !== undefined ? real : lastRealBalance;
        } else {
          // dias futuros: projetar a partir do lastRealBalance usando taxas por dia
          baselineLinear = lastRealBalance + combinedAvgPerDay * (d - lastRealDay);
          baselineRecent = lastRealBalance + recentAvgPerDay * (d - lastRealDay);
        }

        balanceProjectionData.push({ day: d, real, baselineLinear, baselineRecent });
      }
      setSummary((prev: typeof summary) => ({
        ...prev,
        dailyBalanceData,
        balanceProjectionData,
      }));
      // Totais e saldo do mês serão definidos no fetchSummary para evitar cálculo duplicado

      // Saldo acumulado até o fim do mês
      const [expVarA, expFixA, incVarA, incFixA] = await Promise.all([
        fetchAll(`/api/expenses?start=1900-01-01&end=${endStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
        fetchAll(`/api/expenses?start=1900-01-01&end=${endStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
        fetchAll(`/api/incomes?start=1900-01-01&end=${endStr}${walletParam}&type=VARIABLE&perPage=200`, fetchOpts),
        fetchAll(`/api/incomes?start=1900-01-01&end=${endStr}${walletParam}&type=FIXED&perPage=200`, fetchOpts),
      ]);

      // NOTE: a rota da API (`/api/expenses` e `/api/incomes`) já expande registros FIXED
      // quando `type=FIXED` e `start`/`end` são informados. Logo, aqui não devemos
      // expandir novamente — somamos diretamente os arrays retornados.
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
  const walletParam = selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';
      const results = await Promise.all(
        months.map(async ({ year, month }) => {
          const { start, end } = getMonthRange(year, month);
          const startStr = toYmd(start);
          const endStr = toYmd(end);
          const [expVar, expFix, incVar, incFix] = await Promise.all([
            fetchAll<any[]>(
              `/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
              fetchOpts,
            ),
            fetchAll<any[]>(
              `/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
              fetchOpts,
            ),
            fetchAll<any[]>(
              `/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
              fetchOpts,
            ),
            fetchAll<any[]>(
              `/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`,
              fetchOpts,
            ),
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
  const walletParam = selectedWallet && selectedWallet.length > 0 ? `&walletId=${selectedWallet.join(',')}` : '';
      const [expVar, expFix, incVar, incFix, tagsList] = await Promise.all([
        fetchAll(`/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`, fetchOpts),
        fetchAll(`/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`, fetchOpts),
        fetchAll(`/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`, fetchOpts),
        fetchAll(`/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&perPage=200&_=${Date.now()}`, fetchOpts),
        fetch('/api/tags', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
      ]);

      const tagIdToNameLocal: Record<string, string> = {};
      if (Array.isArray(tagsList)) for (const t of tagsList) tagIdToNameLocal[t.id] = t.name;
      setTagNames(tagIdToNameLocal);

      const allExpenses: any[] = [...expVar, ...expFix];
      const allIncomes: any[] = [...incVar, ...incFix];

      const totalExpensesLocal = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncomeLocal = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

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
  const topCategoriesAll = [...expensesByCategory];

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
        const [prevExpVar, prevExpFix] = await Promise.all([
          fetchAll(
            `/api/expenses?type=VARIABLE&start=${prevStartStr}&end=${prevEndStr}${walletParam}&perPage=200&_=${Date.now()}`,
            { cache: 'no-store', credentials: 'same-origin' },
          ),
          fetchAll(
            `/api/expenses?type=FIXED&start=${prevStartStr}&end=${prevEndStr}${walletParam}&perPage=200&_=${Date.now()}`,
            { cache: 'no-store', credentials: 'same-origin' },
          ),
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

      // Construir lista completa com diffs
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

      setSummary((prev: typeof summary) => ({
        ...prev,
        expensesByCategory,
        incomesByCategory,
        topExpenseCategories,
        expenseDiffAll,
      }));
      setTotalIncome(totalIncomeLocal);
      setTotalExpenses(totalExpensesLocal);
      setSaldoDoMes(totalIncomeLocal - totalExpensesLocal);
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
    // enviar lista como CSV ou undefined para todas
    walletId: selectedWallet && selectedWallet.length > 0 ? selectedWallet.join(',') : undefined,
  });

  // Função para fechar o modal e recarregar o dashboard
  const handleQuickAddSuccess = () => {
    setQuickAddOpen(false);
    // Forçar recarregamento dos dados do dashboard
    setCurrentDate(new Date(currentDate));
  };

  return (
    <div className="space-y-4 flex-1 min-h-screen flex flex-col px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-foreground">Visão geral das suas finanças</p>
        </div>

        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-row sm:items-center sm:space-x-2 w-full">
          <div className="w-full sm:w-auto">
            <WalletMultiSelect
              wallets={wallets}
              value={selectedWallet}
              onChange={(v) => setSelectedWallet(v)}
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              aria-label="Mês anterior"
              className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
            </Button>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 h-10 rounded-md w-full sm:w-auto justify-center border bg-white/90 border-slate-300/70 text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-800/60 dark:border-white/15 dark:text-slate-100">
              <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              <span className="font-medium text-sm sm:text-base">
                {(() => {
                  const label = getMonthYear(currentDate);
                  // Capitaliza o mês
                  return label.charAt(0).toUpperCase() + label.slice(1);
                })()}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={isAtCurrentMonth}
              aria-disabled={isAtCurrentMonth}
              aria-label="Próximo mês"
              className="h-10 w-10 rounded-full border border-slate-300/60 dark:border-white/15 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-700/60 shadow-sm backdrop-blur-sm disabled:opacity-50"
            >
              <ArrowRight className="h-5 w-5 stroke-[2.5] text-slate-700 dark:text-slate-200" />
            </Button>
          </div>
        </div>
      </div>

  {/* Cards resumo principais (5 cards).
      - Em telas pequenas/médias: 2 por linha (grid-cols-2)
      - Em telas grandes (lg+): 5 em linha (grid-cols-5)
      - Card de Saldo Acumulado ocupa linha inteira nas telas pequenas/médias (col-span-2) e fica por último.
  */}
  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 w-full">
        {/* Entradas Totais */}
        <Card
          onClick={() => setModal('income')}
          className="group relative order-1 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
          aria-label="Entradas Totais"
        >
          <CardContent className="p-2 flex flex-col flex-1">
            <div className="flex flex-1 items-center justify-between gap-2">
              <AutoFitNumber
                value={formatCurrency(totalIncome)}
                className="text-green-600"
                max={40}
                min={16}
              />
              <TrendingUp className="hidden 2xl:block h-7 w-7 text-green-500/80" />
            </div>
            <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
              Entradas Totais
            </div>
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[180px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
              Soma das entradas do mês selecionado
            </span>
          </CardContent>
        </Card>
        {/* Saídas Totais */}
        <Card
          onClick={() => setModal('expense')}
          className="group relative order-2 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
          aria-label="Saídas Totais"
        >
          <CardContent className="p-2 flex flex-col flex-1">
            <div className="flex flex-1 items-center justify-between gap-2">
              <AutoFitNumber
                value={formatCurrency(totalExpenses)}
                className="text-red-600"
                max={40}
                min={16}
              />
              <TrendingDown className="hidden 2xl:block h-7 w-7 text-red-500/80" />
            </div>
            <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
              Saídas Totais
            </div>
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[180px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
              Soma das saídas do mês selecionado
            </span>
          </CardContent>
        </Card>
        {/* Saldo do mês */}
        <Card
          onClick={() => setModal('balance')}
          className="group relative order-3 cursor-pointer flex flex-col h-full min-h-[150px] overflow-hidden"
          aria-label="Saldo do mês"
        >
          <CardContent className="p-2 flex flex-col flex-1">
            <div className="flex flex-1 items-center justify-between gap-2">
              <AutoFitNumber
                value={formatCurrency(saldoDoMes)}
                className="text-blue-600"
                max={42}
                min={18}
              />
              <DollarSign className="hidden 2xl:block h-7 w-7 text-blue-500/80" />
            </div>
            <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
              Saldo do mês
            </div>
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[200px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
              Entradas menos Saídas do mês
            </span>
          </CardContent>
        </Card>
        {/* Limite Diário */}
        <Card
          className="group relative order-4 flex flex-col h-full min-h-[150px] overflow-hidden"
          aria-label="Limite Diário"
        >
          <CardContent className="p-2 flex flex-col flex-1">
            <div className="flex flex-1 items-center justify-between gap-2">
              <AutoFitNumber
                value={formatCurrency(limiteDiario)}
                className="text-orange-500"
                max={40}
                min={16}
              />
              <span className="hidden 2xl:inline-block text-lg select-none" aria-hidden>💸</span>
            </div>
            <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
              Limite Diário
            </div>
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[210px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
              Gasto médio diário restante para manter saldo ≥ 0
            </span>
          </CardContent>
        </Card>
        {/* Saldo Acumulado */}
        <Card
          className="group relative order-5 col-span-2 md:col-span-2 lg:col-span-1 flex flex-col h-full min-h-[150px] overflow-hidden"
          aria-label="Saldo Acumulado"
        >
          <CardContent className="p-2 flex flex-col flex-1">
            <div className="flex flex-1 items-center justify-between gap-2">
              <AutoFitNumber
                value={formatCurrency(saldoAcumulado)}
                className="text-indigo-600 dark:text-indigo-400"
                max={40}
                min={18}
              />
              <DollarSign className="hidden 2xl:block h-7 w-7 text-indigo-500/80" />
            </div>
            <div className="mt-1 text-center text-xs sm:text-sm font-semibold text-foreground">
              Saldo Acumulado
            </div>
            <span className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-[210px] px-2 py-1 rounded bg-slate-900 text-white text-[10px] shadow z-10">
              Entradas - Saídas de todos os meses até o selecionado
            </span>
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
              type="button"
              onClick={() => setQuickTab('despesa')}
              className={`border rounded-md py-2 px-4 flex-1 transition-colors text-sm font-medium
                ${
                  quickTab === 'despesa'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => setQuickTab('renda')}
              className={`border rounded-md py-2 px-4 flex-1 transition-colors text-sm font-medium
                ${
                  quickTab === 'renda'
                    ? 'bg-primary text-white border-primary shadow'
                    : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }
              `}
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
            : modal === 'diff'
            ? 'Variação por Categoria (vs mês anterior)'
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
        {modal === 'diff' && (
          <div className="mt-4">
            {summary.expenseDiffAll.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma variação encontrada.</div>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                {summary.expenseDiffAll.map((item) => (
                  <li
                    key={item.category}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b last:border-b-0 pb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground break-words">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm font-mono whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatCurrency(item.prevAmount || 0)} → {formatCurrency(item.amount)}
                      </span>
                      <span
                        className={
                          item.diff > 0
                            ? 'font-semibold text-red-600'
                            : 'font-semibold text-green-600'
                        }
                      >
                        {item.diff > 0 ? '+' : ''}
                        {formatCurrency(item.diff)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Mostrando somente categorias cujo valor mudou em relação ao mês anterior.
            </p>
          </div>
        )}
      </Modal>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        <Card
          className="cursor-pointer"
          onClick={() => {
            // Entradas por Categoria é um gráfico de pizza — abrir modal de lista/detalhe existente
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
            // Saídas por Categoria é um gráfico de pizza — abrir modal de lista/detalhe existente
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
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
  <Card className="cursor-pointer" onClick={() => setChartModal('dailyCategory')}>
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
  <Card className="cursor-pointer" onClick={() => setChartModal('dailyWallet')}>
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
  <Card className="cursor-pointer" onClick={() => setChartModal('dailyTag')}>
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

      {/* Projeção e evolução diária lado a lado (substitui Entradas x Saídas) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Gráfico de barras empilhadas: renda vs despesas + saldo (últimos 12 meses) */}
        <Card className="cursor-pointer" onClick={() => setChartModal('monthly')}>
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

        {/* Top 5 categorias de despesa do período (gráfico clicável para expandir; botão para ver variações) */}
        <Card className="cursor-pointer">
          <CardHeader>
            <CardTitle>Top 5 Categorias de Saída (vs mês anterior)</CardTitle>
          </CardHeader>
          <CardContent>
            <div onClick={() => setChartModal('top')}>
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
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setModal('diff')}
                className="text-xs text-primary underline"
              >
                Ver variações completas
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Espaçador para afastar do rodapé */}
      <div className="h-24 sm:h-32" aria-hidden="true" />
      {/* Modal para exibir gráficos ampliados */}
      <Modal open={chartModal !== null} onClose={() => setChartModal(null)} title={chartModal ? 'Visualizar gráfico' : undefined} size="full">
  <div className="mt-2 h-[calc(80vh-96px)]">
          {chartModal === 'dailyCategory' && (
            <div className="h-full">
              {isMobile ? (
                <MobileChartDetailList
                  dailyData={dailyByCategory}
                  meta={Object.fromEntries(summary.expensesByCategory.map((c) => [c.category, { color: c.color, name: c.category }] ))}
                  title="Gasto Diário por Categoria"
                />
              ) : dailyByCategory.length > 0 ? (
                <DailyCategoryChart data={dailyByCategory} categoryColors={Object.fromEntries(summary.expensesByCategory.map((c) => [c.category, c.color]))} height={'100%'} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados para o período selecionado</div>
              )}
            </div>
          )}
          {chartModal === 'dailyWallet' && (
            <div className="h-full">
              {isMobile ? (
                <MobileChartDetailList
                  dailyData={dailyByWallet}
                  meta={Object.fromEntries(
                    wallets.map((w) => [w.name, { name: w.name, color: (w as any).color ?? getWalletColor(w.name, w.type) }])
                  )}
                  title="Gasto Diário por Carteira"
                />
              ) : dailyByWallet.length > 0 ? (
                <DailyWalletChart data={dailyByWallet} walletsMeta={wallets} height={'100%'} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados para o período selecionado</div>
              )}
            </div>
          )}
          {chartModal === 'dailyTag' && (
            <div className="h-full">
              {isMobile ? (
                <MobileChartDetailList
                  dailyData={dailyByTag}
                  meta={Object.fromEntries(Object.keys(tagNames).map((k) => [k, { name: tagNames[k], color: undefined }] ))}
                  title="Gasto Diário por Tag"
                />
              ) : dailyByTag.length > 0 ? (
                <DynamicDailyTagChart data={dailyByTag} tagNames={tagNames} height={'100%'} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados para o período selecionado</div>
              )}
            </div>
          )}
          {chartModal === 'monthly' && (
            <div className="h-full">
              {isMobile ? (
                <MobileChartDetailList
                  dailyData={summary.monthlyData}
                  title="Entradas vs Saídas (12 meses)"
                />
              ) : summary.monthlyData.length > 0 ? (
                <MonthlyBarChart data={summary.monthlyData} height={'100%'} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados para o período selecionado</div>
              )}
            </div>
          )}
          {chartModal === 'top' && (
            <div className="h-full">
              {isMobile ? (
                <MobileChartDetailList
                  dailyData={summary.topExpenseCategories}
                  title="Top 5 Categorias de Saída"
                />
              ) : (
                <TopExpenseCategoriesChart data={summary.topExpenseCategories} height={'100%'} />
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
