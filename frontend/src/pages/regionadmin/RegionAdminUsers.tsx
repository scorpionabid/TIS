import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download,
  UserPlus,
  Shield,
  Building,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickAuth } from '@/components/auth/QuickAuth';
import { regionAdminService } from '@/services/regionAdmin';

interface RegionalUser {
  id: number;
  name: string;
  email: string;
  role: string;
  institution?: string;
  status: 'active' | 'inactive' | 'pending';
  last_login?: string;
  created_at: string;
}

export default function RegionAdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const { currentUser } = useAuth();

  // Helper function to fetch users by role (not a hook)
  const createUserQuery = async (role: string) => {
    try {
      // Real API call - determine role name for backend
      const roleMapping: Record<string, string> = {
        'operators': 'regionoperator',
        'sektoradmins': 'sektoradmin',
        'schooladmins': 'schooladmin',
        'teachers': 'müəllim'
      };

      const apiRoleName = roleMapping[role];
      if (!apiRoleName) {
        throw new Error(`Invalid role: ${role}`);
      }

      const result = await regionAdminService.getUsers({
        role: apiRoleName,
        per_page: 50,
      });

      console.log('🔍 RegionAdmin Users API Response:', result.raw);
      console.log('🔍 Users array:', result.users);
      console.log('🔍 Users meta:', result.meta);
      console.log('🔍 First user sample:', result.users[0]);

      const users: RegionalUser[] = result.users.map((user: any) => {
        // Handle roles array - get the first role or fallback
        let roleName = 'Təyin edilməyib';
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          roleName = user.roles[0].display_name || user.roles[0].name || 'Təyin edilməyib';
        } else if (user.role_name) {
          roleName = user.role_name;
        } else if (user.role) {
          // If role is a string, use it directly
          if (typeof user.role === 'string') {
            roleName = user.role;
          } else if (typeof user.role === 'object') {
            // Handle null role object - common backend issue  
            if (user.role.name === null && user.role.display_name === null && user.role.id === null) {
              roleName = 'Təyin edilməyib';
            } else {
              roleName = user.role.display_name || user.role.name || 'Təyin edilməyib';
            }
          }
        }

        return {
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Ad təyin edilməyib',
          email: user.email || 'Email təyin edilməyib',
          role: roleName,
          institution: user.institution?.name || 'Təyin edilməyib',
          status: user.is_active || user.status === 'active' ? 'active' : 'inactive',
          last_login: user.last_login_at,
          created_at: user.created_at
        };
      });

      return users;
    } catch (error) {
      console.error('🚨 RegionAdmin Users API Error:', error);
      // Fallback to mock data on error
      const mockUsers: RegionalUser[] = [
        {
          id: 1,
          name: 'Mock İstifadəçi',
          email: 'mock@example.com',
          role: role === 'operators' ? 'RegionOperator' : role === 'sektoradmins' ? 'SektorAdmin' : role === 'schooladmins' ? 'MəktəbAdmin' : 'Müəllim',
          institution: 'Mock Təşkilat',
          status: 'active',
          last_login: '2025-08-13T10:30:00',
          created_at: '2025-08-01T09:00:00'
        }
      ];
      return mockUsers;
    }
  };

  // Individual useQuery hooks for each role - moved to top level
  const operatorsQuery = useQuery({
    queryKey: ['regionadmin-users', 'operators', currentUser?.institution?.id],
    queryFn: () => createUserQuery('operators'),
    staleTime: 1000 * 60 * 5,
  });

  const sektorAdminsQuery = useQuery({
    queryKey: ['regionadmin-users', 'sektoradmins', currentUser?.institution?.id],
    queryFn: () => createUserQuery('sektoradmins'),
    staleTime: 1000 * 60 * 5,
  });

  const schoolAdminsQuery = useQuery({
    queryKey: ['regionadmin-users', 'schooladmins', currentUser?.institution?.id],
    queryFn: () => createUserQuery('schooladmins'),
    staleTime: 1000 * 60 * 5,
  });

  const teachersQuery = useQuery({
    queryKey: ['regionadmin-users', 'teachers', currentUser?.institution?.id],
    queryFn: () => createUserQuery('teachers'),
    staleTime: 1000 * 60 * 5,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Aktiv</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-700">Qeyri-aktiv</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Gözləyir</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const UserTable = ({ users, isLoading, roleType }: { users?: RegionalUser[], isLoading: boolean, roleType: string }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-pulse space-y-4 w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">İstifadəçi tapılmadı</h3>
          <p className="text-muted-foreground mb-4">
            Bu kateqoriyada hələ istifadəçi yoxdur.
          </p>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Yeni İstifadəçi Əlavə Et
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>İstifadəçi</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Təşkilat</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Son Giriş</TableHead>
            <TableHead>Əməliyyatlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.institution}</TableCell>
              <TableCell>{getStatusBadge(user.status)}</TableCell>
              <TableCell>
                {user.last_login 
                  ? new Date(user.last_login).toLocaleDateString('az-AZ')
                  : 'Heç vaxt'
                }
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    Redaktə
                  </Button>
                  <Button variant="ghost" size="sm">
                    Deaktiv et
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <QuickAuth />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İstifadəçi İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Regional səviyyədə istifadəçi hesablarının idarə edilməsi
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            İxrac Et
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni İstifadəçi
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Axtarış və Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Ad, email və ya təşkilat axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Tabs */}
      <Tabs defaultValue="operators" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operators" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>RegionOperator</span>
          </TabsTrigger>
          <TabsTrigger value="sektoradmins" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>SektorAdmin</span>
          </TabsTrigger>
          <TabsTrigger value="schooladmins" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>MəktəbAdmin</span>
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Müəllimlər</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operators">
          <Card>
            <CardHeader>
              <CardTitle>RegionOperator-lar</CardTitle>
              <CardDescription>
                Regional əməliyyatları həyata keçirən istifadəçilər
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable 
                users={operatorsQuery.data} 
                isLoading={operatorsQuery.isLoading}
                roleType="operators"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sektoradmins">
          <Card>
            <CardHeader>
              <CardTitle>SektorAdmin-lar</CardTitle>
              <CardDescription>
                Sektor səviyyəsində idarəetməni həyata keçirən rəhbərlər
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable 
                users={sektorAdminsQuery.data} 
                isLoading={sektorAdminsQuery.isLoading}
                roleType="sektoradmins"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schooladmins">
          <Card>
            <CardHeader>
              <CardTitle>MəktəbAdmin-lər</CardTitle>
              <CardDescription>
                Məktəb səviyyəsində idarəetməni həyata keçirən rəhbərlər
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable 
                users={schoolAdminsQuery.data} 
                isLoading={schoolAdminsQuery.isLoading}
                roleType="schooladmins"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Müəllimlər</CardTitle>
              <CardDescription>
                Təhsil prosesində iştirak edən müəllimlər və mütəxəssislər
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable 
                users={teachersQuery.data} 
                isLoading={teachersQuery.isLoading}
                roleType="teachers"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
