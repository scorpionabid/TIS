import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, UserIcon, Mail, Phone, CalendarDays, BuildingIcon } from "lucide-react";
import { memo, useMemo } from "react";
import { User } from "@/services/users";
import { useLayout } from "@/contexts/LayoutContext";
import { UserRole } from "@/constants/roles";

export interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  currentUserRole: string;
  isLoading?: boolean;
}

// Utility function to get user's full name or fallback to username
const getUserDisplayName = (user: any): string => {
  const firstName = user.first_name?.trim();
  const lastName = user.last_name?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) return firstName;
  if (lastName) return lastName;
  
  if (user.username?.trim()) {
    return user.username.trim();
  }
  
  if (user.email?.trim()) {
    return user.email.trim().split('@')[0];
  }
  
  return 'Anonim İstifadəçi';
};

const getStatusBadgeVariant = (status: string) => {
  return status === 'active' ? 'default' : 'secondary';
};

// Helper function to extract role name safely
const getRoleName = (role: string | UserRole | any): string => {
  if (typeof role === 'string') {
    return role;
  }
  if (role && typeof role === 'object') {
    return role.name || role.display_name || 'unknown';
  }
  return 'unknown';
};

// Helper function to extract institution type safely
const getInstitutionType = (institution: any): string => {
  if (!institution?.type) return '';
  if (typeof institution.type === 'string') return institution.type;
  return institution.type?.name || institution.type?.display_name || 'Müəssisə növü';
};

const getRoleBadgeVariant = (role: string | UserRole | any) => {
  const roleName = getRoleName(role);
  if (['superadmin', 'regionadmin'].includes(roleName)) return 'destructive';
  if (['sektoradmin', 'schooladmin'].includes(roleName)) return 'secondary';
  return 'outline';
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  regionadmin: 'Regional Admin', 
  regionoperator: 'Regional Operator',
  sektoradmin: 'Sektor Admin',
  schooladmin: 'Məktəb Admin',
  müəllim: 'Müəllim',
  user: 'İstifadəçi',
};

export const UserTable = memo(({ 
  users, 
  onEditUser, 
  onDeleteUser, 
  currentUserRole,
  isLoading = false 
}: UserTableProps) => {
  const { isMobile } = useLayout();
  
  // Debug log to see the data structure
  console.log('🔍 UserTable Debug - users data:', users);
  if (users && users.length > 0) {
    console.log('🔍 First user structure:', users[0]);
    console.log('🔍 First user institution:', users[0].institution);
  }
  
  // Check if user can be edited/deleted based on role hierarchy
  const canModifyUser = useMemo(() => (targetUser: User) => {
    if (currentUserRole === 'superadmin') return true;
    
    const roleHierarchy = {
      'superadmin': 5,
      'regionadmin': 4,
      'sektoradmin': 3,
      'schooladmin': 2,
      'müəllim': 1,
      'user': 0
    };
    
    const currentLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy] || 0;
    const targetRoleName = getRoleName(targetUser.role);
    const targetLevel = roleHierarchy[targetRoleName as keyof typeof roleHierarchy] || 0;
    
    return currentLevel > targetLevel;
  }, [currentUserRole]);

  if (isMobile) {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-lg border bg-card p-4 shadow-sm animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="rounded-md border p-8 text-center">
          <UserIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold">İstifadəçi tapılmadı</h3>
          <p className="text-sm text-muted-foreground">
            Axtarış kriteriyalarınıza uyğun istifadəçi yoxdur.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-base font-semibold text-foreground">
                  {getUserDisplayName(user)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {roleLabels[getRoleName(user.role)] || getRoleName(user.role)}
              </Badge>
              <Badge variant={getStatusBadgeVariant(user.is_active ? 'active' : 'inactive')}>
                {user.is_active ? 'Aktiv' : 'Passiv'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4" />
                <span>{user.institution?.name || 'Təyin edilməyib'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{user.contact_phone || user.phone || 'Əlavə edilməyib'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('az-AZ')
                    : 'Yaradılma tarixi məlum deyil'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {canModifyUser(user) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onEditUser(user)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Redaktə et
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteUser(user)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Sil
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border md:max-h-[calc(100vh-300px)] md:overflow-auto">
        <Table className="relative min-w-full">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[240px] sticky left-0 bg-background z-20">İstifadəçi</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Region/Müəssisə</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Yaradıldı</TableHead>
              <TableHead className="text-right w-[120px] sticky right-0 bg-background z-20">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1,2,3,4,5].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-16 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-muted rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">İstifadəçi tapılmadı</h3>
        <p className="text-muted-foreground">Axtarış kriteriyalarınıza uyğun istifadəçi yoxdur.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border md:max-h-[calc(100vh-300px)] md:overflow-auto">
      <Table className="relative">
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[250px] sticky left-0 bg-background z-20">İstifadəçi</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Region/Müəssisə</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Yaradıldı</TableHead>
            <TableHead className="text-right w-[100px] sticky right-0 bg-background z-20">Əməliyyat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {getUserDisplayName(user)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3 mr-1" />
                      {user.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{user.username}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {roleLabels[getRoleName(user.role)] || getRoleName(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {user.institution?.name || 'Təyin edilməyib'}
                </div>
                {user.institution?.type && (
                  <div className="text-xs text-muted-foreground">
                    {getInstitutionType(user.institution)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {user.contact_phone || user.phone || 'Əlavə edilməyib'}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(user.is_active ? 'active' : 'inactive')}>
                  {user.is_active ? 'Aktiv' : 'Passiv'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('az-AZ') : 'Məlum deyil'}
                </div>
                {user.last_login && (
                  <div className="text-xs text-muted-foreground">
                    Son giriş: {new Date(user.last_login).toLocaleDateString('az-AZ')}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  {canModifyUser(user) && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteUser(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

UserTable.displayName = 'UserTable';
