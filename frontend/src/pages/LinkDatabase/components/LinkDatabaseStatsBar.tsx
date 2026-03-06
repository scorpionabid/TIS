import { Link2, CheckCircle2, Clock, Star } from 'lucide-react';
import type { LinkDatabaseStats } from '../types/linkDatabase.types';

interface LinkDatabaseStatsBarProps {
  stats: LinkDatabaseStats;
}

export function LinkDatabaseStatsBar({ stats }: LinkDatabaseStatsBarProps) {
  const items = [
    {
      icon: Link2,
      label: 'Ümumi Linklər',
      value: stats.total,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
    },
    {
      icon: CheckCircle2,
      label: 'Aktiv',
      value: stats.active,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      icon: Clock,
      label: 'Müddəti bitmiş',
      value: stats.expired,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-700',
    },
    {
      icon: Star,
      label: 'Seçilmiş',
      value: stats.featured,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`${item.bgColor} rounded-lg p-3 sm:p-4 flex items-center gap-3`}
          >
            <div className={`${item.iconColor} shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{item.label}</p>
              <p className={`text-lg font-bold ${item.valueColor}`}>{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
