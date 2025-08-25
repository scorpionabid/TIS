import React from 'react';
import { School, CheckCircle, Settings, AlertTriangle, User } from 'lucide-react';
import { GenericStatsCard, createStatItem } from '@/components/common/GenericStatsCard';
import type { ClassStats } from './hooks/useSchoolClassManager';

interface ClassStatsCardsProps {
  classStats: ClassStats;
}

export const ClassStatsCardsNew: React.FC<ClassStatsCardsProps> = ({ classStats }) => {
  const stats = [
    createStatItem('Ümumi', classStats.total, School, 'default'),
    createStatItem('Aktiv', classStats.active, CheckCircle, 'green'),
    createStatItem('Passiv', classStats.inactive, Settings, 'gray'),
    createStatItem('Tutumu dolub', classStats.overcrowded, AlertTriangle, 'red'),
    createStatItem('Rəhbərsiz', classStats.needs_teacher, User, 'orange')
  ];

  return <GenericStatsCard stats={stats} gridCols="grid-cols-5" />;
};

// Re-export for backward compatibility
export const ClassStatsCards = ClassStatsCardsNew;