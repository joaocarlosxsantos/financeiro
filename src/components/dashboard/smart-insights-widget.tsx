'use client';

/**
 * Smart Insights Widget
 * 
 * Widget de insights automáticos que exibe análises inteligentes
 * e sugestões acionáveis baseadas nos dados financeiros do usuário.
 * 
 * Integrado com o sistema de IA existente para gerar insights relevantes.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, AlertTriangle, Lightbulb, TrendingUp, Target, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateAllAlerts, Alert as SmartAlert } from '@/lib/smart-alerts';

export interface SmartInsight {
  type: 'warning' | 'tip' | 'achievement' | 'info' | 'action';
  title: string;
  message: string;
  actionable?: string; // Sugestão de ação
  priority: 'high' | 'medium' | 'low';
}

interface SmartInsightsWidgetProps {
  insights: SmartInsight[];
  onDismiss?: (index: number) => void;
}

/**
 * Retorna o ícone apropriado baseado no tipo de insight
 */
function getInsightIcon(type: SmartInsight['type']) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'tip':
      return <Lightbulb className="w-5 h-5" />;
    case 'achievement':
      return <TrendingUp className="w-5 h-5" />;
    case 'action':
      return <Target className="w-5 h-5" />;
    case 'info':
    default:
      return <Info className="w-5 h-5" />;
  }
}

/**
 * Retorna as cores baseadas no tipo de insight
 */
function getInsightColors(type: SmartInsight['type']) {
  switch (type) {
    case 'warning':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        title: 'text-red-900 dark:text-red-300',
        text: 'text-red-700 dark:text-red-400',
      };
    case 'tip':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        title: 'text-blue-900 dark:text-blue-300',
        text: 'text-blue-700 dark:text-blue-400',
      };
    case 'achievement':
      return {
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-400',
        title: 'text-green-900 dark:text-green-300',
        text: 'text-green-700 dark:text-green-400',
      };
    case 'action':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-800',
        icon: 'text-purple-600 dark:text-purple-400',
        title: 'text-purple-900 dark:text-purple-300',
        text: 'text-purple-700 dark:text-purple-400',
      };
    case 'info':
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-950/30',
        border: 'border-gray-200 dark:border-gray-800',
        icon: 'text-gray-600 dark:text-gray-400',
        title: 'text-gray-900 dark:text-gray-300',
        text: 'text-gray-700 dark:text-gray-400',
      };
  }
}

/**
 * Componente individual de insight
 */
function InsightCard({ 
  insight, 
  onDismiss 
}: { 
  insight: SmartInsight; 
  onDismiss?: () => void;
}) {
  const colors = getInsightColors(insight.type);
  const icon = getInsightIcon(insight.type);

  return (
    <Card className={`${colors.bg} ${colors.border} border-2 relative`}>
      <CardContent className="p-4">
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        
        <div className="flex gap-3">
          <div className={`${colors.icon} mt-0.5 flex-shrink-0`}>
            {icon}
          </div>
          
          <div className="flex-1 space-y-1">
            <h4 className={`font-semibold text-sm ${colors.title}`}>
              {insight.title}
            </h4>
            
            <p className={`text-sm ${colors.text}`}>
              {insight.message}
            </p>
            
            {insight.actionable && (
              <div className={`mt-2 text-xs font-medium ${colors.title} bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-md`}>
                💡 {insight.actionable}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget principal de insights
 */
export function SmartInsightsWidget({ 
  insights, 
  onDismiss 
}: SmartInsightsWidgetProps) {
  const [dismissedIndexes, setDismissedIndexes] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filtrar insights não descartados
  const activeInsights = insights.filter((_, i) => !dismissedIndexes.has(i));

  // Se não há insights, não renderizar nada
  if (activeInsights.length === 0) {
    return null;
  }

  // Rotacionar insights a cada 10 segundos
  useEffect(() => {
    if (activeInsights.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeInsights.length);
    }, 10000); // 10 segundos

    return () => clearInterval(timer);
  }, [activeInsights.length]);

  // Insight atual sendo exibido
  const currentInsight = activeInsights[currentIndex];
  const originalIndex = insights.indexOf(currentInsight);

  const handleDismiss = () => {
    setDismissedIndexes((prev) => {
      const newSet = new Set(prev);
      newSet.add(originalIndex);
      return newSet;
    });
    onDismiss?.(originalIndex);
    
    // Ajustar índice atual se necessário
    if (currentIndex >= activeInsights.length - 1) {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="w-full" data-tour="smart-insights">
      <InsightCard 
        insight={currentInsight} 
        onDismiss={handleDismiss}
      />
      
      {/* Indicadores de paginação (se houver múltiplos insights) */}
      {activeInsights.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {activeInsights.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex 
                  ? 'w-6 bg-primary' 
                  : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Ver insight ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Função auxiliar para gerar insights automaticamente
 * baseados nos dados do dashboard. Agora integrada com sistema de alertas inteligentes.
 */
export function generateSmartInsights(data: {
  totalIncome: number;
  totalExpenses: number;
  saldoDoMes: number;
  savingsRate: number;
  topExpenseCategories: Array<{ category: string; amount: number; diff: number; prevAmount?: number }>;
  recurringExpenses?: number;
  goalProgress?: Array<{ name: string; progress: number; remaining: number }>;
  monthComparison?: {
    expensesDiff: number;
    incomeDiff: number;
  };
  // Dados históricos para alertas inteligentes
  historicalData?: {
    expenses: number[]; // Últimos meses
    savingsRate?: number; // Mês anterior
  };
}): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // ===== INTEGRAÇÃO COM SISTEMA DE ALERTAS INTELIGENTES =====
  if (data.historicalData) {
    const alerts = generateAllAlerts({
      currentExpenses: data.totalExpenses,
      historicalExpenses: data.historicalData.expenses,
      currentSavingsRate: data.savingsRate,
      previousSavingsRate: data.historicalData.savingsRate || data.savingsRate,
      categories: data.topExpenseCategories
        .filter(cat => cat.prevAmount !== undefined)
        .map(cat => ({
          name: cat.category,
          current: cat.amount,
          historical: cat.prevAmount ? [cat.prevAmount] : [],
        })),
    });

    // Converter alertas em insights
    for (const alert of alerts.slice(0, 3)) { // Pegar no máximo 3 alertas
      insights.push({
        type: alert.severity === 'critical' ? 'warning' : alert.severity === 'warning' ? 'warning' : 'info',
        priority: alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low',
        title: alert.title,
        message: alert.message,
        actionable: alert.action,
      });
    }
  }

  // ===== INSIGHTS EXISTENTES (mantidos como fallback) =====

  // 1. Taxa de poupança
  if (data.savingsRate > 20) {
    insights.push({
      type: 'achievement',
      priority: 'high',
      title: '🎉 Excelente controle financeiro!',
      message: `Você está poupando ${data.savingsRate.toFixed(1)}% da sua renda este mês.`,
      actionable: 'Continue assim e considere investir essa economia para fazer seu dinheiro crescer.',
    });
  } else if (data.savingsRate < 5 && data.savingsRate > 0) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: '⚠️ Taxa de poupança muito baixa',
      message: `Você está poupando apenas ${data.savingsRate.toFixed(1)}% da sua renda.`,
      actionable: 'Tente cortar 10% dos gastos nas categorias principais para aumentar sua reserva.',
    });
  } else if (data.savingsRate <= 0) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: '🚨 Atenção: Gastos acima da renda',
      message: `Seus gastos estão R$ ${Math.abs(data.saldoDoMes).toFixed(2)} acima da sua renda este mês.`,
      actionable: 'Urgente: revise seus gastos e identifique onde pode economizar imediatamente.',
    });
  }

  // 2. Categoria com maior crescimento
  const growingCategory = data.topExpenseCategories.find(
    (cat) => cat.diff > 30 && cat.prevAmount && cat.prevAmount > 0
  );
  
  if (growingCategory) {
    insights.push({
      type: 'warning',
      priority: 'medium',
      title: `📈 Gastos crescendo em ${growingCategory.category}`,
      message: `Seus gastos nesta categoria aumentaram ${growingCategory.diff.toFixed(0)}% em relação ao mês anterior.`,
      actionable: `Analise suas transações em ${growingCategory.category} e identifique oportunidades de economia.`,
    });
  }

  // 3. Categoria de maior gasto
  const topCategory = data.topExpenseCategories[0];
  if (topCategory) {
    const percentage = data.totalExpenses > 0 
      ? (topCategory.amount / data.totalExpenses) * 100 
      : 0;
    
    if (percentage > 30) {
      insights.push({
        type: 'info',
        priority: 'medium',
        title: `💰 ${topCategory.category} é sua maior despesa`,
        message: `${percentage.toFixed(1)}% dos seus gastos (R$ ${topCategory.amount.toFixed(2)}) estão nesta categoria.`,
        actionable: 'Considere revisar se há oportunidades de economia nesta área.',
      });
    }
  }

  // 4. Despesas recorrentes
  if (data.recurringExpenses && data.recurringExpenses > data.totalExpenses * 0.5) {
    insights.push({
      type: 'tip',
      priority: 'medium',
      title: '🔄 Muitos gastos recorrentes detectados',
      message: `R$ ${data.recurringExpenses.toFixed(2)} em despesas fixas mensais.`,
      actionable: 'Revise assinaturas e contratos. Cancelar serviços não utilizados pode liberar dinheiro.',
    });
  }

  // 5. Meta próxima de conclusão
  const nearGoal = data.goalProgress?.find((g) => g.progress > 80 && g.progress < 100);
  if (nearGoal) {
    insights.push({
      type: 'achievement',
      priority: 'high',
      title: `🎯 Meta "${nearGoal.name}" quase alcançada!`,
      message: `Faltam apenas R$ ${nearGoal.remaining.toFixed(2)} para completar.`,
      actionable: 'Considere fazer um aporte extra este mês para completar sua meta.',
    });
  }

  // 6. Comparação com mês anterior
  if (data.monthComparison) {
    if (data.monthComparison.expensesDiff < -10) {
      insights.push({
        type: 'achievement',
        priority: 'medium',
        title: '👏 Gastos em queda!',
        message: `Você gastou ${Math.abs(data.monthComparison.expensesDiff).toFixed(1)}% a menos que no mês passado.`,
        actionable: 'Continue com esse controle! Identifique o que mudou e mantenha o padrão.',
      });
    } else if (data.monthComparison.expensesDiff > 20) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: '📊 Gastos aumentaram',
        message: `Seus gastos subiram ${data.monthComparison.expensesDiff.toFixed(1)}% em relação ao mês anterior.`,
        actionable: 'Revise suas transações recentes e identifique o que causou esse aumento.',
      });
    }
  }

  // 7. Dica geral (sempre incluir uma)
  if (insights.length < 3) {
    insights.push({
      type: 'tip',
      priority: 'low',
      title: '💡 Dica do consultor financeiro',
      message: 'A regra 50-30-20 sugere: 50% para necessidades, 30% para desejos, 20% para poupança.',
      actionable: 'Compare seus gastos com essa regra para identificar ajustes necessários.',
    });
  }

  // Ordenar por prioridade
  return insights.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}
