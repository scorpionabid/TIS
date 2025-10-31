import { Card, CardContent } from "@/components/ui/card";
import { memo } from "react";

export const StatsSkeleton = memo(() => {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} align="center" className="animate-pulse">
          <CardContent className="flex flex-col items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-lg bg-muted/50" />
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted/80" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

StatsSkeleton.displayName = 'StatsSkeleton';

export const StatsCardSkeleton = memo(() => {
  return (
    <Card align="center" className="animate-pulse">
      <CardContent className="flex flex-col items-center gap-4 py-5">
        <div className="h-12 w-12 rounded-lg bg-muted/50" />
        <div className="h-6 w-24 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted/80" />
      </CardContent>
    </Card>
  );
});

StatsCardSkeleton.displayName = 'StatsCardSkeleton';
