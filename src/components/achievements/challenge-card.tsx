"use client";

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Target, Trophy, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChallengeCardProps {
  challenge: {
    id: string;
    type: string;
    title: string;
    description: string;
    goal: number;
    current: number;
    startDate: Date;
    endDate: Date;
    status: string;
    difficulty: string;
    reward?: string;
  };
  onUpdate?: (id: string, current: number) => void;
}

export function ChallengeCard({ challenge, onUpdate }: ChallengeCardProps) {
  const progress = (challenge.current / challenge.goal) * 100;
  const daysLeft = Math.ceil(
    (new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'HARD':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'EXPERT':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      EASY: 'Fácil',
      MEDIUM: 'Médio',
      HARD: 'Difícil',
      EXPERT: 'Expert',
    };
    return labels[difficulty] || difficulty;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-500/10 text-blue-500';
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500';
      case 'FAILED':
        return 'bg-red-500/10 text-red-500';
      case 'ABANDONED':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      COMPLETED: 'Completado',
      FAILED: 'Falhou',
      ABANDONED: 'Abandonado',
    };
    return labels[status] || status;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden p-6 transition-all hover:shadow-lg',
          challenge.status === 'COMPLETED' && 'border-green-500/50 bg-green-500/5'
        )}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{challenge.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {challenge.description}
              </p>
            </div>
          </div>

          <Badge className={cn('text-xs', getStatusColor(challenge.status))}>
            {getStatusLabel(challenge.status)}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              R$ {challenge.current.toFixed(2)} / R$ {challenge.goal.toFixed(2)}
            </span>
            <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerrado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <Badge className={getDifficultyColor(challenge.difficulty)}>
              {getDifficultyLabel(challenge.difficulty)}
            </Badge>
          </div>
        </div>

        {/* Reward */}
        {challenge.reward && (
          <div className="mt-4 rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500">
                Recompensa: {challenge.reward}
              </span>
            </div>
          </div>
        )}

        {/* Action button (apenas para desafios ativos) */}
        {challenge.status === 'ACTIVE' && onUpdate && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => onUpdate(challenge.id, challenge.current)}
          >
            Atualizar Progresso
          </Button>
        )}

        {/* Completed indicator */}
        {challenge.status === 'COMPLETED' && (
          <div className="absolute right-4 top-4">
            <Trophy className="h-8 w-8 text-green-500" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
