import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search,
  Filter,
  Loader2,
  Globe,
  School,
  FileText,
  Award,
  MoreHorizontal,
  Edit,
  Trash2,
  Power
} from "lucide-react";
import { assessmentTypeService, AssessmentType, AssessmentTypeFilters } from '@/services/assessmentTypes';
import { useToast } from '@/hooks/use-toast';
import AssessmentTypeModal from '@/components/modals/AssessmentTypeModal';
// import { QuickAuth } from '@/components/auth/QuickAuth';

export default function AssessmentTypes() {
  const [filters, setFilters] = useState<AssessmentTypeFilters>({
    per_page: 15
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | undefined>();

  const { toast } = useToast();

  // Fetch assessment types data
  const { data: assessmentTypes, isLoading, error, refetch } = useQuery({
    queryKey: ['assessment-types', filters],
    queryFn: () => assessmentTypeService.getAssessmentTypes(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof AssessmentTypeFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handleClearFilters = () => {
    setFilters({ per_page: 15 });
    setSearchTerm('');
  };

  // Assessment Type handlers
  const handleCreateAssessmentType = () => {
    setSelectedAssessmentType(undefined);
    setIsModalOpen(true);
  };

  const handleEditAssessmentType = (assessmentType: AssessmentType) => {
    setSelectedAssessmentType(assessmentType);
    setIsModalOpen(true);
  };

  const handleAssessmentTypeSuccess = () => {
    refetch();
    toast({
      title: 'Uğurlu əməliyyat',
      description: 'Assessment type uğurla saxlanıldı.',
    });
  };

  const handleDeleteAssessmentType = async (id: number) => {
    try {
      await assessmentTypeService.deleteAssessmentType(id);
      refetch();
      toast({
        title: 'Silindi',
        description: 'Assessment type uğurla silindi.',
      });
    } catch (error: any) {
      toast({
        title: 'Silmə xətası',
        description: error.message || 'Assessment type silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAssessmentTypeStatus = async (id: number) => {
    try {
      await assessmentTypeService.toggleAssessmentTypeStatus(id);
      refetch();
      toast({
        title: 'Status dəyişildi',
        description: 'Assessment type statusu uğurla dəyişildi.',
      });
    } catch (error: any) {
      toast({
        title: 'Status dəyişikliyi xətası',
        description: error.message || 'Status dəyişərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Qiymətləndirmə növləri yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Assessment types fetch error:', error);
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Xəta baş verdi</h3>
              <p className="text-muted-foreground">Qiymətləndirmə növləri yüklənərkən problem yarandı.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {error instanceof Error ? error.message : 'Bilinməyən xəta'}
              </p>
            </div>
            <Button onClick={() => refetch()}>Yenidən cəhd et</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* <QuickAuth /> */}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmə Növləri</h1>
          <p className="text-muted-foreground">KSQ, BSQ və xüsusi qiymətləndirmə növlərini idarə edin</p>
        </div>
        <Button onClick={handleCreateAssessmentType}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Qiymətləndirmə Növü
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filterləmə</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Axtarış</Label>
              <div className="flex space-x-2">
                <Input
                  id="search"
                  placeholder="Ad və ya təsvir üzrə axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="icon" variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Kateqoriya</Label>
              <Select 
                value={filters.category || 'all'} 
                onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="ksq">KSQ</SelectItem>
                  <SelectItem value="bsq">BSQ</SelectItem>
                  <SelectItem value="custom">Xüsusi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.is_active === undefined ? 'all' : filters.is_active.toString()} 
                onValueChange={(value) => handleFilterChange('is_active', value === 'all' ? undefined : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="true">Aktiv</SelectItem>
                  <SelectItem value="false">Deaktiv</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                Təmizlə
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Types Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Qiymətləndirmə Növləri</span>
          </CardTitle>
          <CardDescription>
            Ümumi {assessmentTypes?.total || 0} qiymətləndirmə növü
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessmentTypes?.data && assessmentTypes.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Kateqoriya</TableHead>
                  <TableHead>Maksimum Bal</TableHead>
                  <TableHead>Qiymətləndirmə Metodu</TableHead>
                  <TableHead>Təşkilat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Yaradılma Tarixi</TableHead>
                  <TableHead>Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessmentTypes.data.map((assessmentType) => (
                  <TableRow key={assessmentType.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assessmentType.name}</p>
                        {assessmentType.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {assessmentType.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        assessmentType.category === 'ksq' ? 'default' :
                        assessmentType.category === 'bsq' ? 'secondary' : 'outline'
                      }>
                        {assessmentType.category_label}
                      </Badge>
                    </TableCell>
                    <TableCell>{assessmentType.max_score}</TableCell>
                    <TableCell>{assessmentType.scoring_method_label}</TableCell>
                    <TableCell>
                      {assessmentType.institution ? (
                        <div className="flex items-center space-x-1">
                          <School className="h-3 w-3" />
                          <span className="text-sm">{assessmentType.institution.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span className="text-sm">Sistem geneli</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <div 
                          className={`h-3 w-3 rounded-full ${
                            assessmentType.is_active ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          title={assessmentType.is_active ? 'Aktiv' : 'Deaktiv'}
                          aria-label={assessmentType.is_active ? 'Aktiv' : 'Deaktiv'}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(assessmentType.created_at).toLocaleDateString('az-AZ')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Əməliyyatlar</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleEditAssessmentType(assessmentType)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Redaktə et</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleAssessmentTypeStatus(assessmentType.id)}
                              className="cursor-pointer"
                            >
                              {assessmentType.is_active ? (
                                <>
                                  <Power className="mr-2 h-4 w-4 text-yellow-600" />
                                  <span>Deaktiv et</span>
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4 text-green-600" />
                                  <span>Aktiv et</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteAssessmentType(assessmentType.id)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Sil</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Hələ qiymətləndirmə növü yaradılmayıb</p>
              <Button onClick={handleCreateAssessmentType} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                İlk Qiymətləndirmə Növünü Yarat
              </Button>
            </div>
          )}

          {/* Pagination */}
          {assessmentTypes && assessmentTypes.last_page > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-muted-foreground">
                {assessmentTypes.from}-{assessmentTypes.to} / {assessmentTypes.total} qeyd
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assessmentTypes.current_page === 1}
                  onClick={() => handleFilterChange('page', assessmentTypes.current_page - 1)}
                >
                  Əvvəlki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={assessmentTypes.current_page === assessmentTypes.last_page}
                  onClick={() => handleFilterChange('page', assessmentTypes.current_page + 1)}
                >
                  Növbəti
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Type Modal */}
      <AssessmentTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assessmentType={selectedAssessmentType}
        onSuccess={handleAssessmentTypeSuccess}
      />
    </div>
  );
}