import React, { Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_ROLES } from '@/types/schoolRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy load dashboard components for better performance
const SchoolAdminDashboard = lazy(() => 
  import('./SchoolAdminDashboard').then(module => ({
    default: module.SchoolAdminDashboard
  }))
);
const MuavinDashboard = lazy(() => 
  import('./MuavinDashboard').then(module => ({
    default: module.MuavinDashboard
  }))
);
const UBRDashboard = lazy(() => 
  import('./UBRDashboard').then(module => ({
    default: module.UBRDashboard
  }))
);
const TesarrufatDashboard = lazy(() => 
  import('./TesarrufatDashboard').then(module => ({
    default: module.TesarrufatDashboard
  }))
);
const PsixoloquDashboard = lazy(() => 
  import('./PsixoloquDashboard').then(module => ({
    default: module.PsixoloquDashboard
  }))
);
const TeacherDashboard = lazy(() => 
  import('../teacher/TeacherDashboard').then(module => ({
    default: module.TeacherDashboard
  }))
);

interface RoleBasedDashboardProps {
  className?: string;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ className }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Dashboard yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Giriş Təsdiqi Lazımdır
            </CardTitle>
            <CardDescription>
              Dashboard-a giriş üçün daxil olmalısınız
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/login'}>
              Daxil Ol
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = currentUser.role;

  // Map auth role to school roles
  const getSchoolRole = (authRole: string) => {
    switch (authRole) {
      case 'schooladmin':
        return SCHOOL_ROLES.SCHOOL_ADMIN;
      case 'müəllim':
        return SCHOOL_ROLES.MUELLIM;
      default:
        return authRole;
    }
  };

  const schoolRole = getSchoolRole(userRole);

  // Route to appropriate dashboard based on user role
  const DashboardLoader = () => (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Dashboard yüklənir...</p>
      </div>
    </div>
  );

  switch (schoolRole) {
    case SCHOOL_ROLES.SCHOOL_ADMIN:
      return (
        <Suspense fallback={<DashboardLoader />}>
          <SchoolAdminDashboard className={className} />
        </Suspense>
      );
    
    case SCHOOL_ROLES.MUAVIN:
      return (
        <Suspense fallback={<DashboardLoader />}>
          <MuavinDashboard className={className} />
        </Suspense>
      );
    
    case SCHOOL_ROLES.UBR:
      return (
        <Suspense fallback={<DashboardLoader />}>
          <UBRDashboard className={className} />
        </Suspense>
      );
    
    case SCHOOL_ROLES.TESARRUFAT:
      return (
        <Suspense fallback={<DashboardLoader />}>
          <TesarrufatDashboard className={className} />
        </Suspense>
      );
    
    case SCHOOL_ROLES.PSIXOLOQ:
      return (
        <Suspense fallback={<DashboardLoader />}>
          <PsixoloquDashboard className={className} />
        </Suspense>
      );
    
    case SCHOOL_ROLES.MUELLIM:
      // Teachers use their dedicated dashboard with teacher-specific functionality
      return (
        <Suspense fallback={<DashboardLoader />}>
          <TeacherDashboard className={className} />
        </Suspense>
      );
    
    default:
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Naməlum Rol
              </CardTitle>
              <CardDescription>
                Sizin rolunuz üçün xüsusi dashboard mövcud deyil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Hazırkı rol: <span className="font-medium">{userRole || 'Naməlum'}</span>
                </p>
                <p className="text-muted-foreground">
                  İnstitusiya: <span className="font-medium">{currentUser.institution?.name || 'Naməlum'}</span>
                </p>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Əgər bu bir səhvdirsə, sistem administratoru ilə əlaqə saxlayın.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Səhifəni yenilə
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
  }
};

export default RoleBasedDashboard;