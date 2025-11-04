"use client";

import { BADGE_DEFINITIONS, type BadgeDefinition } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface BadgeCardProps {
  badgeType: string;
  earned: boolean;
  earnedAt?: Date;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function BadgeCard({
  badgeType,
  earned,
  earnedAt,
  progress = 0,
  size = 'md',
  showDetails = true,
}: BadgeCardProps) {
  const badge = BADGE_DEFINITIONS[badgeType as keyof typeof BADGE_DEFINITIONS];

  if (!badge) return null;

  const sizeClasses = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-24 h-24 text-4xl',
    lg: 'w-32 h-32 text-5xl',
  };

  const containerSizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const getRarityGradient = (rarity: BadgeDefinition['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'from-gray-400 to-gray-600';
      case 'rare':
        return 'from-blue-400 to-blue-600';
      case 'epic':
        return 'from-purple-400 to-purple-600';
      case 'legendary':
        return 'from-amber-400 to-amber-600';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'relative rounded-xl border-2 transition-all',
        containerSizeClasses[size],
        earned
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border/50 bg-muted/30 opacity-60 grayscale'
      )}
    >
      {/* Badge icon */}
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full',
            sizeClasses[size],
            earned
              ? `bg-gradient-to-br ${getRarityGradient(badge.rarity)} shadow-md`
              : 'bg-muted'
          )}
        >
          <span className="filter-none">{badge.icon}</span>

          {earned && (
            <div className="absolute -right-1 -top-1 rounded-full bg-green-500 p-1 shadow-md">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {showDetails && (
          <div className="text-center">
            <h4 className="text-sm font-semibold">{badge.title}</h4>
            <p className="text-xs text-muted-foreground">{badge.description}</p>

            {earned && earnedAt && (
              <p className="mt-1 text-xs text-primary">
                {new Date(earnedAt).toLocaleDateString('pt-BR')}
              </p>
            )}

            {!earned && progress > 0 && progress < 100 && (
              <div className="mt-2 w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Rarity indicator */}
        <div className="flex items-center gap-1">
          {Array.from({ length: badge.rarity === 'common' ? 1 : badge.rarity === 'rare' ? 2 : badge.rarity === 'epic' ? 3 : 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 w-1 rounded-full',
                earned ? badge.color : 'bg-muted'
              )}
              style={earned ? { backgroundColor: badge.color } : {}}
            />
          ))}
        </div>

        {showDetails && (
          <div className="text-xs font-medium text-muted-foreground">
            +{badge.points} pts
          </div>
        )}
      </div>
    </motion.div>
  );
}
