"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EmergencyFundWidget } from '@/components/emergency-fund/emergency-fund-widget';
import { cn } from '@/lib/utils';
import {
  calculateEmergencyFund,
  generateContributionSuggestions,
  getEmergencyFundTips,
  calculateRiskLevel,
  type EmergencyFundData,
  type EmergencyFundSuggestion,
} from '@/lib/emergency-fund';
import { 
  Shield, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmergencyFundPage() {
  const [loading, setLoading] = useState(true);
  const [fundData, setFundData] = useState<EmergencyFundData | null>(null);
  const [suggestions, setSuggestions] = useState<EmergencyFundSuggestion[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [selectedMonths, setSelectedMonths] = useState(6);

  useEffect(() => {
    fetchData();
  }, [selectedMonths]);

  const fetchData = async () => {
    try {
      // Busca dados financeiros
      const response = await fetch('/api/dashboard-summary');
      const data = await response.json();

      const totalSavings = data.balance || 0;
      const avgExpenses = Math.abs(data.totalExpenses || 0);
      const avgIncome = data.totalIncome || 0;

      setMonthlyIncome(avgIncome);
      setMonthlyExpenses(avgExpenses);

      // Calcula reserva
      const fund = calculateEmergencyFund(totalSavings, avgExpenses, selectedMonths);
      setFundData(fund);

      // Gera sugestões
      const remainingAmount = Math.max(0, fund.targetAmount - fund.currentAmount);
      const contributionSuggestions = generateContributionSuggestions(
        remainingAmount,
        avgIncome,
        avgExpenses
      );
      setSuggestions(contributionSuggestions);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Calculando sua reserva...</p>
        </div>
      </div>
    );
  }

  if (!fundData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  const tips = getEmergencyFundTips(fundData.status);
  const riskLevel = calculateRiskLevel(fundData.percentageComplete);
  const remainingAmount = Math.max(0, fundData.targetAmount - fundData.currentAmount);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Reserva de Emergência</h1>
        </div>
        <p className="text-muted-foreground">
          Sua proteção financeira contra imprevistos
        </p>
      </div>

      {/* Main widget */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmergencyFundWidget data={fundData} compact={false} />
        </div>

        {/* Risk indicator */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className={cn("h-5 w-5", riskLevel.color)} />
            <h3 className="font-semibold">Nível de Risco</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className={cn("text-2xl font-bold", riskLevel.color)}>
                  {riskLevel.level}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {riskLevel.description}
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="text-sm font-medium">Recomendação</h4>
              <p className="text-sm text-muted-foreground">
                {fundData.status === 'none' && 'Comece sua reserva hoje mesmo! Qualquer valor faz diferença.'}
                {fundData.status === 'started' && 'Continue contribuindo regularmente para construir sua proteção.'}
                {fundData.status === 'halfway' && 'Você está na metade do caminho! Mantenha o ritmo.'}
                {fundData.status === 'complete' && 'Parabéns! Mantenha sua reserva e use apenas em emergências.'}
                {fundData.status === 'excellent' && 'Excepcional! Considere investir o excedente.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="plan">
            <Target className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <TrendingUp className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sugestões</span>
          </TabsTrigger>
          <TabsTrigger value="tips">
            <Lightbulb className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Dicas</span>
          </TabsTrigger>
        </TabsList>

        {/* Plan Tab */}
        <TabsContent value="plan" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Configure Sua Meta</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Quantos meses de despesas?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map((months) => (
                    <Button
                      key={months}
                      variant={selectedMonths === months ? 'default' : 'outline'}
                      onClick={() => setSelectedMonths(months)}
                    >
                      {months}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recomendado: 6-12 meses para segurança ideal
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Despesas Mensais</p>
                  <p className="text-2xl font-bold">
                    R$ {monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Meta Total</p>
                  <p className="text-2xl font-bold">
                    R$ {fundData.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {remainingAmount > 0 && (
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Falta Pouco!</h4>
                      <p className="text-sm text-muted-foreground">
                        Você precisa economizar mais{' '}
                        <span className="font-bold text-foreground">
                          R$ {remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>{' '}
                        para completar sua reserva.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold">Planos de Contribuição</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Escolha um plano que se encaixe no seu orçamento
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className={cn(
                    "p-6 transition-all hover:shadow-lg",
                    suggestion.priority === 'urgent' && 'border-red-500/50 bg-red-500/5',
                    suggestion.priority === 'high' && 'border-orange-500/50 bg-orange-500/5',
                    suggestion.priority === 'medium' && 'border-blue-500/50 bg-blue-500/5 ring-2 ring-blue-500/20'
                  )}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                    </div>
                    {suggestion.priority === 'medium' && (
                      <Badge className="bg-blue-500">Recomendado</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-background p-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Por mês</span>
                      </div>
                      <span className="text-lg font-bold">
                        R$ {suggestion.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-background p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Tempo</span>
                      </div>
                      <span className="text-lg font-bold">
                        {suggestion.timeline} {suggestion.timeline === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="mt-4 w-full"
                    variant={suggestion.priority === 'medium' ? 'default' : 'outline'}
                  >
                    Adotar Este Plano
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Tips Tab */}
        <TabsContent value="tips" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Dicas para Sua Reserva</h3>
            </div>

            <div className="space-y-3">
              {tips.map((tip, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 rounded-lg bg-muted/50 p-4"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <p className="text-sm">{tip}</p>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Additional tips */}
          <Card className="p-6">
            <h4 className="mb-4 font-semibold">Boas Práticas</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Mantenha sua reserva em conta separada e de fácil acesso</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Não invista em ativos de risco (ações, criptomoedas)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use apenas para verdadeiras emergências</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Reponha o valor sempre que precisar usar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Revise sua meta anualmente conforme mudanças nas despesas</span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
