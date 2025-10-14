'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingDown, 
  PiggyBank, 
  CreditCard, 
  Zap,
  ArrowRight,
  DollarSign,
  Target,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
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
}

interface SmartInsight {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: string;
  value?: number;
  icon: React.ReactNode;
}

interface SmartSuggestionsProps {
  financialData: FinancialData;
  insights: SmartInsight[];
}

interface Suggestion {
  id: string;
  type: 'saving' | 'spending' | 'credit' | 'investment' | 'emergency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSaving?: number;
  actionSteps: string[];
  icon: React.ReactNode;
}

export function SmartSuggestions({ financialData, insights }: SmartSuggestionsProps) {
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // Sugestão baseada na maior categoria de gastos
    const highestExpenseCategory = financialData.expensesByCategory[0];
    if (highestExpenseCategory && highestExpenseCategory.percentage > 30) {
      suggestions.push({
        id: 'reduce-highest-category',
        type: 'spending',
        priority: 'high',
        title: `Otimizar Gastos em ${highestExpenseCategory.categoryName}`,
        description: `Esta categoria representa ${highestExpenseCategory.percentage.toFixed(1)}% dos seus gastos. Pequenas reduções podem gerar grandes economias.`,
        potentialSaving: highestExpenseCategory.amount * 0.15, // 15% de economia potencial
        actionSteps: [
          'Analise os gastos detalhados desta categoria',
          'Identifique itens supérfluos ou de menor prioridade',
          'Estabeleça um limite mensal específico',
          'Monitore semanalmente os gastos desta categoria'
        ],
        icon: <TrendingDown className="h-5 w-5" />
      });
    }

    // Sugestão sobre taxa de poupança
    if (financialData.savingsRate < 20) {
      const targetSavings = financialData.totalIncome * 0.2;
      const currentSavings = financialData.balance;
      const additionalSavingsNeeded = targetSavings - currentSavings;
      
      suggestions.push({
        id: 'increase-savings',
        type: 'saving',
        priority: 'high',
        title: 'Aumentar Taxa de Poupança',
        description: `Sua taxa atual de poupança é ${financialData.savingsRate.toFixed(1)}%. O ideal é pelo menos 20%.`,
        potentialSaving: additionalSavingsNeeded,
        actionSteps: [
          'Defina uma meta de poupança automática',
          'Configure transferências automáticas no início do mês',
          'Revise gastos não essenciais mensalmente',
          'Considere fontes de renda extra'
        ],
        icon: <PiggyBank className="h-5 w-5" />
      });
    }

    // Sugestão sobre cartão de crédito
    const creditUsagePercentage = (financialData.creditCardUsage / financialData.creditCardLimit) * 100;
    if (creditUsagePercentage > 30) {
      suggestions.push({
        id: 'reduce-credit-usage',
        type: 'credit',
        priority: creditUsagePercentage > 70 ? 'high' : 'medium',
        title: 'Reduzir Uso do Cartão de Crédito',
        description: `Você está usando ${creditUsagePercentage.toFixed(1)}% do limite. O uso ideal é abaixo de 30%.`,
        actionSteps: [
          'Quite parte da fatura antes do vencimento',
          'Use dinheiro ou débito para compras menores',
          'Considere parcelar grandes compras em várias faturas',
          'Monitore o uso semanalmente'
        ],
        icon: <CreditCard className="h-5 w-5" />
      });
    }

    // Sugestão sobre gastos recorrentes
    const recurringPercentage = (financialData.recurringExpenses / financialData.totalExpenses) * 100;
    if (recurringPercentage > 60) {
      suggestions.push({
        id: 'review-subscriptions',
        type: 'spending',
        priority: 'medium',
        title: 'Revisar Assinaturas e Serviços',
        description: `${recurringPercentage.toFixed(1)}% dos seus gastos são recorrentes. Hora de fazer uma auditoria!`,
        potentialSaving: financialData.recurringExpenses * 0.2, // 20% de economia potencial
        actionSteps: [
          'Liste todas as assinaturas e serviços recorrentes',
          'Identifique quais você realmente usa',
          'Cancele ou negocie valores dos que usa pouco',
          'Configure lembretes para revisar anualmente'
        ],
        icon: <Zap className="h-5 w-5" />
      });
    }

    // Sugestão sobre transações incomuns
    if (financialData.unusualTransactions.length > 0) {
      const totalUnusual = financialData.unusualTransactions.reduce((sum, t) => sum + t.amount, 0);
      suggestions.push({
        id: 'monitor-unusual-spending',
        type: 'spending',
        priority: 'low',
        title: 'Monitorar Gastos Excepcionais',
        description: `Foram identificados ${financialData.unusualTransactions.length} gastos excepcionais no período.`,
        potentialSaving: totalUnusual * 0.5, // Evitar metade dos gastos excepcionais
        actionSteps: [
          'Reflita sobre a necessidade real de cada compra excepcional',
          'Estabeleça um "período de reflexão" para grandes compras',
          'Crie uma categoria de "compras planejadas" no orçamento',
          'Use a regra do "aguardar 24h" para compras por impulso'
        ],
        icon: <AlertTriangle className="h-5 w-5" />
      });
    }

    // Sugestão de investimento (se tem boa margem de sobra)
    if (financialData.savingsRate > 25) {
      const excessSavings = (financialData.savingsRate - 20) / 100 * financialData.totalIncome;
      suggestions.push({
        id: 'consider-investment',
        type: 'investment',
        priority: 'medium',
        title: 'Considerar Investimentos',
        description: `Com uma excelente taxa de poupança, você poderia investir parte do excedente para fazer o dinheiro trabalhar para você.`,
        potentialSaving: excessSavings * 0.1, // 10% de retorno anual estimado
        actionSteps: [
          'Separe uma reserva de emergência (6 meses de gastos)',
          'Estude opções básicas de investimento (CDB, Tesouro Direto)',
          'Comece com pequenos valores mensais',
          'Busque orientação de um consultor financeiro'
        ],
        icon: <Target className="h-5 w-5" />
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const suggestions = generateSuggestions();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta Prioridade';
      case 'medium': return 'Média Prioridade';
      case 'low': return 'Baixa Prioridade';
      default: return 'Prioridade';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'saving': return <PiggyBank className="h-4 w-4" />;
      case 'spending': return <TrendingDown className="h-4 w-4" />;
      case 'credit': return <CreditCard className="h-4 w-4" />;
      case 'investment': return <Target className="h-4 w-4" />;
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Sugestões Personalizadas
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Recomendações baseadas na sua situação financeira atual
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    {suggestion.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-1">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {suggestion.description}
                    </p>
                    {suggestion.potentialSaving && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Economia potencial: {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(suggestion.potentialSaving)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {getPriorityLabel(suggestion.priority)}
                  </Badge>
                  <div className="p-1 rounded">
                    {getTypeIcon(suggestion.type)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <ArrowRight className="h-4 w-4" />
                  Passos recomendados:
                </h5>
                <ol className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.actionSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}

          {suggestions.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sua situação financeira está muito bem equilibrada!</p>
              <p className="text-sm mt-2">Continue mantendo seus bons hábitos financeiros.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}