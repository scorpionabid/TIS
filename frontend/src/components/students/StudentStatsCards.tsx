import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, Settings, UserMinus, GraduationCap, UserPlus } from 'lucide-react';
import type { StudentStats } from './hooks/useSchoolStudentManager';

interface StudentStatsCardsProps {
  studentStats: StudentStats;
}

export const StudentStatsCards: React.FC<StudentStatsCardsProps> = ({ studentStats }) => {
  const statsData = [
    {
      title: 'Ümumi',
      value: studentStats.total,
      icon: Users,
      iconColor: 'text-muted-foreground',
      bgColor: 'h-8 w-8 text-muted-foreground'
    },
    {
      title: 'Aktiv',
      value: studentStats.active,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'h-8 w-8 text-green-600',
      valueColor: 'text-green-600'
    },
    {
      title: 'Passiv',
      value: studentStats.inactive,
      icon: Settings,
      iconColor: 'text-gray-600',
      bgColor: 'h-8 w-8 text-gray-600',
      valueColor: 'text-gray-600'
    },
    {
      title: 'Köçürülmüş',
      value: studentStats.transferred,
      icon: UserMinus,
      iconColor: 'text-orange-600',
      bgColor: 'h-8 w-8 text-orange-600',
      valueColor: 'text-orange-600'
    },
    {
      title: 'Məzun',
      value: studentStats.graduated,
      icon: GraduationCap,
      iconColor: 'text-blue-600',
      bgColor: 'h-8 w-8 text-blue-600',
      valueColor: 'text-blue-600'
    },
    {
      title: 'Yeni qeydiyyat',
      value: studentStats.new_enrollments,
      icon: UserPlus,
      iconColor: 'text-purple-600',
      bgColor: 'h-8 w-8 text-purple-600',
      valueColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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