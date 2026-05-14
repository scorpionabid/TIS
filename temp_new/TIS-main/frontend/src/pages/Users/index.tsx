import { lazy, Suspense } from "react";

// Lazy load the main components for better code splitting
export const UserManagement = lazy(() => import('./UserManagement').then(module => ({
  default: module.UserManagement
})));

// Loading component for better UX
const UserManagementSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-4 bg-muted rounded w-64 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-muted rounded w-20 animate-pulse" />
        <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        <div className="h-10 bg-muted rounded w-28 animate-pulse" />
      </div>
    </div>
    
    <div className="p-4 bg-background border rounded-lg">
      <div className="flex flex-wrap gap-4">
        <div className="h-10 bg-muted rounded w-80 animate-pulse" />
        <div className="h-10 bg-muted rounded w-40 animate-pulse" />
        <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        <div className="h-10 bg-muted rounded w-48 animate-pulse" />
      </div>
    </div>
    
    <div className="rounded-md border">
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-12 bg-muted rounded w-64 animate-pulse" />
            <div className="h-12 bg-muted rounded w-32 animate-pulse" />
            <div className="h-12 bg-muted rounded w-48 animate-pulse" />
            <div className="h-12 bg-muted rounded w-24 animate-pulse" />
            <div className="h-12 bg-muted rounded w-20 animate-pulse" />
            <div className="h-12 bg-muted rounded w-24 animate-pulse" />
            <div className="h-12 bg-muted rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Main component with Suspense wrapper
const Users = () => {
  return (
    <Suspense fallback={<UserManagementSkeleton />}>
      <UserManagement />
    </Suspense>
  );
};

export default Users;