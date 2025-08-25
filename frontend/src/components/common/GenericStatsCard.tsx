import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  valueColor?: string;
}

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

// Utility function to create stat items with consistent styling
export const createStatItem = (
  title: string,
  value: number,
  icon: LucideIcon,
  colorTheme?: 'default' | 'green' | 'gray' | 'orange' | 'blue' | 'purple' | 'yellow' | 'red'
): StatItem => {
  const colorMap = {
    default: { iconColor: 'text-muted-foreground', bgColor: 'h-8 w-8 text-muted-foreground' },
    green: { iconColor: 'text-green-600', bgColor: 'h-8 w-8 text-green-600', valueColor: 'text-green-600' },
    gray: { iconColor: 'text-gray-600', bgColor: 'h-8 w-8 text-gray-600', valueColor: 'text-gray-600' },
    orange: { iconColor: 'text-orange-600', bgColor: 'h-8 w-8 text-orange-600', valueColor: 'text-orange-600' },
    blue: { iconColor: 'text-blue-600', bgColor: 'h-8 w-8 text-blue-600', valueColor: 'text-blue-600' },
    purple: { iconColor: 'text-purple-600', bgColor: 'h-8 w-8 text-purple-600', valueColor: 'text-purple-600' },
    yellow: { iconColor: 'text-yellow-600', bgColor: 'h-8 w-8 text-yellow-600', valueColor: 'text-yellow-600' },
    red: { iconColor: 'text-red-600', bgColor: 'h-8 w-8 text-red-600', valueColor: 'text-red-600' }
  };

  const colors = colorMap[colorTheme || 'default'];

  return {
    title,
    value,
    icon,
    ...colors
  };
};