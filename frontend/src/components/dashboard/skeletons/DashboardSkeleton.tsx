import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { memo } from "react";

export const DashboardSkeleton = memo(() => {
  return (
    <div className="flex flex-col gap-12 pb-20 pt-4 px-2 sm:px-4 lg:px-6">
      {/* Greeting Header Skeleton */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-muted/20 animate-pulse border border-muted/10 h-48 w-full flex flex-col justify-center">
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-10 bg-muted rounded w-96" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-muted/20 rounded-3xl animate-pulse border border-muted/10 p-6 flex flex-col justify-between">
            <div className="h-10 w-10 bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[480px] bg-muted/20 rounded-3xl animate-pulse border border-muted/10 p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-64" />
            </div>
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
          <div className="h-64 w-full bg-muted/30 rounded-2xl" />
        </div>

        <div className="h-[480px] bg-muted/20 rounded-3xl animate-pulse border border-muted/10 p-6">
          <div className="space-y-2 mb-8">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-48" />
          </div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted/30 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardSkeleton.displayName = 'DashboardSkeleton';