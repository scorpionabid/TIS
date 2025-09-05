import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Calendar, CheckCircle, Shield, AlertTriangle, Power } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { academicYearService, AcademicYear } from '@/services/academicYears';
import { useToast } from '@/hooks/use-toast';
import { AcademicYearModal } from '@/components/modals/AcademicYearModal';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { az } from 'date-fns/locale';

export default function AcademicYearManagement() {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Security check - only SuperAdmin can access academic year management
  if (!currentUser || currentUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin istifadəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  // Load academic years
  const { data: yearsResponse, isLoading, error } = useQuery({
    queryKey: ['academic-years-management'],
    queryFn: async () => {
      console.log('🔍 AcademicYearManagement: Fetching academic years...');
      try {
        const result = await academicYearService.getAll({ per_page: 50, sort_by: 'start_date', sort_direction: 'desc' });
        console.log('✅ AcademicYearManagement: Fetch successful:', result);
        return result;
      } catch (error) {
        console.error('❌ AcademicYearManagement: Fetch failed:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => academicYearService.delete(id),
    onSuccess: (_, deletedId) => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Təhsil ili uğurla silindi',
      });
      queryClient.invalidateQueries({ queryKey: ['academic-years-management'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Təhsil ili silinərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (id: number) => academicYearService.activate(id),
    onSuccess: (_, activatedId) => {
      toast({
        title: 'Müvəffəqiyyət',
        description: 'Təhsil ili uğurla aktiv edildi',
      });
      queryClient.invalidateQueries({ queryKey: ['academic-years-management'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Təhsil ili aktiv edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    setSelectedYear(null);
    setIsModalOpen(true);
  };

  const handleEdit = (year: AcademicYear) => {
    setSelectedYear(year);
    setIsModalOpen(true);
  };

  const handleDelete = async (year: AcademicYear) => {
    if (window.confirm(`"${year.name}" təhsil ilini silmək istədiyinizdən əminsiniz?`)) {
      deleteMutation.mutate(year.id);
    }
  };

  const handleActivate = async (year: AcademicYear) => {
    if (window.confirm(`"${year.name}" təhsil ilini aktiv etmək istədiyinizdən əminsiniz?`)) {
      activateMutation.mutate(year.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedYear(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy', { locale: az });
    } catch {
      return dateString;
    }
  };

  const years = yearsResponse?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Təhsil illəri yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Xəta</h3>
          <p className="text-muted-foreground">
            Təhsil illəri yüklənərkən xəta baş verdi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Təhsil İlləri İdarəetməsi</h1>
          <p className="text-muted-foreground">
            Təhsil illərini idarə edin, yeni il yaradın və mövcudları redaktə edin
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Təhsil İli
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cəmi Təhsil İlləri</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{years.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Təhsil İli</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {years.filter(year => year.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cari Təhsil İli</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {years.find(year => year.is_active)?.name || 'Yoxdur'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keçmiş İllər</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {years.filter(year => !year.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Academic Years Table */}
      <Card>
        <CardHeader>
          <CardTitle>Təhsil İlləri Siyahısı</CardTitle>
          <CardDescription>
            Mövcud təhsil illərini idarə edin və yenilərini yaradın
          </CardDescription>
        </CardHeader>
        <CardContent>
          {years.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Təhsil ili yoxdur</h3>
              <p className="text-muted-foreground mb-4">
                Yeni təhsil ili yaratmaq üçün "Yeni Təhsil İli" düyməsinə klikləyin
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Təhsil İli Yarat
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adı</TableHead>
                  <TableHead>Başlama Tarixi</TableHead>
                  <TableHead>Bitmə Tarixi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Yaradılma Tarixi</TableHead>
                  <TableHead className="text-right">Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell className="font-medium">
                      {year.name}
                    </TableCell>
                    <TableCell>
                      {formatDate(year.start_date)}
                    </TableCell>
                    <TableCell>
                      {formatDate(year.end_date)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={year.is_active ? "default" : "secondary"}
                        className={year.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {year.is_active ? 'Aktiv' : 'Qeyri-aktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {year.created_at ? formatDate(year.created_at) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!year.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(year)}
                            disabled={activateMutation.isPending}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Power className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(year)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(year)}
                          disabled={deleteMutation.isPending || year.is_active}
                          className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AcademicYearModal
        open={isModalOpen}
        onClose={handleModalClose}
        currentUser={currentUser}
        editingYear={selectedYear}
      />
    </div>
  );
}