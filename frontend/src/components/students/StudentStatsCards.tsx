import React from 'react';
import { Users, CheckCircle, Settings, UserMinus, GraduationCap, UserPlus } from 'lucide-react';
import { GenericStatsCard, createStatItem } from '@/components/common/GenericStatsCard';
import type { StudentStats } from './hooks/useSchoolStudentManagerGeneric';

interface StudentStatsCardsProps {
  studentStats: StudentStats;
}

// Extended stats interface to match the component's requirements
interface ExtendedStudentStats extends StudentStats {
  transferred?: number;
  graduated?: number;
  new_enrollments?: number;
}

export const StudentStatsCardsNew: React.FC<StudentStatsCardsProps> = ({ studentStats }) => {
  // Cast to extended interface for backward compatibility
  const extendedStats = studentStats as ExtendedStudentStats;

  const stats = [
    createStatItem('Ümumi', extendedStats.total, Users, 'default'),
    createStatItem('Aktiv', extendedStats.active, CheckCircle, 'green'),
    createStatItem('Passiv', extendedStats.inactive, Settings, 'gray'),
    createStatItem('Köçürülmüş', extendedStats.transferred || 0, UserMinus, 'orange'),
    createStatItem('Məzun', extendedStats.graduated || 0, GraduationCap, 'blue'),
    createStatItem('Yeni qeydiyyat', extendedStats.new_enrollments || 0, UserPlus, 'purple')
  ];

  return <GenericStatsCard stats={stats} gridCols="grid-cols-6" />;
};

// Re-export for backward compatibility
export const StudentStatsCards = StudentStatsCardsNew;