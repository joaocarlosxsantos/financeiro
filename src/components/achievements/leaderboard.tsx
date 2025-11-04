"use client";

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Award, Crown, TrendingUp, Target } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  image?: string | null;
  points: number;
  level: number;
  currentStreak: number;
  totalAchievements: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank?: LeaderboardEntry | null;
  type?: 'points' | 'level' | 'streak';
}

export function Leaderboard({ entries, currentUserRank, type = 'points' }: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/30';
      default:
        return '';
    }
  };

  const getDisplayValue = (entry: LeaderboardEntry) => {
    switch (type) {
      case 'level':
        return `Nível ${entry.level}`;
      case 'streak':
        return `${entry.currentStreak} dias`;
      default:
        return `${entry.points} pts`;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'level':
        return <TrendingUp className="h-4 w-4" />;
      case 'streak':
        return <Target className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 2º lugar */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <Avatar className="h-16 w-16 border-4 border-gray-400">
                <AvatarImage src={entries[1].image || ''} />
                <AvatarFallback className="bg-gray-400 text-white">
                  {entries[1].name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gray-400 px-2 py-0.5">
                <span className="text-xs font-bold text-white">2º</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-center line-clamp-1">
              {entries[1].name}
            </p>
            <p className="text-xs text-muted-foreground">
              {getDisplayValue(entries[1])}
            </p>
          </div>

          {/* 1º lugar */}
          <div className="flex flex-col items-center">
            <Crown className="h-6 w-6 text-amber-500 mb-1 animate-pulse" />
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-amber-500 shadow-lg">
                <AvatarImage src={entries[0].image || ''} />
                <AvatarFallback className="bg-amber-500 text-white text-lg">
                  {entries[0].name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 shadow-md">
                <span className="text-xs font-bold text-white">1º</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold text-center line-clamp-1">
              {entries[0].name}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {getDisplayValue(entries[0])}
            </p>
          </div>

          {/* 3º lugar */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <Avatar className="h-16 w-16 border-4 border-amber-700">
                <AvatarImage src={entries[2].image || ''} />
                <AvatarFallback className="bg-amber-700 text-white">
                  {entries[2].name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-700 px-2 py-0.5">
                <span className="text-xs font-bold text-white">3º</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-center line-clamp-1">
              {entries[2].name}
            </p>
            <p className="text-xs text-muted-foreground">
              {getDisplayValue(entries[2])}
            </p>
          </div>
        </div>
      )}

      {/* Lista completa */}
      <Card className="divide-y">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-4 p-4 transition-colors hover:bg-muted/50',
              entry.isCurrentUser && 'bg-primary/5',
              entry.rank <= 3 && getRankBgColor(entry.rank)
            )}
          >
            {/* Rank */}
            <div className="flex w-10 items-center justify-center">
              {getRankIcon(entry.rank) || (
                <span className="text-lg font-bold text-muted-foreground">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.image || ''} />
              <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {entry.name}
                {entry.isCurrentUser && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Você
                  </Badge>
                )}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  {entry.totalAchievements} conquistas
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Nível {entry.level}
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 text-right">
              {getTypeIcon()}
              <div>
                <p className="font-bold">{getDisplayValue(entry)}</p>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Current user position (se não estiver no top) */}
      {currentUserRank && !entries.find(e => e.isCurrentUser) && (
        <Card className="p-4 border-primary">
          <div className="flex items-center gap-4">
            <div className="flex w-10 items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {currentUserRank.rank}
              </span>
            </div>

            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={currentUserRank.image || ''} />
              <AvatarFallback>{currentUserRank.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-medium">
                Sua Posição
                <Badge variant="outline" className="ml-2 text-xs">
                  Você
                </Badge>
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{currentUserRank.totalAchievements} conquistas</span>
                <span>Nível {currentUserRank.level}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getTypeIcon()}
              <p className="font-bold text-primary">
                {getDisplayValue(currentUserRank)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
