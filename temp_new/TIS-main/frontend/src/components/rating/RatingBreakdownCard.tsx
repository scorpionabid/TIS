/**
 * PRD: Reytinq breakdown-ın hər müəllim profilində görünməsi
 *
 * Bu komponent 6 reytinq komponentini vizual olaraq göstərir:
 * - Akademik göstərici
 * - Dərs dinləmə
 * - Qiymətləndirmə (MİQ/Sertifikasiya/Diaqnostik)
 * - Sertifikatlar
 * - Olimpiada
 * - Təltiflər
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Eye,
  FileCheck,
  Award,
  Trophy,
  Medal,
  TrendingUp,
} from 'lucide-react';
import type { RatingResult, ComponentScores } from '@/types/teacherRating';

interface RatingBreakdownCardProps {
  rating: RatingResult;
  showYearlyBreakdown?: boolean;
  compact?: boolean;
}

const componentConfig = [
  {
    key: 'academic' as const,
    label: 'Akademik Göstərici',
    description: 'Sinif üzrə orta bal',
    icon: BookOpen,
    color: 'bg-blue-500',
  },
  {
    key: 'observation' as const,
    label: 'Dərs Dinləmə',
    description: 'Yekun bal',
    icon: Eye,
    color: 'bg-green-500',
  },
  {
    key: 'assessment' as const,
    label: 'Qiymətləndirmə',
    description: 'MİQ/Sertifikasiya/Diaqnostik',
    icon: FileCheck,
    color: 'bg-purple-500',
  },
  {
    key: 'certificate' as const,
    label: 'Sertifikatlar',
    description: 'Növə görə bal',
    icon: Award,
    color: 'bg-orange-500',
  },
  {
    key: 'olympiad' as const,
    label: 'Olimpiada',
    description: 'Şagird nailiyyətləri',
    icon: Trophy,
    color: 'bg-yellow-500',
  },
  {
    key: 'award' as const,
    label: 'Təltiflər',
    description: 'Medal, fəxri fərman',
    icon: Medal,
    color: 'bg-red-500',
  },
];

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get progress bar color based on score
 */
function getProgressColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 80) return 'bg-blue-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

export function RatingBreakdownCard({
  rating,
  showYearlyBreakdown = false,
  compact = false,
}: RatingBreakdownCardProps) {
  const scores: ComponentScores = {
    academic: rating.academic_score || 0,
    observation: rating.observation_score || 0,
    assessment: rating.assessment_score || 0,
    certificate: rating.certificate_score || 0,
    olympiad: rating.olympiad_score || 0,
    award: rating.award_score || 0,
  };

  return (
    <Card className={compact ? 'p-2' : ''}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center justify-between">
          <span>Reytinq Breakdown</span>
          <Badge
            variant="outline"
            className={`text-lg font-bold ${getScoreColor(rating.overall_score)}`}
          >
            {rating.overall_score?.toFixed(1) || '0.0'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Component scores */}
        <div className="grid gap-3">
          {componentConfig.map((component) => {
            const score = scores[component.key];
            const Icon = component.icon;

            return (
              <div key={component.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${component.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{component.label}</span>
                      {!compact && (
                        <p className="text-xs text-muted-foreground">
                          {component.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`font-semibold ${getScoreColor(score)}`}>
                    {score.toFixed(1)}
                  </span>
                </div>
                <Progress
                  value={score}
                  className="h-2"
                  // @ts-expect-error - custom indicator color
                  indicatorClassName={getProgressColor(score)}
                />
              </div>
            );
          })}
        </div>

        {/* Growth bonus */}
        {rating.growth_bonus > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-emerald-500">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium">İnkişaf Bonusu</span>
                  {!compact && (
                    <p className="text-xs text-muted-foreground">
                      Son illərdə yaxşılaşma
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-emerald-600 font-bold">
                +{rating.growth_bonus.toFixed(1)}
              </Badge>
            </div>
          </div>
        )}

        {/* Yearly breakdown */}
        {showYearlyBreakdown && rating.yearly_breakdown && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">İllər üzrə Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(rating.yearly_breakdown).map(([year, yearScores]) => (
                <div key={year} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{year}</span>
                    <Badge variant="outline">
                      {(
                        Object.values(yearScores as ComponentScores).reduce(
                          (a, b) => a + b,
                          0
                        ) / 6
                      ).toFixed(1)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {componentConfig.map((component) => {
                      const yearScore = (yearScores as ComponentScores)[component.key] || 0;
                      return (
                        <div
                          key={component.key}
                          className="text-center"
                          title={`${component.label}: ${yearScore.toFixed(1)}`}
                        >
                          <div
                            className={`h-1 rounded ${getProgressColor(yearScore)}`}
                            style={{ width: `${yearScore}%` }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {yearScore.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RatingBreakdownCard;
