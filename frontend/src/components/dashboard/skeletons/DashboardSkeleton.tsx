import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { memo } from "react";

export const DashboardSkeleton = memo(() => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-4 bg-muted rounded w-96 animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-64" />
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>

        <Card className="col-span-3 animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-muted rounded-full" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-36" />
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

DashboardSkeleton.displayName = 'DashboardSkeleton';