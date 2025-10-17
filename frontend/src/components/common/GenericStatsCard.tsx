import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { StatItem } from './GenericStatsCard.helpers';

interface GenericStatsCardProps {
  stats: StatItem[];
  className?: string;
  gridCols?: 'grid-cols-5' | 'grid-cols-6' | 'grid-cols-4' | 'grid-cols-3' | 'grid-cols-2';
}

export const GenericStatsCard: React.FC<GenericStatsCardProps> = ({
  stats, 
  className = '',
  gridCols = 'grid-cols-5' 
}) => {
  return (
    <div className={`grid grid-cols-1 md:${gridCols} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.valueColor || ''}`}>
                  {stat.value}
                </p>
              </div>
              <stat.icon className={stat.bgColor || 'h-8 w-8 text-muted-foreground'} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
