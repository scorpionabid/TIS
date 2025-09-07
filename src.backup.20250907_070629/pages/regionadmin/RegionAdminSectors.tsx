import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building, 
  Plus, 
  Search, 
  MapPin, 
  Users,
  School,
  TrendingUp,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickAuth } from '@/components/auth/QuickAuth';

interface Sector {
  id: number;
  name: string;
  code: string;
  location: string;
  admin_name?: string;
  admin_email?: string;
  total_schools: number;
  total_users: number;
  performance_score: number;
  status: 'active' | 'inactive';
  created_at: string;
  last_updated: string;
}

export default function RegionAdminSectors() {
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();

  // Fetch regional sectors
  const { data: sectors, isLoading, error } = useQuery({
    queryKey: ['regionadmin-sectors', currentUser?.institution_id],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockSectors: Sector[] = [
        {
          id: 1,
          name: 'Bakı Şəhər Təhsil Şöbəsi',
          code: 'BAK001',
          location: 'Bakı şəhəri',
          admin_name: 'Leyla Əhmədova',
          admin_email: 'leyla.ahmedova@edu.gov.az',
          total_schools: 45,
          total_users: 234,
          performance_score: 87,
          status: 'active',
          created_at: '2025-01-15T09:00:00',
          last_updated: '2025-08-13T14:30:00'
        },
        {
          id: 2,
          name: 'Sumqayıt Şəhər Təhsil Şöbəsi',
          code: 'SUM001',
          location: 'Sumqayıt şəhəri',
          admin_name: 'Rəşad Qasımov',
          admin_email: 'reshad.qasimov@edu.gov.az',
          total_schools: 28,
          total_users: 156,
          performance_score: 92,
          status: 'active',
          created_at: '2025-01-20T10:00:00',
          last_updated: '2025-08-13T11:15:00'
        },
        {
          id: 3,
          name: 'Abşeron Rayon Təhsil Şöbəsi',
          code: 'ABS001',
          location: 'Abşeron rayonu',
          admin_name: 'Gülnar Məmmədova',
          admin_email: 'gulnar.mammadova@edu.gov.az',
          total_schools: 18,
          total_users: 89,
          performance_score: 79,
          status: 'active',
          created_at: '2025-01-25T08:30:00',
          last_updated: '2025-08-12T16:45:00'
        }
      ];
      return mockSectors;
    },
    staleTime: 1000 * 60 * 5,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Aktiv</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-700">Qeyri-aktiv</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter sectors based on search term
  const filteredSectors = sectors?.filter(sector =>
    sector.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sector.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sector.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sector.admin_name && sector.admin_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <QuickAuth />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sektor İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Regional səviyyədə sektorların idarə edilməsi və monitorinqi
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Sektor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi Sektorlar</p>
                <p className="text-3xl font-bold text-blue-600">{sectors?.length || 0}</p>
              </div>
              <Building className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi Məktəblər</p>
                <p className="text-3xl font-bold text-green-600">
                  {sectors?.reduce((sum, sector) => sum + sector.total_schools, 0) || 0}
                </p>
              </div>
              <School className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ümumi İstifadəçilər</p>
                <p className="text-3xl font-bold text-purple-600">
                  {sectors?.reduce((sum, sector) => sum + sector.total_users, 0) || 0}
                </p>
              </div>
              <Users className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orta Performans</p>
                <p className="text-3xl font-bold text-teal-600">
                  {sectors && sectors.length > 0
                    ? Math.round(sectors.reduce((sum, sector) => sum + sector.performance_score, 0) / sectors.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Sektor adı, kodu, yeri və ya administratoru axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sectors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sektorlar</CardTitle>
          <CardDescription>
            Regional səviyyədəki bütün sektorların siyahısı və məlumatları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse space-y-4 w-full">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Sektorları yükləyərkən xəta baş verdi.</p>
            </div>
          ) : filteredSectors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sektor</TableHead>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Məktəblər</TableHead>
                  <TableHead>İstifadəçilər</TableHead>
                  <TableHead>Performans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Son Yeniləmə</TableHead>
                  <TableHead>Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSectors.map((sector) => (
                  <TableRow key={sector.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sector.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {sector.location}
                        </div>
                        <p className="text-xs text-muted-foreground">Kod: {sector.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sector.admin_name ? (
                        <div>
                          <p className="font-medium">{sector.admin_name}</p>
                          <p className="text-sm text-muted-foreground">{sector.admin_email}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Təyin edilməyib</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <School className="h-4 w-4 mr-1 text-muted-foreground" />
                        {sector.total_schools}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {sector.total_users}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getPerformanceColor(sector.performance_score)}`}>
                        {sector.performance_score}%
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(sector.status)}</TableCell>
                    <TableCell>
                      {new Date(sector.last_updated).toLocaleDateString('az-AZ')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sektor tapılmadı</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Axtarış kriteriyalarına uyğun sektor tapılmadı.'
                  : 'Hələ ki sektor əlavə edilməyib.'
                }
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                İlk Sektoru Əlavə Et
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}