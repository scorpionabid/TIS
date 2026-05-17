/**
 * ComponentScoreCard Component
 *
 * Individual component score display widget
 * Shows detailed breakdown of a single rating component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  BookOpen,
  Eye,
  Trophy,
  ClipboardCheck,
  Award,
  Medal,
  TrendingUp,
  Info,
} from 'lucide-react';
import type { ComponentScore } from '../../types/teacherRating';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface ComponentScoreCardProps {
  component: 'academic' | 'lesson_observation' | 'olympiad' | 'assessment' | 'certificate' | 'award';
  score: ComponentScore;
  maxWeight: number;
  variant?: 'default' | 'compact';
}

export function ComponentScoreCard({
  component,
  score,
  maxWeight,
  variant = 'default',
}: ComponentScoreCardProps) {
  const componentConfig = {
    academic: {
      label: 'Akademik Nəticələr',
      icon: BookOpen,
      color: 'blue',
      description: 'Tələbələrin akademik uğurları və orta qiymətlər',
    },
    lesson_observation: {
      label: 'Dərs Müşahidəsi',
      icon: Eye,
      color: 'green',
      description: 'Dərs müşahidə protokollarından alınan qiymətlər',
    },
    olympiad: {
      label: 'Olimpiada Nəticələri',
      icon: Trophy,
      color: 'amber',
      description: 'Tələbələrin olimpiada və müsabiqə nəticələri',
    },
    assessment: {
      label: 'Qiymətləndirmə',
      icon: ClipboardCheck,
      color: 'purple',
      description: 'Müdiriyyət və həmkar qiymətləndirmələri',
    },
    certificate: {
      label: 'Sertifikatlar',
      icon: Award,
      color: 'pink',
      description: 'Professional inkişaf və təlim sertifikatları',
    },
    award: {
      label: 'Mükafatlar',
      icon: Medal,
      color: 'red',
      description: 'Dövlət və təşkilat mükafatları',
    },
  };

  const config = componentConfig[component];
  const Icon = config.icon;

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      progress: 'bg-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: 'text-green-600',
      progress: 'bg-green-600',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      progress: 'bg-amber-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      progress: 'bg-purple-600',
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-700',
      icon: 'text-pink-600',
      progress: 'bg-pink-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600',
      progress: 'bg-red-600',
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];
  const percentage = (score.weighted_score / maxWeight) * 100;

  if (variant === 'compact') {
    return (
      <div className={cn('p-3 rounded-lg border', colors.bg, colors.border)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', colors.icon)} />
            <span className={cn('text-sm font-medium', colors.text)}>{config.label}</span>
          </div>
          <span className={cn('text-lg font-bold', colors.text)}>
            {score.weighted_score.toFixed(1)}
          </span>
        </div>
        <Progress value={percentage} className={cn('h-1.5', colors.progress)} />
      </div>
    );
  }

  return (
    <Card className={cn('border-2', colors.border)}>
      <CardHeader className={cn('pb-3', colors.bg)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', colors.icon)} />
            <span className={cn('text-base', colors.text)}>{config.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="outline" className={cn(colors.border, colors.text)}>
            Max: {maxWeight}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Çəkilmiş Bal</div>
            <div className={cn('text-3xl font-bold', colors.text)}>
              {score.weighted_score.toFixed(2)}
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-muted-foreground">Ham Bal</div>
            <div className="text-xl font-semibold text-muted-foreground">
              {score.raw_score.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tamamlanma</span>
            <span className={cn('font-medium', colors.text)}>{percentage.toFixed(1)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {score.year_weight !== undefined && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">İl Çəkisi</div>
              <div className="text-sm font-medium">{(score.year_weight * 100).toFixed(0)}%</div>
            </div>
          )}

          {score.growth_bonus !== undefined && score.growth_bonus !== 0 && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Artım Bonusu</div>
              <div className="flex items-center gap-1">
                <TrendingUp className={cn('h-3 w-3', score.growth_bonus > 0 ? 'text-green-600' : 'text-red-600')} />
                <span className={cn(
                  'text-sm font-medium',
                  score.growth_bonus > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {score.growth_bonus > 0 ? '+' : ''}{score.growth_bonus.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Details from ComponentDetails */}
        {score.details && Object.keys(score.details).length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">Detallar</div>
            <div className="space-y-1 text-xs">
              {Object.entries(score.details).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
