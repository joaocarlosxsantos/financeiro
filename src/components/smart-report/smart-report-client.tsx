'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Wallet,
  Info,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { formatDateBrasilia, getNowBrasilia } from '@/lib/datetime-brasilia';
import { getMonthYear } from '@/lib/utils';
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
  const [currentDate, setCurrentDate] = useState(() => getNowBrasilia());
  
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);

  // Funções de navegação do mês
  const today = new Date();
  const isAtCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth() === today.getMonth();

  const handlePreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    if (!isAtCurrentMonth) {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + 1);
        return newDate;
      });
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [currentDate]);

  const fetchFinancialData = async () => {
    setLoading(true);
    const selectedMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    console.log('Iniciando busca de dados financeiros para o mês:', selectedMonth);
    
    try {
      const url = `/api/smart-report?month=${selectedMonth}`;
      console.log('Fazendo requisição para:', url);
      
      const response = await fetch(url);
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta da API:', errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      
      // Verificar se os dados parecem válidos (não são apenas zeros ou dados padrão)
      const hasValidData = data.totalIncome > 0 || data.totalExpenses > 0 || (data.expensesByCategory && data.expensesByCategory.length > 0);
      
      if (!hasValidData) {
        console.warn('API retornou dados vazios ou inválidos. Total Income:', data.totalIncome, 'Total Expenses:', data.totalExpenses, 'Categories:', data.expensesByCategory?.length);
      } else {
        console.log('✅ Dados válidos recebidos da API');
      }
      
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
      setIsUsingDemoData(false);
      console.log('✅ SMART REPORT - Usando dados reais do usuário');
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      console.error('URL da requisição:', `/api/smart-report?month=${selectedMonth}`);
      console.warn('🔴 SMART REPORT - Erro na API, mostrando dados vazios');
      
      // Criar dados vazios em vez de dados demo
      const emptyData: FinancialData = {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        previousMonthBalance: 0,
        savingsRate: 0,
        expensesByCategory: [],
        creditCardUsage: 0,
        creditCardLimit: 0,
        recurringExpenses: 0,
        largestExpense: {
          description: 'Nenhuma despesa encontrada',
          amount: 0,
          category: 'N/A'
        },
        unusualTransactions: [],
        healthScore: 0,
        previousHealthScores: [],
        budgetGoals: []
      };

      setFinancialData(emptyData);
      setInsights([]);
      setIsUsingDemoData(true);
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
            Relatórios Inteligentes
          </h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-4">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cartão de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {financialData.creditCardLimit > 0 
                ? ((financialData.creditCardUsage / financialData.creditCardLimit) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              R$ {financialData.creditCardUsage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} usado
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Gastos Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              R$ {financialData.recurringExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {financialData.totalExpenses > 0 
                ? ((financialData.recurringExpenses / financialData.totalExpenses) * 100).toFixed(1)
                : 0}% do total
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <FinancialHealthChart data={financialData.previousHealthScores} />
            <BudgetProgressCard budgetGoals={financialData.budgetGoals} />
          </div>
          <div className="xl:col-span-1">
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