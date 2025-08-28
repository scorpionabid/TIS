import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolAdminDashboard } from './SchoolAdminDashboard';
import { MuavinDashboard } from './MuavinDashboard';
import { UBRDashboard } from './UBRDashboard';
import { TesarrufatDashboard } from './TesarrufatDashboard';
import { PsixoloquDashboard } from './PsixoloquDashboard';
// Note: Teacher dashboard functionality is handled through role-based permissions
// within the SchoolAdminDashboard component
import { SCHOOL_ROLES } from '@/types/schoolRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  switch (schoolRole) {
    case SCHOOL_ROLES.SCHOOL_ADMIN:
      return <SchoolAdminDashboard className={className} />;
    
    case SCHOOL_ROLES.MUAVIN:
      return <MuavinDashboard className={className} />;
    
    case SCHOOL_ROLES.UBR:
      return <UBRDashboard className={className} />;
    
    case SCHOOL_ROLES.TESARRUFAT:
      return <TesarrufatDashboard className={className} />;
    
    case SCHOOL_ROLES.PSIXOLOQ:
      return <PsixoloquDashboard className={className} />;
    
    case SCHOOL_ROLES.MUELLIM:
      // Teachers use a simplified version of the school admin dashboard
      // with limited functionality based on their permissions
      return <SchoolAdminDashboard className={className} />;
    
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