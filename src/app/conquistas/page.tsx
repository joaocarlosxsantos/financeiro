"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BadgeCard } from '@/components/achievements/badge-card';
import { ChallengeCard } from '@/components/achievements/challenge-card';
import { Leaderboard } from '@/components/achievements/leaderboard';
import { ChallengeBrowser } from '@/components/achievements/challenge-browser';
import { BADGE_DEFINITIONS } from '@/lib/achievements';
import { type ChallengeTemplate } from '@/lib/challenge-templates';
import { Trophy, Target, Users, Plus, TrendingUp, Award, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [achievementsRes, challengesRes, leaderboardRes] = await Promise.all([
        fetch('/api/achievements'),
        fetch('/api/challenges?status=ACTIVE'),
        fetch('/api/leaderboard?limit=10'),
      ]);

      const achievementsData = await achievementsRes.json();
      const challengesData = await challengesRes.json();
      const leaderboardData = await leaderboardRes.json();

      setAchievements(achievementsData.achievements || []);
      setStats(achievementsData.stats);
      setChallenges(challengesData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChallenge = async (template: ChallengeTemplate) => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + template.duration);

      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: template.type,
          title: template.title,
          description: template.description,
          goal: template.goal,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          difficulty: template.difficulty,
          reward: template.reward,
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar desafio');

      await fetchData(); // Recarrega os dados
    } catch (error) {
      console.error('Erro ao aceitar desafio:', error);
      throw error;
    }
  };

  const earnedBadges = achievements.map(a => a.badgeType);
  const allBadgeTypes = Object.keys(BADGE_DEFINITIONS);
  const totalBadges = allBadgeTypes.length;
  const earnedCount = earnedBadges.length;
  const completionRate = (earnedCount / totalBadges) * 100;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando conquistas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with stats */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Conquistas</h1>
          <p className="text-muted-foreground">
            Complete desafios, ganhe badges e suba no ranking!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-3">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos</p>
                <p className="text-2xl font-bold">{stats?.points || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nível</p>
                <p className="text-2xl font-bold">{stats?.level || 1}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Award className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badges</p>
                <p className="text-2xl font-bold">
                  {earnedCount}/{totalBadges}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sequência</p>
                <p className="text-2xl font-bold">{stats?.currentStreak || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress bar */}
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Progresso Geral</p>
              <p className="text-sm text-muted-foreground">
                {completionRate.toFixed(0)}% completo
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-primary/60"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="badges" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Desafios</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
        </TabsList>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Suas Conquistas</h2>
            <Badge variant="outline">
              {earnedCount} de {totalBadges}
            </Badge>
          </div>

          {/* Categorias de badges */}
          <div className="space-y-6">
            {[
              { title: 'Economia', types: ['FIRST_SAVINGS', 'SAVINGS_STREAK_7', 'SAVINGS_STREAK_30', 'SAVED_1K', 'SAVED_5K', 'SAVED_10K'] },
              { title: 'Disciplina', types: ['NO_SPEND_WEEK', 'NO_SPEND_MONTH', 'BUDGET_KEEPER', 'BILL_MASTER'] },
              { title: 'Progresso', types: ['FIRST_GOAL', 'GOAL_ACHIEVED', 'GOAL_STREAK_3', 'EMERGENCY_FUND_50', 'EMERGENCY_FUND_100'] },
              { title: 'Engajamento', types: ['EARLY_BIRD', 'CONSISTENT_USER', 'POWER_USER', 'CATEGORY_MASTER'] },
              { title: 'Especiais', types: ['DEBT_FREE', 'INVESTMENT_STARTER', 'YEAR_REVIEW'] },
            ].map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="text-lg font-medium">{category.title}</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {category.types.map((badgeType) => {
                    const earned = achievements.find(a => a.badgeType === badgeType);
                    return (
                      <BadgeCard
                        key={badgeType}
                        badgeType={badgeType}
                        earned={!!earned}
                        earnedAt={earned?.earnedAt}
                        size="md"
                        showDetails
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Desafios Ativos</h2>
            <Button size="sm" onClick={() => setBrowserOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Desafio
            </Button>
          </div>

          {challenges.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">Nenhum desafio ativo</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Crie seu primeiro desafio e comece a conquistar!
              </p>
              <Button className="mt-4" size="sm" onClick={() => setBrowserOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Desafio
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {challenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  onUpdate={(id, current) => {
                    console.log('Update challenge:', id, current);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Ranking Global</h2>
            <p className="text-sm text-muted-foreground">
              Veja como você se compara com outros usuários
            </p>
          </div>

          {leaderboard?.topUsers && (
            <Leaderboard
              entries={leaderboard.topUsers}
              currentUserRank={leaderboard.currentUserRank}
              type="points"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Challenge Browser Modal */}
      <ChallengeBrowser
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        userLevel={stats?.level || 1}
        activeChallengeIds={challenges.map(c => c.id)}
        onAcceptChallenge={handleAcceptChallenge}
      />
    </div>
  );
}
