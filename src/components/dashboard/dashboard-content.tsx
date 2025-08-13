'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrentMonth, getMonthYear } from '@/lib/utils'
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

export function DashboardContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Dados mockados para demonstração
  const mockData = {
    totalIncome: 5000,
    totalExpenses: 3200,
    balance: 1800,
    expensesByCategory: [
      { category: 'Alimentação', amount: 800, color: '#ef4444' },
      { category: 'Transporte', amount: 600, color: '#3b82f6' },
      { category: 'Moradia', amount: 1200, color: '#10b981' },
      { category: 'Lazer', amount: 400, color: '#f59e0b' },
      { category: 'Outros', amount: 200, color: '#8b5cf6' },
    ],
    incomesByCategory: [
      { category: 'Salário', amount: 4500, color: '#10b981' },
      { category: 'Freelance', amount: 500, color: '#3b82f6' },
    ]
  }

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
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
              {formatCurrency(mockData.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(mockData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              +8% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(mockData.balance)}
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
            <ExpenseChart data={mockData.expensesByCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeChart data={mockData.incomesByCategory} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
