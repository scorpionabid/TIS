/**
 * LeaderboardTable Component
 *
 * Enhanced table for displaying top 20 teachers with medal visuals
 * Used in leaderboard page with ranking highlights
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Trophy, Medal, Award, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RatingResult } from '../../types/teacherRating';
import { cn } from '../../lib/utils';

interface LeaderboardTableProps {
  data: RatingResult[];
  scope: 'school' | 'district' | 'region' | 'subject';
  onViewProfile?: (teacherId: number) => void;
  showTrend?: boolean;
}

export function LeaderboardTable({
  data,
  scope,
  onViewProfile,
  showTrend = false,
}: LeaderboardTableProps) {
  const getRankDisplay = (rank: number): React.ReactNode => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-600">1</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-2">
            <Medal className="h-6 w-6 text-gray-400" />
            <span className="text-xl font-bold text-gray-600">2</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-orange-600" />
            <span className="text-xl font-bold text-orange-600">3</span>
          </div>
        );
      default:
        return <span className="text-lg font-semibold text-muted-foreground">{rank}</span>;
    }
  };

  const getRowClassName = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500';
      case 2:
        return 'bg-gray-50 hover:bg-gray-100 border-l-4 border-gray-400';
      case 3:
        return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-500';
      default:
        return rank <= 10
          ? 'bg-blue-50/30 hover:bg-blue-50'
          : 'hover:bg-muted/50';
    }
  };

  const getScoreDisplay = (score: number, rank: number): React.ReactNode => {
    const scoreClass = cn(
      'text-lg font-bold',
      rank === 1 && 'text-yellow-600',
      rank === 2 && 'text-gray-600',
      rank === 3 && 'text-orange-600',
      rank > 3 && score >= 90 && 'text-green-600',
      rank > 3 && score >= 80 && 'text-blue-600',
      rank > 3 && score >= 70 && 'text-yellow-600',
      rank > 3 && score < 70 && 'text-red-600'
    );

    return (
      <div className="flex flex-col items-center">
        <span className={scoreClass}>{score.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    );
  };

  const getTrendIcon = (trend: number | undefined): React.ReactNode => {
    if (!showTrend || trend === undefined) return null;

    if (trend > 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{trend.toFixed(1)}
        </Badge>
      );
    }

    if (trend < 0) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          {trend.toFixed(1)}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        <Minus className="h-3 w-3 mr-1" />
        0.0
      </Badge>
    );
  };

  const getRankKey = (): keyof RatingResult => {
    switch (scope) {
      case 'school':
        return 'rank_school';
      case 'district':
        return 'rank_district';
      case 'region':
        return 'rank_region';
      case 'subject':
        return 'rank_subject';
    }
  };

  const getScopeLabel = (): string => {
    switch (scope) {
      case 'school':
        return 'Məktəb';
      case 'district':
        return 'Rayon';
      case 'region':
        return 'Region';
      case 'subject':
        return 'Fənn';
    }
  };

  const rankKey = getRankKey();
  const sortedData = [...data].sort((a, b) => {
    const rankA = a[rankKey] ?? 9999;
    const rankB = b[rankKey] ?? 9999;
    return rankA - rankB;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">{getScopeLabel()} Liderlər Siyahısı</h3>
        </div>
        <Badge variant="outline">{sortedData.length} müəllim</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20 text-center">Sıra</TableHead>
              <TableHead className="w-16"></TableHead>
              <TableHead>Müəllim</TableHead>
              <TableHead>UTIS Kod</TableHead>
              <TableHead>Məktəb</TableHead>
              <TableHead>Fənn</TableHead>
              <TableHead className="text-center">Bal</TableHead>
              {showTrend && <TableHead className="text-center">Trend</TableHead>}
              <TableHead className="w-32 text-center">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showTrend ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  Nəticə tapılmadı
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((result) => {
                const rank = result[rankKey] ?? 0;
                return (
                  <TableRow key={result.id} className={getRowClassName(rank)}>
                    {/* Rank */}
                    <TableCell className="text-center">
                      {getRankDisplay(rank)}
                    </TableCell>

                    {/* Photo */}
                    <TableCell>
                      <Avatar className={cn(
                        'h-10 w-10',
                        rank === 1 && 'ring-2 ring-yellow-500',
                        rank === 2 && 'ring-2 ring-gray-400',
                        rank === 3 && 'ring-2 ring-orange-500'
                      )}>
                        <AvatarImage src={result.teacher.photo_path || undefined} alt={result.teacher.name} />
                        <AvatarFallback className={cn(
                          rank === 1 && 'bg-yellow-100 text-yellow-700',
                          rank === 2 && 'bg-gray-100 text-gray-700',
                          rank === 3 && 'bg-orange-100 text-orange-700'
                        )}>
                          {result.teacher.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div className="font-medium">{result.teacher.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.teacher.years_of_experience
                          ? `${result.teacher.years_of_experience} il təcrübə`
                          : 'Təcrübə məlumatı yoxdur'}
                      </div>
                    </TableCell>

                    {/* UTIS Code */}
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {result.teacher.utis_code}
                      </code>
                    </TableCell>

                    {/* School */}
                    <TableCell className="text-sm">{result.teacher.school.name}</TableCell>

                    {/* Subject */}
                    <TableCell className="text-sm">
                      {result.teacher.primary_subject?.name || (
                        <span className="text-muted-foreground italic">Fənn təyin edilməyib</span>
                      )}
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-center">
                      {getScoreDisplay(result.total_score, rank)}
                    </TableCell>

                    {/* Trend */}
                    {showTrend && (
                      <TableCell className="text-center">
                        {getTrendIcon(result.breakdown.academic.growth_bonus)}
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewProfile?.(result.teacher_id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Profil
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground px-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border-l-4 border-yellow-500 rounded" />
          <span>1-ci yer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border-l-4 border-gray-400 rounded" />
          <span>2-ci yer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 border-l-4 border-orange-500 rounded" />
          <span>3-cü yer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border rounded" />
          <span>Top 10</span>
        </div>
      </div>
    </div>
  );
}
