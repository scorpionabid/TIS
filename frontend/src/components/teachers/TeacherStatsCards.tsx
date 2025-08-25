import React from 'react';
import { GraduationCap, CheckCircle, Settings, Star, AlertTriangle } from 'lucide-react';
import { GenericStatsCard, createStatItem } from '@/components/common/GenericStatsCard';
import type { TeacherStats } from './hooks/useSchoolTeacherManager';

interface TeacherStatsCardsProps {
  teacherStats: TeacherStats;
}

// Extended stats interface to match the component's requirements
interface ExtendedTeacherStats extends TeacherStats {
  outstanding?: number;
  overloaded?: number;
}

export const TeacherStatsCardsNew: React.FC<TeacherStatsCardsProps> = ({ teacherStats }) => {
  // Cast to extended interface for backward compatibility
  const extendedStats = teacherStats as ExtendedTeacherStats;

  const stats = [
    createStatItem('Ümumi', extendedStats.total, GraduationCap, 'default'),
    createStatItem('Aktiv', extendedStats.active, CheckCircle, 'green'),
    createStatItem('Passiv', extendedStats.inactive, Settings, 'gray'),
    createStatItem('Əla performans', extendedStats.outstanding || 0, Star, 'yellow'),
    createStatItem('Artıq yüklənmiş', extendedStats.overloaded || 0, AlertTriangle, 'red')
  ];

  return <GenericStatsCard stats={stats} gridCols="grid-cols-5" />;
};

// Re-export for backward compatibility
export const TeacherStatsCards = TeacherStatsCardsNew;