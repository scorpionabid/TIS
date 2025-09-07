import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Settings, Eye, Shield } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionService, InstitutionType } from '@/services/institutions';
import { useToast } from '@/hooks/use-toast';
import { InstitutionTypeModal } from '@/components/modals/InstitutionTypeModal';

export default function InstitutionTypesManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InstitutionType | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'hierarchy'>('table');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load institution types
  const { data: typesResponse, isLoading, error } = useQuery({
    queryKey: ['institution-types-management'],
    queryFn: async () => {
      console.log('🔍 InstitutionTypesManagement: Fetching institution types...');
      try {
        const result = await institutionService.getInstitutionTypes({ include_inactive: true });
        console.log('✅ InstitutionTypesManagement: Fetch successful:', result);
        return result;
      } catch (error) {
        console.error('❌ InstitutionTypesManagement: Fetch failed:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack'
        });
        throw error;
      }
    },
  });

  // Load hierarchy
  const { data: hierarchyResponse } = useQuery({
    queryKey: ['institution-types-hierarchy'],
    queryFn: () => institutionService.getInstitutionTypesHierarchy(),
    enabled: viewMode === 'hierarchy',
  });

  const institutionTypes = typesResponse?.institution_types || [];
  const hierarchy = hierarchyResponse?.hierarchy || [];

  const handleOpenModal = (type?: InstitutionType) => {
    setSelectedType(type || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
  };

  const handleSave = async (data: Partial<InstitutionType>) => {
    try {
      if (selectedType) {
        await institutionService.updateInstitutionType(selectedType.id, data);
        toast({
          title: "Müəssisə növü yeniləndi",
          description: "Müəssisə növü məlumatları uğurla yeniləndi.",
        });
      } else {
        await institutionService.createInstitutionType(data);
        toast({
          title: "Müəssisə növü əlavə edildi",
          description: "Yeni müəssisə növü uğurla yaradıldı.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['institution-types-management'] });
      await queryClient.invalidateQueries({ queryKey: ['institution-types-hierarchy'] });
      await queryClient.invalidateQueries({ queryKey: ['institution-types'] });
      handleCloseModal();
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: error instanceof Error ? error.message : "Əməliyyat zamanı problem yarandı.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDelete = async (type: InstitutionType) => {
    if (!confirm(`"${type.label_az}" müəssisə növünü silmək istədiyinizdən əminsiniz?`)) {
      return;
    }

    try {
      await institutionService.deleteInstitutionType(type.id);
      toast({
        title: "Müəssisə növü silindi",
        description: "Müəssisə növü uğurla silindi.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['institution-types-management'] });
      await queryClient.invalidateQueries({ queryKey: ['institution-types'] });
    } catch (error) {
      toast({
        title: "Silinə bilmədi",
        description: error instanceof Error ? error.message : "Müəssisə növü silinərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  };

  const getLevelBadge = (level: number) => {
    const colors = {
      1: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      2: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      3: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      4: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    
    return (
      <Badge className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Səviyyə {level}
      </Badge>
    );
  };

  const getSystemBadge = (isSystem: boolean) => (
    <Badge variant={isSystem ? 'destructive' : 'secondary'}>
      {isSystem ? (
        <>
          <Shield className="h-3 w-3 mr-1" />
          Sistem
        </>
      ) : (
        'Fərdi'
      )}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Müəssisə Növləri İdarəetmə</h1>
            <p className="text-muted-foreground">Sistem müəssisə növlərini idarə edin</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-48 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Müəssisə növləri yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Müəssisə Növləri İdarəetmə</h1>
          <p className="text-muted-foreground">
            Sistem müəssisə növlərini idarə edin və yenilərini əlavə edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Cədvəl
          </Button>
          <Button
            variant={viewMode === 'hierarchy' ? 'default' : 'outline'}  
            size="sm"
            onClick={() => setViewMode('hierarchy')}
          >
            İyerarxiya
          </Button>
          <Button className="flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" />
            Yeni Növ
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Növlər</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{institutionTypes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistem Növləri</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {institutionTypes.filter(t => t.is_system).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Növlər</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {institutionTypes.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fərdi Növlər</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {institutionTypes.filter(t => !t.is_system).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle>Müəssisə Növləri</CardTitle>
            <CardDescription>
              Bütün sistem və fərdi müəssisə növləri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Növ</TableHead>
                    <TableHead>Açar</TableHead>
                    <TableHead>Səviyyə</TableHead>
                    <TableHead>Ana Növlər</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutionTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          <div>
                            <div className="font-medium">{type.label_az}</div>
                            {type.description && (
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {type.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {type.key}
                        </code>
                      </TableCell>
                      <TableCell>{getLevelBadge(type.default_level)}</TableCell>
                      <TableCell>
                        {type.allowed_parent_types.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {type.allowed_parent_types.slice(0, 2).map((parentKey) => (
                              <Badge key={parentKey} variant="outline" className="text-xs">
                                {parentKey}
                              </Badge>
                            ))}
                            {type.allowed_parent_types.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{type.allowed_parent_types.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? 'Aktiv' : 'Deaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getSystemBadge(type.is_system)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(type)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!type.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(type)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hierarchy View */}
      {viewMode === 'hierarchy' && (
        <Card>
          <CardHeader>
            <CardTitle>Müəssisə Növləri İyerarxiyası</CardTitle>
            <CardDescription>
              Səviyyələrə görə təşkil olunmuş müəssisə növləri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {hierarchy.map((level: any) => (
                <div key={level.level} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Səviyyə {level.level}</h3>
                    <Badge variant="outline">{level.types.length} növ</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {level.types.map((type: any) => (
                      <Card key={type.key} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: type.color }}
                              />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <code className="text-xs text-muted-foreground">{type.key}</code>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {type.institutions_count} müəssisə
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Ana növlər: {type.allowed_parent_types.length > 0 
                              ? type.allowed_parent_types.join(', ') 
                              : 'Yoxdur'
                            }
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <InstitutionTypeModal
        open={isModalOpen}
        onClose={handleCloseModal}
        institutionType={selectedType}
        onSave={handleSave}
      />
    </div>
  );
}