import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, UserIcon, Mail } from "lucide-react";
import { memo, useMemo } from "react";
import { User } from "@/services/users";

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

const getRoleBadgeVariant = (role: string) => {
  if (['superadmin', 'regionadmin'].includes(role)) return 'destructive';
  if (['sektoradmin', 'schooladmin'].includes(role)) return 'secondary';
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
    const targetLevel = roleHierarchy[targetUser.role as keyof typeof roleHierarchy] || 0;
    
    return currentLevel > targetLevel;
  }, [currentUserRole]);

  if (isLoading) {
    return (
      <div className="rounded-md border max-h-[calc(100vh-300px)] overflow-auto">
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
    <div className="rounded-md border max-h-[calc(100vh-300px)] overflow-auto">
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
                  {roleLabels[user.role] || user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {user.institution?.name || 'Təyin edilməyib'}
                </div>
                {user.institution?.type && (
                  <div className="text-xs text-muted-foreground">
                    {user.institution.type}
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