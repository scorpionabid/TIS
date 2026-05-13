import React, { Suspense, lazy, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";
import { Loader2 } from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard/skeletons";
import { useNavigate, useLocation } from "react-router-dom";

const SuperAdminDashboardOptimized = lazy(() =>
  import("@/components/dashboard/modern/ModernSuperAdminDashboard").then(module => ({
    default: module.ModernSuperAdminDashboard
  }))
);

const RegionAdminDashboard = lazy(() =>
  import("@/components/dashboard/modern/ModernRegionAdminDashboard").then(module => ({
    default: module.ModernRegionAdminDashboard
  }))
);

const RegionOperatorDashboard = lazy(() =>
  import("@/components/dashboard/modern/ModernRegionOperatorDashboard").then(module => ({
    default: module.ModernRegionOperatorDashboard
  }))
);

const SektorAdminDashboard = lazy(() =>
  import("@/components/dashboard/modern/ModernSektorAdminDashboard").then(module => ({
    default: module.ModernSektorAdminDashboard
  }))
);

const RoleBasedDashboard = lazy(() =>
  import("@/components/dashboard/RoleBasedDashboard").then(module => ({
    default: module.RoleBasedDashboard
  }))
);

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
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const DashboardComponent = useMemo(() => {
    if (!currentUser?.role) return null;

    const userRole = typeof currentUser.role === 'string'
      ? currentUser.role.toLowerCase()
      : currentUser.role;

    switch (userRole) {
      case USER_ROLES.SUPERADMIN:
        return SuperAdminDashboardOptimized;
      case USER_ROLES.REGIONADMIN:
        return RegionAdminDashboard;
      case USER_ROLES.REGIONOPERATOR:
        return RegionOperatorDashboard;
      case USER_ROLES.SEKTORADMIN:
        return SektorAdminDashboard;
      default:
        // School-level roles (schooladmin, preschooladmin, müəllim and sub-roles)
        // handled by RoleBasedDashboard using original_role
        return RoleBasedDashboard;
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === USER_ROLES.REGIONADMIN && location.pathname === '/') {
      navigate('/regionadmin', { replace: true });
    }
  }, [currentUser?.role, location.pathname, navigate]);

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

  if (!currentUser || !DashboardComponent) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-destructive">Giriş problemi</h2>
        <p className="text-muted-foreground mt-2">
          İstifadəçi məlumatları tapılmadı və ya rol müəyyən edilmədi.
        </p>
      </div>
    );
  }

  if (currentUser?.role === USER_ROLES.REGIONADMIN && location.pathname === '/') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Regional İdarəçiliyi yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full">
      <Suspense fallback={<DashboardLoader />}>
        <ErrorBoundary fallback={DashboardError}>
          <DashboardComponent />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};

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
