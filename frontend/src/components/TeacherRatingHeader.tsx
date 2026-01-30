/**
 * TeacherRatingHeader Component
 *
 * Profile header component with photo and key statistics
 * Used in teacher rating profile page
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  School,
  BookOpen,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Award,
  TrendingUp,
  Edit,
  Download,
} from 'lucide-react';
import type { TeacherRatingProfile, RatingResult } from '../../types/teacherRating';
import { cn } from '../../lib/utils';

interface TeacherRatingHeaderProps {
  teacher: TeacherRatingProfile;
  latestRating?: RatingResult | null;
  onEdit?: () => void;
  onExport?: () => void;
  canEdit?: boolean;
  canExport?: boolean;
}

export function TeacherRatingHeader({
  teacher,
  latestRating,
  onEdit,
  onExport,
  canEdit = false,
  canExport = false,
}: TeacherRatingHeaderProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRankBadge = (rank: number | null | undefined, label: string) => {
    if (!rank) return null;

    const getBadgeClass = (r: number) => {
      if (r === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      if (r === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
      if (r === 3) return 'bg-orange-100 text-orange-800 border-orange-300';
      if (r <= 10) return 'bg-blue-50 text-blue-700 border-blue-200';
      return 'bg-muted text-muted-foreground border-muted';
    };

    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="outline" className={cn('text-xs', getBadgeClass(rank))}>
          {rank === 1 && '🥇 '}
          {rank === 2 && '🥈 '}
          {rank === 3 && '🥉 '}
          #{rank}
        </Badge>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      {/* Background Pattern */}
      <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        <div className="absolute inset-0 bg-grid-white/10" />
      </div>

      <CardContent className="pt-0 pb-6">
        <div className="flex flex-col md:flex-row gap-6 -mt-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
              <AvatarImage src={teacher.photo_path || undefined} alt={teacher.name} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {teacher.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Status Badge */}
            <Badge
              variant={teacher.is_active ? 'default' : 'secondary'}
              className={teacher.is_active ? 'bg-green-600' : ''}
            >
              {teacher.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
            </Badge>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4">
            {/* Name & UTIS */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{teacher.name}</h1>
                  <code className="text-sm bg-muted px-2 py-1 rounded mt-1 inline-block">
                    UTIS: {teacher.utis_code}
                  </code>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-1" />
                      Redaktə
                    </Button>
                  )}
                  {canExport && (
                    <Button variant="outline" size="sm" onClick={onExport}>
                      <Download className="h-4 w-4 mr-1" />
                      İxrac
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-muted-foreground" />
                <span className="truncate" title={teacher.school.name}>
                  {teacher.school.name}
                </span>
              </div>

              {teacher.primary_subject && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.primary_subject.name}</span>
                </div>
              )}

              {teacher.years_of_experience && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.years_of_experience} il təcrübə</span>
                </div>
              )}

              {teacher.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${teacher.email}`} className="hover:underline truncate">
                    {teacher.email}
                  </a>
                </div>
              )}

              {teacher.age_band && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>Yaş qrupu: {teacher.age_band}</span>
                </div>
              )}

              {teacher.start_year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Başlama ili: {teacher.start_year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating Score Section */}
          {latestRating && (
            <div className="flex flex-col items-center gap-3 md:border-l md:pl-6">
              <div
                className={cn(
                  'px-6 py-4 rounded-xl border-2 text-center min-w-[140px]',
                  getScoreColor(latestRating.total_score)
                )}
              >
                <div className="text-4xl font-bold">{latestRating.total_score.toFixed(1)}</div>
                <div className="text-xs font-medium mt-1">Ümumi Reytinq</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {latestRating.academic_year.name}
                </div>
              </div>

              {/* Rankings */}
              <div className="grid grid-cols-2 gap-3">
                {getRankBadge(latestRating.rank_school, 'Məktəb')}
                {getRankBadge(latestRating.rank_district, 'Rayon')}
                {getRankBadge(latestRating.rank_region, 'Region')}
                {getRankBadge(latestRating.rank_subject, 'Fənn')}
              </div>

              {/* Growth Indicator */}
              {latestRating.breakdown.academic.growth_bonus !== undefined &&
                latestRating.breakdown.academic.growth_bonus !== 0 && (
                  <Badge
                    variant="outline"
                    className={
                      latestRating.breakdown.academic.growth_bonus > 0
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {latestRating.breakdown.academic.growth_bonus > 0 ? '+' : ''}
                    {latestRating.breakdown.academic.growth_bonus.toFixed(1)} Artım
                  </Badge>
                )}
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        {latestRating && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              {Object.entries(latestRating.breakdown).map(([key, value]) => {
                const labels: Record<string, string> = {
                  academic: 'Akademik',
                  lesson_observation: 'Dərs Müş.',
                  olympiad: 'Olimpiada',
                  assessment: 'Qiymət.',
                  certificate: 'Sertifikat',
                  award: 'Mükafat',
                };

                return (
                  <div key={key} className="space-y-1">
                    <div className="text-xs text-muted-foreground">{labels[key]}</div>
                    <div className="text-lg font-bold text-blue-600">
                      {value.weighted_score.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
