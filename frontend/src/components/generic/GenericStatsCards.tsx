import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatsConfig } from './types';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GenericStatsCardsProps {
  stats: StatsConfig[];
  className?: string;
  variant?: 'default' | 'compact';
}

export function GenericStatsCards({ stats, className, variant = 'default' }: GenericStatsCardsProps) {
  if (!stats.length) return null;

  const getColorClasses = (color: StatsConfig['color']) => {
    switch (color) {
      case 'green':
      case 'emerald':
        return {
          icon: 'text-emerald-600',
          background: 'bg-emerald-50',
          border: 'border-emerald-100',
          gradient: 'from-emerald-500/10 to-transparent',
          accent: 'bg-emerald-500',
        };
      case 'red':
      case 'rose':
        return {
          icon: 'text-rose-600',
          background: 'bg-rose-50',
          border: 'border-rose-100',
          gradient: 'from-rose-500/10 to-transparent',
          accent: 'bg-rose-500',
        };
      case 'blue':
      case 'sky':
        return {
          icon: 'text-sky-600',
          background: 'bg-sky-50',
          border: 'border-sky-100',
          gradient: 'from-sky-500/10 to-transparent',
          accent: 'bg-sky-500',
        };
      case 'indigo':
        return {
          icon: 'text-indigo-600',
          background: 'bg-indigo-50',
          border: 'border-indigo-100',
          gradient: 'from-indigo-500/10 to-transparent',
          accent: 'bg-indigo-500',
        };
      case 'yellow':
      case 'amber':
        return {
          icon: 'text-amber-600',
          background: 'bg-amber-50',
          border: 'border-amber-100',
          gradient: 'from-amber-500/10 to-transparent',
          accent: 'bg-amber-500',
        };
      case 'purple':
      case 'violet':
        return {
          icon: 'text-violet-600',
          background: 'bg-violet-50',
          border: 'border-violet-100',
          gradient: 'from-violet-500/10 to-transparent',
          accent: 'bg-violet-500',
        };
      case 'orange':
        return {
          icon: 'text-orange-600',
          background: 'bg-orange-50',
          border: 'border-orange-100',
          gradient: 'from-orange-500/10 to-transparent',
          accent: 'bg-orange-500',
        };
      default:
        return {
          icon: 'text-slate-600',
          background: 'bg-slate-50',
          border: 'border-slate-200',
          gradient: 'from-slate-500/10 to-transparent',
          accent: 'bg-slate-500',
        };
    }
  };

  const getCompactIconColor = (color: StatsConfig['color']): string => {
    switch (color) {
      case 'green':
      case 'emerald': return 'text-emerald-500';
      case 'red':
      case 'rose': return 'text-rose-500';
      case 'blue':
      case 'sky':
      case 'indigo': return 'text-indigo-500';
      case 'yellow':
      case 'amber': return 'text-amber-500';
      case 'purple':
      case 'violet': return 'text-violet-500';
      case 'orange': return 'text-orange-500';
      default: return 'text-muted-foreground';
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

  const getCompactGridCols = () => {
    if (stats.length === 1) return 'grid-cols-1';
    if (stats.length === 2) return 'grid-cols-2';
    if (stats.length === 3) return 'grid-cols-2 sm:grid-cols-3';
    if (stats.length === 4) return 'grid-cols-2 sm:grid-cols-4';
    if (stats.length <= 6) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
    return 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7';
  };

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "grid gap-3",
          getCompactGridCols(),
          className
        )}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const iconColor = getCompactIconColor(stat.color);

          return (
            <Card
              key={stat.key}
              className="border shadow-sm bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all hover:shadow-md group overflow-hidden"
            >
              <CardContent className="flex items-center gap-3 px-4 py-3 relative">
                 <div className={cn("absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", getColorClasses(stat.color).gradient)} />
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110 relative z-10", iconColor)} />
                <div className="min-w-0 flex-1 relative z-10">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-6",
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
            className={cn(
              "relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1 border border-slate-200/60 bg-white/80 backdrop-blur-md",
            )}
          >
            {/* Design elements */}
            <div className={cn("absolute top-0 right-0 h-24 w-24 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rounded-bl-full", colors.gradient)} />
            <div className={cn("absolute top-0 left-0 w-full h-[3px]", colors.accent)} />
            
            <CardContent className="flex flex-col items-center gap-4 py-8 relative z-10">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 animate-in zoom-in-50 duration-500",
                  colors.background
                )}
              >
                <Icon className={cn("h-7 w-7", colors.icon)} />
              </div>

              <div className="space-y-1.5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-slate-900 sm:text-4xl tracking-tight tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
              </div>

              {stat.trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100",
                    stat.trend.isPositive ? "text-emerald-600" : "text-rose-600"
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
