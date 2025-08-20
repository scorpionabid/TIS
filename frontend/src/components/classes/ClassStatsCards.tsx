import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { School, CheckCircle, Settings, AlertTriangle, User } from 'lucide-react';
import type { ClassStats } from './hooks/useSchoolClassManager';

interface ClassStatsCardsProps {
  classStats: ClassStats;
}

export const ClassStatsCards: React.FC<ClassStatsCardsProps> = ({ classStats }) => {
  const statsData = [
    {
      title: 'Ümumi',
      value: classStats.total,
      icon: School,
      iconColor: 'text-muted-foreground',
      bgColor: 'h-8 w-8 text-muted-foreground'
    },
    {
      title: 'Aktiv',
      value: classStats.active,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'h-8 w-8 text-green-600',
      valueColor: 'text-green-600'
    },
    {
      title: 'Passiv',
      value: classStats.inactive,
      icon: Settings,
      iconColor: 'text-gray-600',
      bgColor: 'h-8 w-8 text-gray-600',
      valueColor: 'text-gray-600'
    },
    {
      title: 'Tutumu dolub',
      value: classStats.overcrowded,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'h-8 w-8 text-red-600',
      valueColor: 'text-red-600'
    },
    {
      title: 'Rəhbərsiz',
      value: classStats.needs_teacher,
      icon: User,
      iconColor: 'text-orange-600',
      bgColor: 'h-8 w-8 text-orange-600',
      valueColor: 'text-orange-600'
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