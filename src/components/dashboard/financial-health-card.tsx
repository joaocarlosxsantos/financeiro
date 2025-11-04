'use client';

/**
 * Financial Health Score Card
 * 
 * Card gamificado que mostra o "score de saúde financeira" do usuário (0-100)
 * baseado em múltiplos fatores como taxa de poupança, cumprimento de metas,
 * controle de gastos, etc.
 * 
 * Inclui sistema de conquistas (achievements) para motivar bons hábitos financeiros.
 * 
 * @component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, TrendingUp, Target, Award, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface HealthScoreData {
  totalIncome: number;
  totalExpenses: number;
  saldoDoMes: number;
  savingsRate: number;
  consecutivePositiveMonths: number;
  goalsAchieved: number;
  totalGoals: number;
  expensesVsAverage: number; // % diferença da média
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: '🏆' | '⭐' | '💎' | '🎯' | '⚡' | '🔥';
  unlocked: boolean;
  progress?: number; // 0-100
}

/**
 * Calcula o score de saúde financeira (0-100)
 */
export function calculateHealthScore(data: HealthScoreData): number {
  let score = 0;

  // 1. Taxa de poupança (30 pontos max)
  if (data.savingsRate >= 20) {
    score += 30;
  } else if (data.savingsRate >= 10) {
    score += 20;
  } else if (data.savingsRate >= 5) {
    score += 10;
  } else if (data.savingsRate > 0) {
    score += 5;
  }

  // 2. Saldo positivo (20 pontos)
  if (data.saldoDoMes > 0) {
    score += 20;
  } else if (data.saldoDoMes > -100) {
    score += 10; // Quase zerado
  }

  // 3. Consistência (20 pontos max)
  if (data.consecutivePositiveMonths >= 6) {
    score += 20;
  } else if (data.consecutivePositiveMonths >= 3) {
    score += 15;
  } else if (data.consecutivePositiveMonths >= 1) {
    score += 10;
  }

  // 4. Metas (15 pontos max)
  if (data.totalGoals > 0) {
    const goalsRate = (data.goalsAchieved / data.totalGoals) * 100;
    if (goalsRate >= 80) {
      score += 15;
    } else if (goalsRate >= 50) {
      score += 10;
    } else if (goalsRate >= 20) {
      score += 5;
    }
  }

  // 5. Controle de gastos (15 pontos max)
  if (data.expensesVsAverage <= -10) {
    score += 15; // Gastando menos que a média
  } else if (data.expensesVsAverage <= 0) {
    score += 10;
  } else if (data.expensesVsAverage <= 10) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Retorna cor e rótulo baseado no score
 */
export function getScoreLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  emoji: string;
} {
  if (score >= 80) {
    return {
      label: 'Excelente',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      emoji: '🏆',
    };
  } else if (score >= 60) {
    return {
      label: 'Bom',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      emoji: '⭐',
    };
  } else if (score >= 40) {
    return {
      label: 'Regular',
      color: 'text-yellow-600 dark:text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
      emoji: '⚠️',
    };
  } else {
    return {
      label: 'Precisa melhorar',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      emoji: '🚨',
    };
  }
}

/**
 * Verifica conquistas desbloqueadas
 */
export function checkAchievements(data: HealthScoreData): Achievement[] {
  return [
    {
      id: 'first_positive',
      title: 'Primeiro Saldo Positivo',
      description: 'Termine o mês com saldo positivo',
      icon: '⭐',
      unlocked: data.saldoDoMes > 0,
    },
    {
      id: 'savings_master',
      title: 'Mestre da Economia',
      description: 'Poupe 20% ou mais da renda',
      icon: '💎',
      unlocked: data.savingsRate >= 20,
      progress: Math.min(100, (data.savingsRate / 20) * 100),
    },
    {
      id: 'three_months',
      title: 'Consistência',
      description: '3 meses consecutivos com saldo positivo',
      icon: '🔥',
      unlocked: data.consecutivePositiveMonths >= 3,
      progress: Math.min(100, (data.consecutivePositiveMonths / 3) * 100),
    },
    {
      id: 'six_months',
      title: 'Disciplina de Ferro',
      description: '6 meses consecutivos com saldo positivo',
      icon: '🏆',
      unlocked: data.consecutivePositiveMonths >= 6,
      progress: Math.min(100, (data.consecutivePositiveMonths / 6) * 100),
    },
    {
      id: 'goals_achiever',
      title: 'Realizador de Metas',
      description: 'Complete 80% das suas metas',
      icon: '🎯',
      unlocked: data.totalGoals > 0 && (data.goalsAchieved / data.totalGoals) >= 0.8,
      progress: data.totalGoals > 0 ? (data.goalsAchieved / data.totalGoals) * 100 : 0,
    },
    {
      id: 'expense_cutter',
      title: 'Corte de Gastos',
      description: 'Gaste 10% menos que sua média',
      icon: '⚡',
      unlocked: data.expensesVsAverage <= -10,
      progress: data.expensesVsAverage <= 0 
        ? Math.min(100, Math.abs(data.expensesVsAverage) * 10) 
        : 0,
    },
  ];
}

interface FinancialHealthCardProps {
  data: HealthScoreData;
}

/**
 * Componente de velocímetro circular para o score
 */
function ScoreGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const level = getScoreLevel(score);

  // Animação do score
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Calcular ângulo (0-180 graus = semicírculo)
  // 0 = esquerda (-90°), 50 = meio (0°), 100 = direita (90°)
  const percentage = animatedScore / 100;
  const angle = percentage * 180; // 0 a 180 graus
  const rotation = angle - 90; // Ajustar para começar na esquerda

  // Calcular dash array para o arco SVG (mais preciso que clipPath)
  const radius = 75; // raio do círculo
  const circumference = Math.PI * radius; // metade da circunferência (semicírculo)
  const dashOffset = circumference - (percentage * circumference);

  return (
    <div className="relative w-56 h-36 mx-auto">
      {/* Gauge usando SVG para precisão */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 170 100"
        style={{ overflow: 'visible' }}
      >
        {/* Fundo do gauge (cinza) */}
        <path
          d="M 20 92 A 75 75 0 0 1 150 92"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Gauge preenchido (colorido) */}
        <path
          d="M 20 92 A 75 75 0 0 1 150 92"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`transition-all duration-1000 ease-out ${
            score >= 80
              ? 'text-green-500'
              : score >= 60
              ? 'text-blue-500'
              : score >= 40
              ? 'text-yellow-500'
              : 'text-red-500'
          }`}
          style={{
            transformOrigin: '85px 92px',
          }}
        />

        {/* Marcadores de referência */}
        <g className="text-gray-400 dark:text-gray-600">
          {/* 0 */}
          <text x="10" y="98" fontSize="11" fill="currentColor" fontWeight="500">0</text>
          {/* 50 */}
          <text x="85" y="24" fontSize="11" fill="currentColor" textAnchor="middle" fontWeight="500">50</text>
          {/* 100 */}
          <text x="158" y="98" fontSize="11" fill="currentColor" textAnchor="end" fontWeight="500">100</text>
        </g>
      </svg>

      {/* Ponteiro - centralizado e proporcional */}
      <div 
        className="absolute left-1/2 origin-bottom transition-transform duration-1000 ease-out" 
        style={{ 
          bottom: 'calc(36px)', // Altura do container - posição do centro do arco
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          zIndex: 10 
        }}
      >
        {/* Haste do ponteiro */}
        <div
          className="w-1.5 h-[72px] bg-gradient-to-t from-gray-900 to-gray-700 dark:from-white dark:to-gray-200"
          style={{ 
            borderRadius: '999px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
            transformOrigin: 'bottom center'
          }}
        >
          {/* Ponta triangular do ponteiro */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-red-500 shadow-md" />
        </div>
      </div>

      {/* Base do ponteiro - fixo no centro */}
      <div 
        className="absolute left-1/2 w-5 h-5 bg-gray-900 dark:bg-white rounded-full shadow-xl border-2 border-gray-700 dark:border-gray-300"
        style={{ 
          bottom: 'calc(36px - 10px)', // Centralizado
          transform: 'translateX(-50%)',
          zIndex: 11 
        }}
      />

      {/* Score no centro */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center" style={{ zIndex: 5 }}>
        <div className={`text-4xl font-bold ${level.color} leading-none`}>
          {animatedScore}
        </div>
        <div className="text-xs text-muted-foreground font-medium mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

/**
 * Componente principal do card
 */
export function FinancialHealthCard({ data }: FinancialHealthCardProps) {
  const score = calculateHealthScore(data);
  const level = getScoreLevel(score);
  const achievements = checkAchievements(data);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className={`${level.bgColor} border-2`} data-tour="health-score">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Saúde Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge de score */}
        <div className="py-2">
          <ScoreGauge score={score} />
          <div className="text-center mt-3">
            <span className={`text-lg font-semibold ${level.color}`}>
              {level.emoji} {level.label}
            </span>
          </div>
        </div>

        {/* Conquistas - grid com mais espaço */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Conquistas</span>
            <span className="text-xs text-muted-foreground">
              {unlockedCount} / {achievements.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative p-2.5 rounded-lg text-center transition-all ${
                  achievement.unlocked
                    ? 'bg-white dark:bg-gray-800 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-900 opacity-40'
                }`}
                title={`${achievement.title}: ${achievement.description}`}
              >
                <div className="text-2xl mb-1">{achievement.icon}</div>
                <div className="text-[10px] font-medium text-foreground leading-tight">
                  {achievement.title.split(' ')[0]}
                </div>

                {/* Barra de progresso (se não desbloqueado) */}
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dicas rápidas - mais espaçadas */}
        <div className="text-xs text-muted-foreground space-y-1.5 pt-2 border-t border-muted">
          <p className="font-medium text-xs">💡 Como melhorar:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            {score < 80 && <li>Aumente sua taxa de poupança para 20%</li>}
            {data.consecutivePositiveMonths < 3 && <li>Mantenha saldo positivo por 3 meses</li>}
            {data.expensesVsAverage > 0 && <li>Reduza gastos em relação à sua média</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
