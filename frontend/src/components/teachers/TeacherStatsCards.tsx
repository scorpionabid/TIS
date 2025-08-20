import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, CheckCircle, Settings, Star, AlertTriangle } from 'lucide-react';
import type { TeacherStats } from './hooks/useSchoolTeacherManager';

interface TeacherStatsCardsProps {
  teacherStats: TeacherStats;
}

export const TeacherStatsCards: React.FC<TeacherStatsCardsProps> = ({ teacherStats }) => {
  const statsData = [
    {
      title: 'Ümumi',
      value: teacherStats.total,
      icon: GraduationCap,
      iconColor: 'text-muted-foreground',
      bgColor: 'h-8 w-8 text-muted-foreground'
    },
    {
      title: 'Aktiv',
      value: teacherStats.active,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'h-8 w-8 text-green-600',
      valueColor: 'text-green-600'
    },
    {
      title: 'Passiv',
      value: teacherStats.inactive,
      icon: Settings,
      iconColor: 'text-gray-600',
      bgColor: 'h-8 w-8 text-gray-600',
      valueColor: 'text-gray-600'
    },
    {
      title: 'Əla performans',
      value: teacherStats.outstanding,
      icon: Star,
      iconColor: 'text-yellow-600',
      bgColor: 'h-8 w-8 text-yellow-600',
      valueColor: 'text-yellow-600'
    },
    {
      title: 'Artıq yüklənmiş',
      value: teacherStats.overloaded,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'h-8 w-8 text-red-600',
      valueColor: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.valueColor || ''}`}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className={stat.bgColor} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};