import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { RegionAdminDashboard } from "@/components/regionadmin/RegionAdminDashboard";
import { SektorAdminDashboard } from "@/components/sektoradmin/SektorAdminDashboard";
import { SchoolAdminDashboard } from "@/components/schooladmin/SchoolAdminDashboard";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Dashboard yüklənir...</p>
        </div>
      </div>
    );
  }

  // Role-based dashboard rendering
  switch (currentUser?.role) {
    case 'superadmin':
      return (
        <div className="p-6">
          <SuperAdminDashboard />
        </div>
      );
    
    case 'regionadmin':
    case 'regionoperator':
      // RegionAdmin users should use /regionadmin routes, not Index.tsx
      window.location.href = '/regionadmin';
      return null;
    
    case 'sektoradmin':
      return (
        <div className="p-6">
          <SektorAdminDashboard />
        </div>
      );
    
    case 'məktəbadmin':
      return (
        <div className="p-6">
          <SchoolAdminDashboard />
        </div>
      );
    
    case 'müəllim':
      return (
        <div className="p-6">
          <TeacherDashboard />
        </div>
      );
    
    default:
      return (
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Rol: {currentUser?.role || 'Təyin edilməyib'}
            </p>
          </div>
        </div>
      );
  }
};

export default Index;
