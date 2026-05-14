/**
 * TeacherRatingCard Component
 *
 * Card view alternative to table display
 * Shows teacher rating with visual elements and quick actions
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import {
  School,
  BookOpen,
  Calendar,
  Award,
  Eye,
  Calculator,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { RatingResult } from '../../types/teacherRating';
import { cn } from '../../lib/utils';

interface TeacherRatingCardProps {
  data: RatingResult;
  onViewProfile?: (teacherId: number) => void;
  onCalculate?: (teacherId: number) => void;
  showActions?: boolean;
  canCalculate?: boolean;
  compact?: boolean;
}

export function TeacherRatingCard({
  data,
  onViewProfile,
  onCalculate,
  showActions = true,
  canCalculate = false,
  compact = false,
}: TeacherRatingCardProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 80) return 'bg-blue-50 border-blue-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    if (score >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getRankBadge = (rank: number | null, type: 'school' | 'district' | 'region' | 'subject'): React.ReactNode => {
    if (!rank) return null;

    const typeLabels = {
      school: 'Məktəb',
      district: 'Rayon',
      region: 'Region',
      subject: 'Fənn',
    };

    const badgeClass = cn(
      rank === 1 && 'bg-yellow-100 text-yellow-800 border-yellow-300',
      rank === 2 && 'bg-gray-100 text-gray-800 border-gray-300',
      rank === 3 && 'bg-orange-100 text-orange-800 border-orange-300',
      rank > 3 && 'bg-blue-50 text-blue-700 border-blue-200'
    );

    return (
      <Badge variant="outline" className={badgeClass}>
        {rank === 1 && '🥇 '}
        {rank === 2 && '🥈 '}
        {rank === 3 && '🥉 '}
        {typeLabels[type]}: {rank}
      </Badge>
    );
  };

  const getComponentProgress = (component: keyof typeof data.breakdown) => {
    const score = data.breakdown[component].weighted_score;
    const maxWeights = {
      academic: 30,
      lesson_observation: 20,
      olympiad: 15,
      assessment: 15,
      certificate: 10,
      award: 10,
    };
    const percentage = (score / maxWeights[component]) * 100;
    return { score, percentage: Math.min(percentage, 100) };
  };

  const getGrowthIndicator = (): React.ReactNode => {
    const growthBonus = data.breakdown.academic.growth_bonus;
    if (!growthBonus || growthBonus === 0) return null;

    return growthBonus > 0 ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <TrendingUp className="h-3 w-3 mr-1" />
        Artım: +{growthBonus.toFixed(1)}
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <TrendingDown className="h-3 w-3 mr-1" />
        Azalma: {growthBonus.toFixed(1)}
      </Badge>
    );
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', compact && 'max-w-sm')}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={data.teacher.photo_path || undefined} alt={data.teacher.name} />
            <AvatarFallback className="text-lg">
              {data.teacher.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          {/* Teacher Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{data.teacher.name}</h3>
            <code className="text-xs bg-muted px-2 py-1 rounded">{data.teacher.utis_code}</code>
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <School className="h-3 w-3" />
              <span className="truncate">{data.teacher.school.name}</span>
            </div>
          </div>

          {/* Score Badge */}
          <div className={cn('px-4 py-2 rounded-lg border-2', getScoreBgColor(data.total_score))}>
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(data.total_score))}>
                {data.total_score.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Ümumi Bal</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subject & Experience */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {data.teacher.primary_subject?.name || (
                <span className="text-muted-foreground italic">Fənn yoxdur</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {data.teacher.years_of_experience
                ? `${data.teacher.years_of_experience} il`
                : <span className="text-muted-foreground italic">Məlumat yoxdur</span>}
            </span>
          </div>
        </div>

        {/* Rankings */}
        {!compact && (
          <div className="flex flex-wrap gap-2">
            {getRankBadge(data.rank_school, 'school')}
            {getRankBadge(data.rank_district, 'district')}
            {getRankBadge(data.rank_region, 'region')}
            {getRankBadge(data.rank_subject, 'subject')}
            {getGrowthIndicator()}
          </div>
        )}

        {/* Component Scores - Compact View */}
        {!compact && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Komponentlər</span>
              <Award className="h-3 w-3" />
            </div>

            {Object.entries(data.breakdown).map(([key, value]) => {
              const { score, percentage } = getComponentProgress(key as keyof typeof data.breakdown);
              const labels = {
                academic: 'Akademik',
                lesson_observation: 'Dərs Müşahidə',
                olympiad: 'Olimpiada',
                assessment: 'Qiymətləndirmə',
                certificate: 'Sertifikat',
                award: 'Mükafat',
              };

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{labels[key as keyof typeof labels]}</span>
                    <span className="font-medium">{score.toFixed(1)}</span>
                  </div>
                  <Progress value={percentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}

        {/* Academic Year */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Tədris ili: {data.academic_year.name}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewProfile?.(data.teacher_id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Profil
          </Button>

          {canCalculate && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onCalculate?.(data.teacher_id)}
            >
              <Calculator className="h-4 w-4 mr-1" />
              Hesabla
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
