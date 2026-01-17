import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { USER_ROLES } from '@/constants/roles';
import {
  Plus,
  Search,
  Link as LinkIcon,
  Video,
  FileText,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Database,
  Building2,
  MapPin,
  AlertCircle,
  Loader2,
  Target,
} from 'lucide-react';
import {
  linkDatabaseService,
  Department,
  SectorOption,
  CreateLinkData,
} from '@/services/linkDatabase';
import { LinkShare } from '@/services/links';

// Link type icons
const LINK_TYPE_ICONS = {
  external: ExternalLink,
  video: Video,
  form: FileText,
  document: FileText,
};

const LINK_TYPE_LABELS = {
  external: 'Xarici Link',
  video: 'Video',
  form: 'Form',
  document: 'Sənəd',
};

export default function LinkDatabase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission, hasAnyRole, currentUser } = useRoleCheck();

  // State
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkShare | null>(null);
  const [formData, setFormData] = useState<CreateLinkData>({
    title: '',
    url: '',
    description: '',
    link_type: 'external',
    is_featured: false,
    target_departments: [],
    target_institutions: [],
  });

  // Permissions
  const canCreate = hasPermission('links.create');
  const canEdit = hasPermission('links.update');
  const canDelete = hasPermission('links.delete');
  const canView = hasPermission('links.read');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch departments from database
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['link-database-departments'],
    queryFn: () => linkDatabaseService.getDepartments(),
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch sectors
  const { data: sectors = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ['link-database-sectors'],
    queryFn: () => linkDatabaseService.getSectors(),
    staleTime: 60 * 1000,
  });

  // Set default tab when departments load
  useEffect(() => {
    if (departments.length > 0 && !activeTab) {
      setActiveTab(departments[0].id.toString());
    }
  }, [departments, activeTab]);

  // Set default sector when sectors load
  useEffect(() => {
    if (sectors.length > 0 && selectedSector === null) {
      setSelectedSector(sectors[0].id);
    }
  }, [sectors, selectedSector]);

  // Check if we're on a department tab or sectors tab
  const isOnSectorsTab = activeTab === 'sectors';
  const currentDepartmentId = !isOnSectorsTab ? parseInt(activeTab) : null;

  // Fetch links for active department tab
  const {
    data: departmentLinks,
    isLoading: isLoadingDepartmentLinks,
    refetch: refetchDepartmentLinks,
  } = useQuery({
    queryKey: ['link-database-department', activeTab, debouncedSearch],
    queryFn: () =>
      linkDatabaseService.getLinksByDepartmentType(activeTab, {
        search: debouncedSearch || undefined,
        per_page: 50,
      }),
    enabled: !!activeTab && !isOnSectorsTab && !isNaN(parseInt(activeTab)),
    staleTime: 30 * 1000,
  });

  // Fetch links for selected sector
  const {
    data: sectorLinks,
    isLoading: isLoadingSectorLinks,
    refetch: refetchSectorLinks,
  } = useQuery({
    queryKey: ['link-database-sector', selectedSector, debouncedSearch],
    queryFn: () =>
      linkDatabaseService.getLinksBySector(selectedSector!, {
        search: debouncedSearch || undefined,
        per_page: 50,
      }),
    enabled: isOnSectorsTab && !!selectedSector,
    staleTime: 30 * 1000,
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (data: CreateLinkData) => {
      if (isOnSectorsTab && selectedSector) {
        return linkDatabaseService.createLinkForSector(selectedSector, data);
      } else if (currentDepartmentId) {
        return linkDatabaseService.createLinkForDepartment(currentDepartmentId.toString(), data);
      }
      throw new Error('Hədəf seçilməyib');
    },
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Link uğurla yaradıldı',
      });
      queryClient.invalidateQueries({ queryKey: ['link-database-department'] });
      queryClient.invalidateQueries({ queryKey: ['link-database-sector'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link yaradılarkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Update link mutation
  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateLinkData> }) => {
      return linkDatabaseService.updateLink(id, data);
    },
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Link uğurla yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['link-database-department'] });
      queryClient.invalidateQueries({ queryKey: ['link-database-sector'] });
      setIsEditModalOpen(false);
      setSelectedLink(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      return linkDatabaseService.deleteLink(id);
    },
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Link uğurla silindi',
      });
      queryClient.invalidateQueries({ queryKey: ['link-database-department'] });
      queryClient.invalidateQueries({ queryKey: ['link-database-sector'] });
      setIsDeleteModalOpen(false);
      setSelectedLink(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.message || 'Link silinərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      url: '',
      description: '',
      link_type: 'external',
      is_featured: false,
      target_departments: [],
      target_institutions: [],
    });
  }, []);

  // Handle create - auto-select current department/sector
  const handleCreate = useCallback(() => {
    // Pre-select current department or sector
    const initialDepartments: number[] = [];
    const initialSectors: number[] = [];

    if (isOnSectorsTab && selectedSector) {
      initialSectors.push(selectedSector);
    } else if (currentDepartmentId) {
      initialDepartments.push(currentDepartmentId);
    }

    setFormData({
      title: '',
      url: '',
      description: '',
      link_type: 'external',
      is_featured: false,
      target_departments: initialDepartments,
      target_institutions: initialSectors,
    });
    setIsCreateModalOpen(true);
  }, [isOnSectorsTab, selectedSector, currentDepartmentId]);

  // Handle edit
  const handleEdit = useCallback((link: LinkShare) => {
    setSelectedLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      link_type: link.link_type,
      is_featured: link.is_featured,
      target_departments: link.target_departments || [],
      target_institutions: link.target_institutions || [],
    });
    setIsEditModalOpen(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback((link: LinkShare) => {
    setSelectedLink(link);
    setIsDeleteModalOpen(true);
  }, []);

  // Submit create
  const submitCreate = useCallback(() => {
    if (!formData.title || !formData.url) {
      toast({
        title: 'Xəta',
        description: 'Başlıq və URL tələb olunur',
        variant: 'destructive',
      });
      return;
    }
    createLinkMutation.mutate(formData);
  }, [formData, createLinkMutation, toast]);

  // Submit edit
  const submitEdit = useCallback(() => {
    if (!selectedLink || !formData.title || !formData.url) {
      toast({
        title: 'Xəta',
        description: 'Başlıq və URL tələb olunur',
        variant: 'destructive',
      });
      return;
    }
    updateLinkMutation.mutate({ id: selectedLink.id, data: formData });
  }, [selectedLink, formData, updateLinkMutation, toast]);

  // Submit delete
  const submitDelete = useCallback(() => {
    if (!selectedLink) return;
    deleteLinkMutation.mutate(selectedLink.id);
  }, [selectedLink, deleteLinkMutation]);

  // Current links data
  const currentLinks = useMemo(() => {
    const links = isOnSectorsTab
      ? sectorLinks?.data || []
      : departmentLinks?.data || [];

    if (import.meta.env?.DEV) {
      console.log('[LinkDatabase] currentLinks updated:', {
        activeTab,
        isOnSectorsTab,
        departmentLinksData: departmentLinks,
        sectorLinksData: sectorLinks,
        currentLinks: links,
        linksCount: links.length,
      });
    }

    return links;
  }, [isOnSectorsTab, departmentLinks, sectorLinks, activeTab]);

  const isLoadingLinks = isOnSectorsTab ? isLoadingSectorLinks : isLoadingDepartmentLinks;

  // Get current tab label
  const getCurrentTabLabel = useCallback(() => {
    if (isOnSectorsTab) {
      const sector = sectors.find((s) => s.id === selectedSector);
      return sector?.name || 'Sektorlar';
    }
    const dept = departments.find((d) => d.id.toString() === activeTab);
    return dept?.name || activeTab;
  }, [activeTab, isOnSectorsTab, selectedSector, sectors, departments]);

  // Permission check
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu bölmədən istifadə etmək üçün səlahiyyətiniz yoxdur.
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if there are no departments
  if (departments.length === 0 && sectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Heç bir departament və ya sektor tapılmadı</h3>
          <p className="text-muted-foreground">
            Sistem administratoru ilə əlaqə saxlayın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Link Bazası
          </h1>
          <p className="text-muted-foreground mt-1">
            Departamentlər və sektorlar üzrə linkləri idarə edin
          </p>
        </div>

        {canCreate && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Link
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Linklərdə axtar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {departments.map((dept) => (
            <TabsTrigger
              key={dept.id}
              value={dept.id.toString()}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              {dept.name}
            </TabsTrigger>
          ))}
          {sectors.length > 0 && (
            <TabsTrigger value="sectors" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Sektorlar
            </TabsTrigger>
          )}
        </TabsList>

        {/* Department Tabs Content */}
        {departments.map((dept) => (
          <TabsContent key={dept.id} value={dept.id.toString()} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dept.name} Linkləri</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchDepartmentLinks()}
                    disabled={isLoadingDepartmentLinks}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoadingDepartmentLinks ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <LinkTable
                  links={currentLinks}
                  isLoading={isLoadingLinks}
                  onEdit={canEdit ? handleEdit : undefined}
                  onDelete={canDelete ? handleDelete : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Sectors Tab Content */}
        {sectors.length > 0 && (
          <TabsContent value="sectors" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Sektor Linkləri</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedSector?.toString() || ''}
                      onValueChange={(v) => setSelectedSector(Number(v))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Sektor seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id.toString()}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchSectorLinks()}
                      disabled={isLoadingSectorLinks}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isLoadingSectorLinks ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedSector ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Zəhmət olmasa bir sektor seçin
                  </div>
                ) : (
                  <LinkTable
                    links={currentLinks}
                    isLoading={isLoadingLinks}
                    onEdit={canEdit ? handleEdit : undefined}
                    onDelete={canDelete ? handleDelete : undefined}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Link Yarat</DialogTitle>
            <DialogDescription>
              {getCurrentTabLabel()} üçün yeni link əlavə edin
            </DialogDescription>
          </DialogHeader>
          <LinkForm
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            sectors={sectors}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={createLinkMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button onClick={submitCreate} disabled={createLinkMutation.isPending}>
              {createLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Yarat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Linki Redaktə Et</DialogTitle>
            <DialogDescription>Link məlumatlarını yeniləyin</DialogDescription>
          </DialogHeader>
          <LinkForm
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            sectors={sectors}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateLinkMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button onClick={submitEdit} disabled={updateLinkMutation.isPending}>
              {updateLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Yadda Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Linki Sil</DialogTitle>
            <DialogDescription>
              "{selectedLink?.title}" linkini silmək istədiyinizə əminsiniz? Bu
              əməliyyat geri alına bilməz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLinkMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={deleteLinkMutation.isPending}
            >
              {deleteLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Link Form Component with Target Selection
interface LinkFormProps {
  formData: CreateLinkData;
  setFormData: React.Dispatch<React.SetStateAction<CreateLinkData>>;
  departments: Department[];
  sectors: SectorOption[];
}

function LinkForm({ formData, setFormData, departments, sectors }: LinkFormProps) {
  // Toggle department selection
  const toggleDepartment = (deptId: number) => {
    setFormData((prev) => {
      const currentDepts = prev.target_departments || [];
      if (currentDepts.includes(deptId)) {
        return {
          ...prev,
          target_departments: currentDepts.filter((id) => id !== deptId),
        };
      } else {
        return {
          ...prev,
          target_departments: [...currentDepts, deptId],
        };
      }
    });
  };

  // Toggle sector selection
  const toggleSector = (sectorId: number) => {
    setFormData((prev) => {
      const currentSectors = prev.target_institutions || [];
      if (currentSectors.includes(sectorId)) {
        return {
          ...prev,
          target_institutions: currentSectors.filter((id) => id !== sectorId),
        };
      } else {
        return {
          ...prev,
          target_institutions: [...currentSectors, sectorId],
        };
      }
    });
  };

  return (
    <div className="space-y-4 py-4">
      {/* Basic Info */}
      <div className="space-y-2">
        <Label htmlFor="title">Başlıq *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Link başlığı"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL *</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Təsvir</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Link haqqında qısa məlumat"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="link_type">Link Növü</Label>
        <Select
          value={formData.link_type}
          onValueChange={(v) =>
            setFormData((prev) => ({
              ...prev,
              link_type: v as 'external' | 'video' | 'form' | 'document',
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">Xarici Link</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="document">Sənəd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_featured"
          checked={formData.is_featured}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, is_featured: !!checked }))
          }
        />
        <Label htmlFor="is_featured" className="cursor-pointer">
          Seçilmiş link kimi göstər
        </Label>
      </div>

      <Separator className="my-4" />

      {/* Target Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-medium">Hədəf Seçimi</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Bu linkin hansı departament və sektorlara göstəriləcəyini seçin
        </p>

        {/* Department Selection */}
        {departments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departamentlər
            </Label>
            <ScrollArea className="h-[120px] border rounded-md p-3">
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`dept-${dept.id}`}
                      checked={(formData.target_departments || []).includes(dept.id)}
                      onCheckedChange={() => toggleDepartment(dept.id)}
                    />
                    <Label
                      htmlFor={`dept-${dept.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {dept.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {(formData.target_departments?.length || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.target_departments?.length} departament seçildi
              </p>
            )}
          </div>
        )}

        {/* Sector Selection */}
        {sectors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Sektorlar
            </Label>
            <ScrollArea className="h-[120px] border rounded-md p-3">
              <div className="space-y-2">
                {sectors.map((sector) => (
                  <div key={sector.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`sector-${sector.id}`}
                      checked={(formData.target_institutions || []).includes(sector.id)}
                      onCheckedChange={() => toggleSector(sector.id)}
                    />
                    <Label
                      htmlFor={`sector-${sector.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {sector.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {(formData.target_institutions?.length || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.target_institutions?.length} sektor seçildi
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Link Table Component
interface LinkTableProps {
  links: LinkShare[];
  isLoading: boolean;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
}

function LinkTable({ links, isLoading, onEdit, onDelete }: LinkTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!links.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Bu bölmədə heç bir link yoxdur</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Başlıq</TableHead>
            <TableHead>Növ</TableHead>
            <TableHead>Yaradıcı</TableHead>
            <TableHead className="text-center">Kliklər</TableHead>
            <TableHead className="text-right">Əməliyyatlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => {
            const TypeIcon = LINK_TYPE_ICONS[link.link_type] || ExternalLink;
            return (
              <TableRow key={link.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {link.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {link.description && (
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {link.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <TypeIcon className="h-3 w-3" />
                    {LINK_TYPE_LABELS[link.link_type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {link.sharedBy?.first_name} {link.sharedBy?.last_name}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{link.click_count}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(link)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Redaktə et
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(link)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
