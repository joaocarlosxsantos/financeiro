"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type ChallengeTemplate } from '@/lib/challenge-templates';
import { cn } from '@/lib/utils';
import { Check, Clock, Trophy, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChallengeTemplateCardProps {
  template: ChallengeTemplate;
  onAccept: (template: ChallengeTemplate) => void;
  disabled?: boolean;
}

export function ChallengeTemplateCard({ 
  template, 
  onAccept, 
  disabled = false 
}: ChallengeTemplateCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
      case 'HARD':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
      case 'EXPERT':
        return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400';
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "group relative overflow-hidden p-6 transition-all hover:shadow-lg",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        {/* Decorative gradient */}
        <div className="absolute right-0 top-0 h-32 w-32 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 blur-2xl" />
        </div>

        {/* Header */}
        <div className="relative mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-3xl">
                {template.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{template.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={cn('text-xs', getDifficultyColor(template.difficulty))}>
              {getDifficultyLabel(template.difficulty)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {template.duration} dias
            </Badge>
            {template.category && (
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Goal */}
        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Meta</span>
            <span className="text-lg font-bold text-primary">
              {template.type === 'SAVINGS' || 
               template.type === 'BUDGET_LIMIT' || 
               template.type === 'DEBT_REDUCTION' || 
               template.type === 'INCOME_INCREASE'
                ? `R$ ${template.goal.toFixed(2)}`
                : `${template.goal} ${template.duration > 1 ? 'dias' : 'dia'}`}
            </span>
          </div>
        </div>

        {/* Reward */}
        <div className="mb-4 rounded-lg bg-amber-500/10 p-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {template.reward}
            </span>
          </div>
        </div>

        {/* Tips */}
        {template.tips.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span>Dicas para alcançar:</span>
            </div>
            <ul className="space-y-1.5 pl-6">
              {template.tips.slice(0, 3).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            {template.tips.length > 3 && (
              <p className="pl-6 text-xs text-muted-foreground">
                +{template.tips.length - 3} dica{template.tips.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Action button */}
        <Button 
          className="w-full" 
          onClick={() => onAccept(template)}
          disabled={disabled}
        >
          {disabled ? 'Desafio Aceito' : 'Aceitar Desafio'}
        </Button>
      </Card>
    </motion.div>
  );
}
