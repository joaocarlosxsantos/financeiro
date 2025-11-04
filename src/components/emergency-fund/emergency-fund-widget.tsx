"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type EmergencyFundData, calculateRiskLevel, getEmergencyFundMilestones } from '@/lib/emergency-fund';
import { cn } from '@/lib/utils';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmergencyFundWidgetProps {
  data: EmergencyFundData;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function EmergencyFundWidget({ 
  data, 
  onViewDetails, 
  compact = false 
}: EmergencyFundWidgetProps) {
  const riskLevel = calculateRiskLevel(data.percentageComplete);
  const milestones = getEmergencyFundMilestones(data.targetAmount);

  const getStatusIcon = () => {
    switch (data.status) {
      case 'none':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'started':
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case 'halfway':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'complete':
      case 'excellent':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'none':
        return 'from-red-500/20 to-red-600/20 border-red-500/30';
      case 'started':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'halfway':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'complete':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'excellent':
        return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30';
    }
  };

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Reserva de Emergência</span>
          </div>
          {getStatusIcon()}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {data.percentageComplete.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {data.monthsOfExpenses} meses
            </span>
          </div>
          <Progress value={data.percentageComplete} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>R$ {data.currentAmount.toFixed(2)}</span>
            <span>R$ {data.targetAmount.toFixed(2)}</span>
          </div>
        </div>

        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3" 
            onClick={onViewDetails}
          >
            Ver Detalhes
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden p-6 bg-gradient-to-br",
      getStatusColor()
    )}>
      {/* Decorative background */}
      <div className="absolute right-0 top-0 h-40 w-40 opacity-10">
        <Shield className="h-full w-full" />
      </div>

      {/* Header */}
      <div className="relative mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Reserva de Emergência</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.monthsOfExpenses} meses de despesas
            </p>
          </div>
          
          <Badge className={cn("text-xs", riskLevel.color)}>
            Risco: {riskLevel.level}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="relative mb-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">
            {data.percentageComplete.toFixed(1)}%
          </span>
          <div className="text-right">
            <p className="text-sm font-medium">
              R$ {data.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">
              de R$ {data.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Progress bar with milestones */}
        <div className="relative">
          <Progress value={data.percentageComplete} className="h-3" />
          
          {/* Milestone markers */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {milestones.map((milestone, idx) => (
              <div
                key={idx}
                className="relative flex flex-col items-center"
                style={{ left: `${milestone.percentage}%` }}
              >
                <div
                  className={cn(
                    "h-1 w-1 rounded-full",
                    data.percentageComplete >= milestone.percentage
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          {milestones.map((milestone, idx) => (
            <span key={idx}>{milestone.label}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Contribuição Sugerida</p>
          <p className="text-lg font-bold">
            R$ {data.suggestedMonthlyContribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">por mês</p>
        </div>

        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">Tempo Estimado</p>
          <p className="text-lg font-bold">
            {data.monthsToComplete > 0 ? data.monthsToComplete : '∞'}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.monthsToComplete === 1 ? 'mês' : 'meses'}
          </p>
        </div>
      </div>

      {/* Action button */}
      {onViewDetails && (
        <Button 
          className="w-full" 
          onClick={onViewDetails}
          variant={data.status === 'none' ? 'default' : 'outline'}
        >
          {data.status === 'none' ? 'Começar Agora' : 'Ver Plano Completo'}
        </Button>
      )}
    </Card>
  );
}
