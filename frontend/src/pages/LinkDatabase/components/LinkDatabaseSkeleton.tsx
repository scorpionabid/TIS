import { Skeleton } from '@/components/ui/skeleton';

export function LinkDatabaseTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 border-b">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[60px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[60px]" />
        <Skeleton className="h-4 w-[40px]" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-4" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-3 w-[180px]" />
          </div>
          <Skeleton className="h-5 w-[70px] rounded-full" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-5 w-[40px] rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function LinkDatabaseCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-[60px] rounded-full" />
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-[50px] rounded-full" />
              <Skeleton className="h-5 w-[40px] rounded-full" />
            </div>
            <Skeleton className="h-4 w-[80px]" />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Skeleton className="h-4 w-[100px]" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
