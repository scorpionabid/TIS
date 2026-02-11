import React, { Suspense, lazy, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";
import { Loader2 } from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard/skeletons";
import { useNavigate, useLocation } from "react-router-dom";
// Performance monitoring imports removed for speed

// Lazy load dashboard components for better performance
const SuperAdminDashboardOptimized = lazy(() => 
  import("@/components/dashboard/SuperAdminDashboardOptimized").then(module => ({
    default: module.SuperAdminDashboardOptimized
  }))
);

const RegionAdminDashboard = lazy(() => 
  import("@/components/regionadmin/RegionAdminDashboard").then(module => ({
    default: module.RegionAdminDashboard
  }))
);

const RegionOperatorDashboard = lazy(() => 
  import("@/components/regionoperator/RegionOperatorDashboard").then(module => ({
    default: module.RegionOperatorDashboard
  }))
);

const SektorAdminDashboard = lazy(() => 
  import("@/components/sektoradmin/SektorAdminDashboard").then(module => ({
    default: module.SektorAdminDashboard
  }))
);

const RoleBasedDashboard = lazy(() => 
  import("@/components/dashboard/RoleBasedDashboard").then(module => ({
    default: module.RoleBasedDashboard
  }))
);

// Enhanced loading component
const DashboardLoader = () => (
  <div className="p-6">
    <div className="flex items-center justify-center min-h-[200px] mb-6">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Dashboard hazırlanır...</p>
      </div>
    </div>
    <DashboardSkeleton />
  </div>
);

// Error fallback component
const DashboardError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="p-6 text-center">
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-destructive mb-2">Dashboard yüklənə bilmədi</h2>
      <p className="text-muted-foreground mb-4">
        {error.message || 'Naməlum xəta baş verdi'}
      </p>
      <button 
        onClick={retry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Yenidən cəhd et
      </button>
    </div>
  </div>
);

const IndexOptimized = () => {
  // Performance monitoring removed for speed
  
  // Debug logging for context issues
  console.log('🔍 IndexOptimized Debug: Component mounting');
  
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Debug context state
  console.log('🔍 IndexOptimized Debug:', {
    hasCurrentUser: !!currentUser,
    loading,
    currentUserRole: currentUser?.role,
    pathname: location.pathname
  });

  // Memoize dashboard component selection
  const DashboardComponent = useMemo(() => {
    console.log('🔍 DashboardComponent Debug: Selecting component', {
      hasCurrentUser: !!currentUser,
      currentUserRole: currentUser?.role
    });
    
    if (!currentUser?.role) {
      console.log('🔍 DashboardComponent Debug: No user role, returning null');
      return null;
    }

    const userRole = typeof currentUser.role === 'string'
      ? currentUser.role.toLowerCase()
      : currentUser.role;

    console.log('🔍 DashboardComponent Debug: User role normalized to:', userRole);

    switch (userRole) {
      case USER_ROLES.SUPERADMIN:
        console.log('🔍 DashboardComponent Debug: Selected SuperAdminDashboardOptimized');
        return SuperAdminDashboardOptimized;

      case USER_ROLES.REGIONADMIN:
        console.log('🔍 DashboardComponent Debug: Selected RegionAdminDashboard');
        return RegionAdminDashboard;

      case USER_ROLES.REGIONOPERATOR:
        console.log('🔍 DashboardComponent Debug: Selected RegionOperatorDashboard');
        return RegionOperatorDashboard;

      case USER_ROLES.SEKTORADMIN:
        console.log('🔍 DashboardComponent Debug: Selected SektorAdminDashboard');
        return SektorAdminDashboard;

      // School-related roles
      case USER_ROLES.SCHOOLADMIN:
      case USER_ROLES.MUELLIM:
        console.log('🔍 DashboardComponent Debug: Selected RoleBasedDashboard (School)');
        return RoleBasedDashboard;

      default:
        console.log('🔍 DashboardComponent Debug: Selected RoleBasedDashboard (Default)');
        return RoleBasedDashboard;
    }
  }, [currentUser?.role]);

  // Handle RegionAdmin redirect - only redirect when on exact index page
  useEffect(() => {
    if (currentUser?.role === USER_ROLES.REGIONADMIN) {
      // Only redirect if we're on the exact root path "/"
      if (location.pathname === '/') {
        navigate('/regionadmin', { replace: true });
      }
    }
  }, [currentUser, location.pathname, navigate]);

  // Show loading state for auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Giriş yoxlanılır...</p>
        </div>
      </div>
    );
  }

  // Show error if no user or component
  if (!currentUser || !DashboardComponent) {
    console.log('🔍 IndexOptimized Debug: Error condition', {
      hasCurrentUser: !!currentUser,
      hasDashboardComponent: !!DashboardComponent,
      currentUser,
      DashboardComponent
    });
    
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-destructive">Giriş problemi</h2>
        <p className="text-muted-foreground mt-2">
          İstifadəçi məlumatları tapılmadı və ya rol müəyyən edilmədi.
        </p>
      </div>
    );
  }

  // Don't show dashboard for regionadmin on root path, let the redirect happen
  if (currentUser?.role === USER_ROLES.REGIONADMIN && location.pathname === '/') {
    console.log('🔍 IndexOptimized Debug: RegionAdmin on root path, showing loading');
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Regional İdarəçiliyi yüklənir...</p>
        </div>
      </div>
    );
  }

  // Navigation tracking removed for speed

  console.log('🔍 IndexOptimized Debug: Rendering dashboard component', {
    DashboardComponent: DashboardComponent.name || 'Anonymous'
  });

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
      <Suspense fallback={<DashboardLoader />}>
        <ErrorBoundary fallback={DashboardError}>
          <DashboardComponent />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback;
      return (
        <Fallback 
          error={this.state.error} 
          retry={() => this.setState({ hasError: false, error: null })} 
        />
      );
    }

    return this.props.children;
  }
}

export default IndexOptimized;
