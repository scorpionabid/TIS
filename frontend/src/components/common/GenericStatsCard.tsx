import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
    <div
      className={cn("grid grid-cols-1 gap-4 sm:gap-5", `md:${gridCols}`, className)}
    >
      {stats.map((stat, index) => (
        <Card key={index} align="center">
          <CardContent className="flex flex-col items-center gap-4 py-5">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground",
                stat.bgColor
              )}
            >
              <stat.icon
                className={cn(
                  "h-6 w-6 text-muted-foreground",
                  stat.iconColor
                )}
              />
            </span>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/90">
                {stat.title}
              </p>
              <p
                className={`text-2xl font-semibold text-foreground sm:text-3xl ${
                  stat.valueColor || ""
                }`}
              >
                {stat.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
