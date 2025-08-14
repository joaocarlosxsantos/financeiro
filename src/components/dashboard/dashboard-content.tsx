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

export function DashboardContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()
  const isAtCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth()
  
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expensesByCategory: [] as Array<{ category: string; amount: number; color: string }>,
    incomesByCategory: [] as Array<{ category: string; amount: number; color: string }>,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const { start, end } = getMonthRange(year, month)
      // normalizar para yyyy-MM-dd local sem timezone
      const toYmd = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      const startStr = toYmd(start)
      const endStr = toYmd(end)

      const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'same-origin' }
      const [expVarRes, expFixRes, incVarRes, incFixRes] = await Promise.all([
        fetch(`/api/expenses?type=VARIABLE&start=${startStr}&end=${endStr}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/expenses?type=FIXED&start=${startStr}&end=${endStr}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/incomes?type=VARIABLE&start=${startStr}&end=${endStr}&_=${Date.now()}`, fetchOpts),
        fetch(`/api/incomes?type=FIXED&start=${startStr}&end=${endStr}&_=${Date.now()}`, fetchOpts),
      ])

      const [expVar, expFix, incVar, incFix] = await Promise.all([
        expVarRes.ok ? expVarRes.json() : [],
        expFixRes.ok ? expFixRes.json() : [],
        incVarRes.ok ? incVarRes.json() : [],
        incFixRes.ok ? incFixRes.json() : [],
      ])

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

      setSummary({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        expensesByCategory,
        incomesByCategory,
      })
      setIsLoading(false)
    }

    fetchSummary()
  }, [currentDate])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral das suas finanças</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white rounded-md border">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-sm sm:text-base">{getMonthYear(currentDate)}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
              <div className="text-sm text-gray-500">Sem dados para o período selecionado</div>
            )}
          </CardContent>
        </Card>

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
              <div className="text-sm text-gray-500">Sem dados para o período selecionado</div>
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
