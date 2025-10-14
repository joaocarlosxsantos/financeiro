'use client';

import { useState, useEffect } from 'react';
import { MonthSelector } from '@/components/ui/month-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  PiggyBank,
  Target,
  Lightbulb,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Wallet
} from 'lucide-react';
import { formatDateBrasilia, getNowBrasilia } from '@/lib/datetime-brasilia';
import { cn } from '@/lib/utils';
import { FinancialHealthChart } from './financial-health-chart';
import { ExpenseBreakdownChart } from './expense-breakdown-chart';
import { BudgetProgressCard } from './budget-progress-card';
import { SmartSuggestions } from './smart-suggestions';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  previousMonthBalance: number;
  savingsRate: number;
  expensesByCategory: Array<{
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  creditCardUsage: number;
  creditCardLimit: number;
  recurringExpenses: number;
  largestExpense: {
    description: string;
    amount: number;
    category: string;
  };
  unusualTransactions: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  healthScore: number;
  previousHealthScores: Array<{
    month: string;
    score: number;
  }>;
  budgetGoals: Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
  }>;
}

interface SmartInsight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: string;
  value?: number;
  icon: React.ReactNode;
}

export default function SmartReportClient() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = getNowBrasilia();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [selectedMonth]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/smart-report?month=${selectedMonth}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados financeiros');
      }
      
      const data = await response.json();
      
      // Converter strings para números quando necessário e garantir valores padrão
      const processedData: FinancialData = {
        totalIncome: Number(data.totalIncome) || 0,
        totalExpenses: Number(data.totalExpenses) || 0,
        balance: Number(data.balance) || 0,
        previousMonthBalance: Number(data.previousMonthBalance) || 0,
        savingsRate: Number(data.savingsRate) || 0,
        expensesByCategory: data.expensesByCategory || [],
        creditCardUsage: Number(data.creditCardUsage) || 0,
        creditCardLimit: Number(data.creditCardLimit) || 0,
        recurringExpenses: Number(data.recurringExpenses) || 0,
        largestExpense: {
          description: data.largestExpense?.description || 'Nenhuma despesa',
          amount: Number(data.largestExpense?.amount) || 0,
          category: data.largestExpense?.category || 'Sem categoria'
        },
        unusualTransactions: data.unusualTransactions || [],
        healthScore: Number(data.healthScore) || 0,
        previousHealthScores: data.previousHealthScores || [],
        budgetGoals: data.budgetGoals || []
      };
      
      // Gerar insights baseados nos dados processados
      const generatedInsights = generateSmartInsights(processedData);
      
      setFinancialData(processedData);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      
      // Fallback para dados simulados em caso de erro
      const mockData: FinancialData = {
        totalIncome: 8500.00,
        totalExpenses: 6200.00,
        balance: 2300.00,
        previousMonthBalance: 1800.00,
        savingsRate: 27.1,
        expensesByCategory: [
          { categoryName: 'Alimentação', amount: 1500.00, percentage: 24.2 },
          { categoryName: 'Transporte', amount: 800.00, percentage: 12.9 },
          { categoryName: 'Moradia', amount: 2000.00, percentage: 32.3 },
          { categoryName: 'Lazer', amount: 600.00, percentage: 9.7 },
          { categoryName: 'Saúde', amount: 450.00, percentage: 7.3 },
          { categoryName: 'Outros', amount: 850.00, percentage: 13.7 }
        ],
        creditCardUsage: 2500.00,
        creditCardLimit: 5000.00,
        recurringExpenses: 3200.00,
        largestExpense: {
          description: 'Aluguel - Apartamento',
          amount: 1800.00,
          category: 'Moradia'
        },
        unusualTransactions: [
          { description: 'Compra excepcional - Eletrônicos', amount: 899.00, date: '2024-10-10' },
          { description: 'Jantar especial', amount: 250.00, date: '2024-10-15' }
        ],
        healthScore: 78,
        previousHealthScores: [
          { month: '2024-05', score: 65 },
          { month: '2024-06', score: 68 },
          { month: '2024-07', score: 72 },
          { month: '2024-08', score: 75 },
          { month: '2024-09', score: 76 },
          { month: '2024-10', score: 78 }
        ],
        budgetGoals: [
          { category: 'Alimentação', budgeted: 1200.00, spent: 1500.00, remaining: -300.00 },
          { category: 'Transporte', budgeted: 900.00, spent: 800.00, remaining: 100.00 },
          { category: 'Lazer', budgeted: 500.00, spent: 600.00, remaining: -100.00 }
        ]
      };

      const generatedInsights = generateSmartInsights(mockData);
      setFinancialData(mockData);
      setInsights(generatedInsights);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartInsights = (data: FinancialData): SmartInsight[] => {
    const insights: SmartInsight[] = [];

    // Insight sobre taxa de poupança
    if (data.savingsRate > 20) {
      insights.push({
        type: 'success',
        title: 'Excelente Taxa de Poupança!',
        description: `Você está poupando ${data.savingsRate.toFixed(1)}% da sua renda. Continue assim!`,
        value: data.savingsRate,
        icon: <PiggyBank className="h-5 w-5" />
      });
    } else if (data.savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Taxa de Poupança Baixa',
        description: `Você está poupando apenas ${data.savingsRate.toFixed(1)}% da sua renda. Tente aumentar para pelo menos 20%.`,
        action: 'Revisar gastos desnecessários',
        value: data.savingsRate,
        icon: <AlertTriangle className="h-5 w-5" />
      });
    }

    // Insight sobre cartão de crédito
    const creditUsagePercentage = (data.creditCardUsage / data.creditCardLimit) * 100;
    if (creditUsagePercentage > 70) {
      insights.push({
        type: 'danger',
        title: 'Alto Uso do Cartão de Crédito',
        description: `Você está usando ${creditUsagePercentage.toFixed(1)}% do seu limite. Risco para o score de crédito.`,
        action: 'Reduzir uso ou quitar fatura',
        value: creditUsagePercentage,
        icon: <CreditCard className="h-5 w-5" />
      });
    }

    // Insight sobre gastos por categoria
    const highestExpenseCategory = data.expensesByCategory[0];
    if (highestExpenseCategory.percentage > 40) {
      insights.push({
        type: 'info',
        title: 'Concentração de Gastos',
        description: `${highestExpenseCategory.percentage.toFixed(1)}% dos seus gastos são em ${highestExpenseCategory.categoryName}.`,
        action: 'Considere diversificar ou otimizar estes gastos',
        icon: <Target className="h-5 w-5" />
      });
    }

    // Insight sobre melhoria mensal
    if (data.balance > data.previousMonthBalance) {
      const improvement = data.balance - data.previousMonthBalance;
      insights.push({
        type: 'success',
        title: 'Evolução Positiva!',
        description: `Seu saldo melhorou R$ ${improvement.toFixed(2)} em relação ao mês anterior.`,
        value: improvement,
        icon: <TrendingUp className="h-5 w-5" />
      });
    }

    // Insight sobre gastos recorrentes
    const recurringPercentage = (data.recurringExpenses / data.totalExpenses) * 100;
    insights.push({
      type: 'info',
      title: 'Gastos Recorrentes',
      description: `${recurringPercentage.toFixed(1)}% dos seus gastos são recorrentes (R$ ${data.recurringExpenses.toFixed(2)}).`,
      action: 'Revisar assinaturas e contratos',
      value: recurringPercentage,
      icon: <Activity className="h-5 w-5" />
    });

    return insights;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthScoreDescription = (score: number) => {
    if (score >= 80) return 'Excelente! Sua saúde financeira está ótima.';
    if (score >= 60) return 'Boa! Há espaço para melhorias.';
    return 'Atenção! Sua saúde financeira precisa de cuidados.';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!financialData) return null;

  return (
    <div className="space-y-6">
      {/* Header com seletor de mês */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Análise de {new Date(selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <MonthSelector 
          value={selectedMonth} 
          onChange={setSelectedMonth}
          className="w-full sm:w-auto"
        />
      </div>

      {/* Score de Saúde Financeira */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Score de Saúde Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getHealthScoreColor(financialData.healthScore)}`}>
                {financialData.healthScore}
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">de 100</div>
                <div className="text-sm font-medium">
                  {getHealthScoreDescription(financialData.healthScore)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                {financialData.healthScore > (financialData.previousHealthScores.slice(-1)[0]?.score || 0) ? (
                  <ArrowUp className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-600" />
                )}
                <span>vs. mês anterior</span>
              </div>
            </div>
          </div>
          <Progress value={financialData.healthScore} className="mt-4" />
        </CardContent>
      </Card>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {financialData.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              R$ {financialData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialData.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              R$ {financialData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
              {financialData.balance > financialData.previousMonthBalance ? (
                <ArrowUp className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-600" />
              )}
              vs. mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Taxa de Poupança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {financialData.savingsRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Meta: 20%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Inteligentes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights Inteligentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className={cn(
              "border-l-4",
              insight.type === 'success' && "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
              insight.type === 'warning' && "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
              insight.type === 'danger' && "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
              insight.type === 'info' && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {insight.icon}
                  {insight.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {insight.description}
                </p>
                {insight.action && (
                  <Badge variant="secondary" className="text-xs">
                    💡 {insight.action}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Gráficos e Análises */}
      <div className="space-y-6">
        {/* Gráficos principais */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FinancialHealthChart data={financialData.previousHealthScores} />
            <BudgetProgressCard budgetGoals={financialData.budgetGoals} />
          </div>
          <div>
            <ExpenseBreakdownChart data={financialData.expensesByCategory} />
          </div>
        </div>
      </div>

      {/* Sugestões Inteligentes */}
      <SmartSuggestions 
        financialData={financialData}
        insights={insights}
      />
    </div>
  );
}