import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  accentClass?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ value, label, icon, accentClass }) => {
  return (
    <Card className="border border-border/60 bg-white shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground', accentClass)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
