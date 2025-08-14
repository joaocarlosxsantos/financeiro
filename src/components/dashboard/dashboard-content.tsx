'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getMonthRange, getMonthYear } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { ExpenseChart } from './expense-chart'
import { IncomeChart } from './income-chart'

import { Loader } from '@/components/ui/loader'

import { SummaryRatioChart } from './summary-ratio-chart'
import { TagChart } from './tag-chart'
import { MonthlyBarChart } from './monthly-bar-chart'
import { TopExpenseCategoriesChart } from './top-expense-categories-chart'

// Função utilitária para formatar data yyyy-MM-dd
const toYmd = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DashboardContent() {

  // hooks de estado
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: [] as Array<{ category: string; amount: number; color: string }> ,
    incomesByCategory: [] as Array<{ category: string; amount: number; color: string }> ,
    expensesByTag: [] as Array<{ tag: string; amount: number; color: string }> ,
    monthlyData: [] as Array<{ month: string; income: number; expense: number; balance: number }> ,
    topExpenseCategories: [] as Array<{ category: string; amount: number; diff: number }> ,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [wallets, setWallets] = useState<Array<{ id: string; name: string }>>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()
  const isAtCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth()

  // Carregar carteiras
  useEffect(() => {
    const fetchWallets = async () => {
      const res = await fetch('/api/wallets', { cache: 'no-store' })
      if (res.ok) setWallets(await res.json())
    }
    fetchWallets()
  }, [])

  // Carregar dados dos últimos 12 meses para gráfico de barras empilhadas
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const now = new Date()
      const months: { year: number; month: number; label: string }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(-2)}`
        })
      }
      const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'same-origin' }
      const walletParam = selectedWallet ? `&walletId=${selectedWallet}` : ''
      const results = await Promise.all(months.map(async ({ year, month }) => {
        const { start, end } = getMonthRange(year, month)
        const startStr = toYmd(start)
        const endStr = toYmd(end)
        const [expVarRes, expFixRes, incVarRes, incFixRes] = await Promise.all([
          fetch(`/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
          fetch(`/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
          fetch(`/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
          fetch(`/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
        ])
        const [expVar, expFix, incVar, incFix] = await Promise.all([
          expVarRes.ok ? expVarRes.json() : [],
          expFixRes.ok ? expFixRes.json() : [],
          incVarRes.ok ? incVarRes.json() : [],
          incFixRes.ok ? incFixRes.json() : [],
        ])
        const allExpenses: any[] = [...expVar, ...expFix]
        const allIncomes: any[] = [...incVar, ...incFix]
        const expense = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const income = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
        const balance = income - expense
        return { expense, income, balance }
      }))
      setSummary(prev => ({ ...prev, monthlyData: months.map((m, i) => ({ month: m.label, ...results[i] })) }))
    }
    fetchMonthlyData()
  }, [selectedWallet])

  // Carregar dados do mês atual e anterior para top 5 categorias
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const { start, end } = getMonthRange(year, month)
      // normalizar para yyyy-MM-dd local sem timezone
      const startStr = toYmd(start)
      const endStr = toYmd(end)

      const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'same-origin' }
      const walletParam = selectedWallet ? `&walletId=${selectedWallet}` : ''
      const [expVarRes, expFixRes, incVarRes, incFixRes, tagsRes] = await Promise.all([
        fetch(`/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/expenses?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/incomes?type=FIXED&start=${startStr}&end=${endStr}${walletParam}&_=${Date.now()}`, fetchOpts),
        fetch('/api/tags', { cache: 'no-store' }),
      ])

      const [expVar, expFix, incVar, incFix, tagsList] = await Promise.all([
        expVarRes.ok ? expVarRes.json() : [],
        expFixRes.ok ? expFixRes.json() : [],
        incVarRes.ok ? incVarRes.json() : [],
        incFixRes.ok ? incFixRes.json() : [],
        tagsRes.ok ? tagsRes.json() : [],
      ])

      const tagIdToName: Record<string, string> = {};
      if (Array.isArray(tagsList)) {
        for (const t of tagsList) tagIdToName[t.id] = t.name;
      }

      const allExpenses: any[] = [...expVar, ...expFix]
      const allIncomes: any[] = [...incVar, ...incFix]

      const totalExpenses = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const totalIncome = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0)

      const expenseMap = new Map<string, { amount: number; color: string }>()
      for (const e of allExpenses) {
        const key = e.category?.name || 'Sem categoria'
        const color = e.category?.color || '#94a3b8'
        const cur = expenseMap.get(key) || { amount: 0, color }
        cur.amount += Number(e.amount)
        cur.color = color
        expenseMap.set(key, cur)
      }
      const expensesByCategory = Array.from(expenseMap.entries()).map(([category, v]) => ({ category, amount: v.amount, color: v.color }))

      const incomeMap = new Map<string, { amount: number; color: string }>()
      for (const i of allIncomes) {
        const key = i.category?.name || 'Sem categoria'
        const color = i.category?.color || '#10b981'
        const cur = incomeMap.get(key) || { amount: 0, color }
        cur.amount += Number(i.amount)
        cur.color = color
        incomeMap.set(key, cur)
      }
      const incomesByCategory = Array.from(incomeMap.entries()).map(([category, v]) => ({ category, amount: v.amount, color: v.color }))

      // Agrupar despesas por tag
      const tagMap = new Map<string, { amount: number; color: string }>()
      for (const e of allExpenses) {
        if (Array.isArray(e.tags) && e.tags.length > 0 && e.tags[0]) {
          for (const tag of e.tags) {
            // cor baseada no hash do nome da tag
            let color = '#6366f1';
            if (e.tagColors && e.tagColors[tag]) color = e.tagColors[tag];
            else {
              // fallback: cor baseada no hash
              let hash = 0;
              for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
              color = `hsl(${hash % 360}, 70%, 60%)`;
            }
            const cur = tagMap.get(tag) || { amount: 0, color };
            cur.amount += Number(e.amount);
            cur.color = color;
            tagMap.set(tag, cur);
          }
        }
      }
      const expensesByTag = Array.from(tagMap.entries()).map(([tag, v]) => ({ tag: tagIdToName[tag] || tag, amount: v.amount, color: v.color }));

      // Top 5 categorias de despesa do mês atual
      const topCategories = [...expensesByCategory]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Buscar dados do mês anterior para variação
      const prevMonth = new Date(currentDate)
      prevMonth.setMonth(currentDate.getMonth() - 1)
      const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth.getFullYear(), prevMonth.getMonth() + 1)
      const prevStartStr = toYmd(prevStart)
      const prevEndStr = toYmd(prevEnd)
      let prevExpensesByCategory: Array<{ category: string; amount: number }> = []
      try {
        const prevExpVarRes = await fetch(`/api/expenses?type=VARIABLE&start=${prevStartStr}&end=${prevEndStr}${selectedWallet ? `&walletId=${selectedWallet}` : ''}&_=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' })
        const prevExpFixRes = await fetch(`/api/expenses?type=FIXED&start=${prevStartStr}&end=${prevEndStr}${selectedWallet ? `&walletId=${selectedWallet}` : ''}&_=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' })
        const [prevExpVar, prevExpFix] = await Promise.all([
          prevExpVarRes.ok ? prevExpVarRes.json() : [],
          prevExpFixRes.ok ? prevExpFixRes.json() : [],
        ])
        const allPrevExpenses: any[] = [...prevExpVar, ...prevExpFix]
        const prevExpenseMap = new Map<string, number>()
        for (const e of allPrevExpenses) {
          const key = e.category?.name || 'Sem categoria'
          prevExpenseMap.set(key, (prevExpenseMap.get(key) || 0) + Number(e.amount))
        }
        prevExpensesByCategory = Array.from(prevExpenseMap.entries()).map(([category, amount]) => ({ category, amount }))
      } catch {}

      const prevAmounts: Record<string, number> = {}
      for (const c of prevExpensesByCategory) prevAmounts[c.category] = c.amount

      const topExpenseCategories = topCategories.map(c => ({
        category: c.category,
        amount: c.amount,
        diff: c.amount - (prevAmounts[c.category] || 0),
      }))

      setSummary(prev => ({
        ...prev,
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expensesByCategory,
        incomesByCategory,
        expensesByTag,
        topExpenseCategories,
      }))
      setIsLoading(false)
    }

    fetchSummary()
  }, [currentDate, selectedWallet])

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      // Bloqueia avançar para meses futuros em relação ao mês atual
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + 1)
      if (
        next.getFullYear() > today.getFullYear() ||
        (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())
      ) {
        return prev
      }
      return next
    })
  }

  // Cálculo do limite diário seguro
  const hoje = new Date();
  const fim = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  let diasRestantes = 0;
  let limiteDiario = 0;
  // Se o mês já passou, limite é 0
  if (
    currentDate.getFullYear() < hoje.getFullYear() ||
    (currentDate.getFullYear() === hoje.getFullYear() && currentDate.getMonth() < hoje.getMonth())
  ) {
    diasRestantes = 0;
    limiteDiario = 0;
  } else {
    diasRestantes = Math.max(1, fim.getDate() - (currentDate.getFullYear() === hoje.getFullYear() && currentDate.getMonth() === hoje.getMonth() ? hoje.getDate() : 1) + 1);
    limiteDiario = diasRestantes > 0 ? summary.balance / diasRestantes : 0;
  }

  return (
    <div className="space-y-6 flex-1 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-foreground">Visão geral das suas finanças</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedWallet}
            onChange={e => setSelectedWallet(e.target.value)}
          >
            <option value="">Todas as carteiras</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-background border border-border rounded-md">
            <Calendar className="h-4 w-4 text-foreground" />
            <span className="font-medium text-sm sm:text-base text-foreground dark:text-white">{getMonthYear(currentDate)}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={isAtCurrentMonth}
            aria-disabled={isAtCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renda Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo disponível
            </p>
          </CardContent>
        </Card>

        {/* Card Limite Diário */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Diário Seguro</CardTitle>
            <span className="h-4 w-4 text-orange-500">💸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(limiteDiario)}
            </div>
            <p className="text-xs text-muted-foreground">
              Para não ficar com saldo ≤ 0 até o fim do mês
            </p>
          </CardContent>
        </Card>
      </div>



      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando rendas..." />
            ) : summary.incomesByCategory.length > 0 ? (
              <IncomeChart data={summary.incomesByCategory} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">Sem dados para o período selecionado</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando despesas..." />
            ) : summary.expensesByCategory.length > 0 ? (
              <ExpenseChart data={summary.expensesByCategory} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">Sem dados para o período selecionado</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Tag</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader text="Carregando tags..." />
            ) : summary.expensesByTag.length > 0 ? (
              <TagChart data={summary.expensesByTag} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-foreground">Sem dados para o período selecionado</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
      {/* Gráfico de barras empilhadas: renda vs despesas + saldo (últimos 12 meses) */}
      <Card>
        <CardHeader>
          <CardTitle>Renda vs Despesas (12 meses)</CardTitle>
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
          <CardTitle>Top 5 Categorias de Despesa (vs mês anterior)</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.topExpenseCategories.length > 0 ? (
            <TopExpenseCategoriesChart data={summary.topExpenseCategories} />
          ) : (
            <Loader text="Carregando categorias..." />
          )}
        </CardContent>
      </Card>
      </div>

      {/* Gráfico de relação (largura total) */}
      <Card>
        <CardHeader>
          <CardTitle>Renda x Despesas (Percentual)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader text="Calculando percentuais..." />
          ) : (
            <SummaryRatioChart totalIncome={summary.totalIncome} totalExpenses={summary.totalExpenses} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
