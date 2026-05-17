import type { LucideIcon } from 'lucide-react';

export interface StatItem {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  valueColor?: string;
}

export const createStatItem = (
  title: string,
  value: number,
  icon: LucideIcon,
  colorTheme: 'default' | 'green' | 'gray' | 'orange' | 'blue' | 'purple' | 'yellow' | 'red' = 'default'
): StatItem => {
  const colorMap: Record<typeof colorTheme, Partial<StatItem>> = {
    default: { iconColor: 'text-muted-foreground', bgColor: 'h-8 w-8 text-muted-foreground' },
    green: { iconColor: 'text-green-600', bgColor: 'h-8 w-8 text-green-600', valueColor: 'text-green-600' },
    gray: { iconColor: 'text-gray-600', bgColor: 'h-8 w-8 text-gray-600', valueColor: 'text-gray-600' },
    orange: { iconColor: 'text-orange-600', bgColor: 'h-8 w-8 text-orange-600', valueColor: 'text-orange-600' },
    blue: { iconColor: 'text-blue-600', bgColor: 'h-8 w-8 text-blue-600', valueColor: 'text-blue-600' },
    purple: { iconColor: 'text-purple-600', bgColor: 'h-8 w-8 text-purple-600', valueColor: 'text-purple-600' },
    yellow: { iconColor: 'text-yellow-600', bgColor: 'h-8 w-8 text-yellow-600', valueColor: 'text-yellow-600' },
    red: { iconColor: 'text-red-600', bgColor: 'h-8 w-8 text-red-600', valueColor: 'text-red-600' },
  };

  return {
    title,
    value,
    icon,
    ...colorMap[colorTheme],
  };
};
