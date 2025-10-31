import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatsConfig } from './types';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GenericStatsCardsProps {
  stats: StatsConfig[];
  className?: string;
}

export function GenericStatsCards({ stats, className }: GenericStatsCardsProps) {
  if (!stats.length) return null;

  const getColorClasses = (color: StatsConfig['color']) => {
    switch (color) {
      case 'green':
        return {
          icon: 'text-green-600',
          background: 'bg-green-50',
          border: 'border-green-200',
        };
      case 'red':
        return {
          icon: 'text-red-600',
          background: 'bg-red-50',
          border: 'border-red-200',
        };
      case 'blue':
        return {
          icon: 'text-blue-600',
          background: 'bg-blue-50',
          border: 'border-blue-200',
        };
      case 'yellow':
        return {
          icon: 'text-yellow-600',
          background: 'bg-yellow-50',
          border: 'border-yellow-200',
        };
      case 'purple':
        return {
          icon: 'text-purple-600',
          background: 'bg-purple-50',
          border: 'border-purple-200',
        };
      default:
        return {
          icon: 'text-primary',
          background: 'bg-primary/5',
          border: 'border-primary/20',
        };
    }
  };

  // Determine grid columns based on stats count
  const getGridCols = () => {
    if (stats.length === 1) return 'grid-cols-1';
    if (stats.length === 2) return 'grid-cols-1 md:grid-cols-2';
    if (stats.length === 3) return 'grid-cols-1 md:grid-cols-3';
    if (stats.length === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (stats.length === 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-5",
        getGridCols(),
        className
      )}
    >
      {stats.map((stat) => {
        const colors = getColorClasses(stat.color);
        const Icon = stat.icon;

        return (
          <Card
            key={stat.key}
            align="center"
            className={cn(
              "backdrop-blur-sm",
              colors.border
            )}
          >
            <CardContent className="flex flex-col items-center gap-4 py-5">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg",
                  colors.background
                )}
              >
                <Icon className={cn("h-6 w-6", colors.icon)} />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground/90">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-foreground sm:text-3xl">
                  {stat.value.toLocaleString()}
                </p>
              </div>

              {stat.trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    stat.trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {stat.trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {stat.trend.isPositive ? "+" : ""}
                    {stat.trend.value}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
