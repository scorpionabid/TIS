import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { memo } from "react";

export const StatsSkeleton = memo(() => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-4 w-4 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-7 bg-muted rounded w-12 mb-1" />
            <div className="h-3 bg-muted rounded w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

StatsSkeleton.displayName = 'StatsSkeleton';

export const StatsCardSkeleton = memo(() => {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-4 w-4 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-16 mb-2" />
        <div className="h-3 bg-muted rounded w-32" />
      </CardContent>
    </Card>
  );
});

StatsCardSkeleton.displayName = 'StatsCardSkeleton';