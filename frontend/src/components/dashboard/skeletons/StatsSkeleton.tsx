import { Card, CardContent } from "@/components/ui/card";
import { memo } from "react";

export const StatsSkeleton = memo(() => {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} align="center" className="animate-pulse">
          <CardContent className="flex flex-col items-center gap-3 px-4 py-4 sm:px-5">
            <div className="h-10 w-10 rounded-lg bg-muted/40" />
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted/80" />
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
      <CardContent className="flex flex-col items-center gap-3 px-4 py-4 sm:px-5">
        <div className="h-10 w-10 rounded-lg bg-muted/40" />
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted/80" />
      </CardContent>
    </Card>
  );
});

StatsCardSkeleton.displayName = 'StatsCardSkeleton';
