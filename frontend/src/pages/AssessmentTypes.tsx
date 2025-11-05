import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  Layers3,
  ListChecks,
  ClipboardList
} from "lucide-react";
import {
  assessmentTypeService,
  AssessmentType,
  AssessmentTypeFilters,
  AssessmentStage,
  AssessmentResultField
} from '@/services/assessmentTypes';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import AssessmentTypeModal from '@/components/modals/AssessmentTypeModal';

const defaultStageForm: Partial<AssessmentStage> = {
  name: '',
  roman_numeral: '',
  description: '',
  display_order: 1,
  is_active: true,
};

const defaultResultFieldForm: Partial<AssessmentResultField> = {
  label: '',
  field_key: '',
  input_type: 'number',
  scope: 'class',
  aggregation: 'sum',
  is_required: false,
  display_order: 1,
};

export default function AssessmentTypes() {
  const [filters, setFilters] = useState<AssessmentTypeFilters>({ per_page: 15 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | undefined>();
  const [activeTab, setActiveTab] = useState<'types' | 'stages' | 'resultFields'>('types');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<AssessmentStage | null>(null);
  const [stageForm, setStageForm] = useState<Partial<AssessmentStage>>(defaultStageForm);

  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<AssessmentResultField | null>(null);
  const [fieldForm, setFieldForm] = useState<Partial<AssessmentResultField>>(defaultResultFieldForm);

  const { toast } = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const hasAccess = hasRole(['superadmin', 'regionadmin']);

  const { data: assessmentTypes, isLoading, error, refetch } = useQuery({
    queryKey: ['assessment-types', filters],
    queryFn: () => assessmentTypeService.getAssessmentTypes(filters),
    staleTime: 1000 * 60 * 5,
    enabled: hasAccess,
  });

  const typeOptions = useMemo(() => {
    if (!assessmentTypes?.data) return [];
    return assessmentTypes.data.map(type => ({ value: type.id, label: type.name }));
  }, [assessmentTypes]);

  useEffect(() => {
    if (!selectedTypeId && typeOptions.length > 0) {
      setSelectedTypeId(typeOptions[0].value);
    }
  }, [selectedTypeId, typeOptions]);

  const { data: stages, isLoading: stagesLoading, error: stagesError } = useQuery({
    queryKey: ['assessment-stages', selectedTypeId],
    queryFn: () => assessmentTypeService.getStages(selectedTypeId!),
    enabled: activeTab === 'stages' && !!selectedTypeId,
    staleTime: 0,
  });

  const { data: resultFields, isLoading: fieldsLoading, error: fieldsError } = useQuery({
    queryKey: ['assessment-result-fields', selectedTypeId],
    queryFn: () => assessmentTypeService.getResultFields(selectedTypeId!),
    enabled: activeTab === 'resultFields' && !!selectedTypeId,
    staleTime: 0,
  });

  const ALL_VALUE = 'all';

  const handleFilterChange = (key: keyof AssessmentTypeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ per_page: 15 });
    setSearchTerm('');
  };

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
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'assessment-result-fields' || key === 'assessment-stages';
      }
    });
    toast({
      title: 'Uğurlu əməliyyat',
      description: 'Qiymətləndirmə növü uğurla saxlanıldı.',
    });
  };

  const handleDeleteAssessmentType = async (id: number) => {
    try {
      await assessmentTypeService.deleteAssessmentType(id);
      refetch();
      toast({ title: 'Silindi', description: 'Qiymətləndirmə növü silindi.' });
    } catch (err: any) {
      toast({
        title: 'Silmə xətası',
        description: err.message || 'Qiymətləndirmə növü silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAssessmentTypeStatus = async (id: number) => {
    try {
      await assessmentTypeService.toggleAssessmentTypeStatus(id);
      refetch();
      toast({ title: 'Status dəyişildi', description: 'Qiymətləndirmə növü aktivliyi yeniləndi.' });
    } catch (err: any) {
      toast({
        title: 'Status xətası',
        description: err.message || 'Status dəyişdirilərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const openStageModal = (stage?: AssessmentStage) => {
    if (stage) {
      setEditingStage(stage);
      setStageForm({
        name: stage.name,
        roman_numeral: stage.roman_numeral ?? '',
        description: stage.description ?? '',
        display_order: stage.display_order,
        is_active: stage.is_active,
      });
    } else {
      setEditingStage(null);
      setStageForm(defaultStageForm);
    }
    setStageModalOpen(true);
  };

  const submitStageForm = async () => {
    if (!selectedTypeId) return;

    try {
      const payload = {
        name: stageForm.name,
        roman_numeral: stageForm.roman_numeral || null,
        description: stageForm.description || null,
        display_order: stageForm.display_order ?? 1,
        is_active: stageForm.is_active ?? true,
      };

      if (editingStage) {
        await assessmentTypeService.updateStage(selectedTypeId, editingStage.id, payload);
        toast({ title: 'Mərhələ yeniləndi', description: `${payload.name} məlumatları saxlanıldı.` });
      } else {
        await assessmentTypeService.createStage(selectedTypeId, payload);
        toast({ title: 'Yeni mərhələ', description: `${payload.name} əlavə edildi.` });
      }

      setStageModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assessment-stages', selectedTypeId] });
    } catch (err: any) {
      toast({
        title: 'Mərhələ saxlanılmadı',
        description: err.message || 'Məlumatı saxlayarkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const confirmStageDelete = async (stage: AssessmentStage) => {
    if (!selectedTypeId) return;
    const confirmed = window.confirm(`${stage.name} mərhələsini silmək istəyirsiniz?`);
    if (!confirmed) return;

    try {
      await assessmentTypeService.deleteStage(selectedTypeId, stage.id);
      toast({ title: 'Mərhələ silindi', description: `${stage.name} uğurla silindi.` });
      queryClient.invalidateQueries({ queryKey: ['assessment-stages', selectedTypeId] });
    } catch (err: any) {
      toast({
        title: 'Silmə xətası',
        description: err.message || 'Mərhələ silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const openFieldModal = (field?: AssessmentResultField) => {
    if (field) {
      setEditingField(field);
      setFieldForm({
        label: field.label,
        field_key: field.field_key,
        input_type: field.input_type,
        scope: field.scope,
        aggregation: field.aggregation,
        is_required: field.is_required,
        display_order: field.display_order,
      });
    } else {
      setEditingField(null);
      setFieldForm(defaultResultFieldForm);
    }
    setFieldModalOpen(true);
  };

  const submitFieldForm = async () => {
    if (!selectedTypeId) return;

    try {
      const payload = {
        label: fieldForm.label,
        field_key: fieldForm.field_key || undefined,
        input_type: fieldForm.input_type ?? 'number',
        scope: fieldForm.scope ?? 'class',
        aggregation: fieldForm.aggregation ?? 'sum',
        is_required: fieldForm.is_required ?? false,
        display_order: fieldForm.display_order ?? 1,
      };

      if (editingField) {
        await assessmentTypeService.updateResultField(selectedTypeId, editingField.id, payload);
        toast({ title: 'Sahə yeniləndi', description: `${payload.label} məlumatları saxlanıldı.` });
      } else {
        await assessmentTypeService.createResultField(selectedTypeId, payload);
        toast({ title: 'Yeni sahə', description: `${payload.label} əlavə edildi.` });
      }

      setFieldModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assessment-result-fields', selectedTypeId] });
    } catch (err: any) {
      toast({
        title: 'Saxlama xətası',
        description: err.message || 'Sahə saxlanılarkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  const confirmFieldDelete = async (field: AssessmentResultField) => {
    if (!selectedTypeId) return;
    const confirmed = window.confirm(`${field.label} sahəsini silmək istəyirsiniz?`);
    if (!confirmed) return;

    try {
      await assessmentTypeService.deleteResultField(selectedTypeId, field.id);
      toast({ title: 'Sahə silindi', description: `${field.label} uğurla silindi.` });
      queryClient.invalidateQueries({ queryKey: ['assessment-result-fields', selectedTypeId] });
    } catch (err: any) {
      toast({
        title: 'Silmə xətası',
        description: err.message || 'Sahə silinərkən problem yarandı.',
        variant: 'destructive',
      });
    }
  };

  if (!hasAccess) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Giriş icazəsi yoxdur</h3>
              <p className="text-muted-foreground">Bu səhifəyə yalnız SuperAdmin və RegionAdmin rolları daxil ola bilər.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Qiymətləndirmə strukturu yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Xəta baş verdi</h3>
              <p className="text-muted-foreground">Qiymətləndirmə məlumatları yüklənərkən problem yarandı.</p>
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
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Qiymətləndirmə Konfiqurasiyası</h1>
          <p className="text-muted-foreground">Növ, mərhələ və nəticə göstəricilərini idarə edin</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="types" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Növlər
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Layers3 className="h-4 w-4" />
            Mərhələlər
          </TabsTrigger>
          <TabsTrigger value="resultFields" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Nəticə sahələri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="pt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Qiymətləndirmə Növləri</span>
                <Button onClick={handleCreateAssessmentType}>
                  <Plus className="h-4 w-4 mr-2" />Yeni Növ
                </Button>
              </CardTitle>
              <CardDescription>Region üzrə istifadə ediləcək qiymətləndirmə kateqoriyalarını yaradın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>Axtarış</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ad və ya təsvir"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <Button onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Kateqoriya</Label>
                  <Select
                    value={filters.category ?? ALL_VALUE}
                    onValueChange={(value) =>
                      handleFilterChange('category', value === ALL_VALUE ? undefined : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hamısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Hamısı</SelectItem>
                      {assessmentTypeService.getCategories().map(item => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={
                      filters.is_active === undefined ? ALL_VALUE : String(filters.is_active)
                    }
                    onValueChange={(value) =>
                      handleFilterChange(
                        'is_active',
                        value === ALL_VALUE ? undefined : value === 'true'
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hamısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Hamısı</SelectItem>
                      <SelectItem value="true">Aktiv</SelectItem>
                      <SelectItem value="false">Deaktiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClearFilters}>
                  <Filter className="h-4 w-4 mr-2" /> Filtrləri sıfırla
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>Kateqoriya</TableHead>
                      <TableHead>Təyinat</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Əməliyyatlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentTypes?.data?.map(type => (
                      <TableRow key={type.id}>
                        <TableCell>
                          <div className="font-semibold">{type.name}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </TableCell>
                        <TableCell>{type.category_label}</TableCell>
                        <TableCell>
                          {type.institution_id
                            ? <Badge variant="secondary">Təşkilata özəl</Badge>
                            : <Badge variant="outline">Regional</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={type.is_active ? 'default' : 'outline'}>
                            {type.is_active ? 'Aktiv' : 'Deaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssessmentType(type)}>
                                <Edit className="h-4 w-4 mr-2" />Redaktə et
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleAssessmentTypeStatus(type.id)}>
                                <Power className="h-4 w-4 mr-2" />
                                {type.is_active ? 'Deaktiv et' : 'Aktiv et'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteAssessmentType(type.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Mərhələlər</CardTitle>
                <CardDescription>KSQ/BSQ kimi mərhələləri roman rəqəmləri ilə təşkil edin.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTypeId ? selectedTypeId.toString() : ''}
                  onValueChange={(value) => setSelectedTypeId(Number(value))}
                >
                  <SelectTrigger className="min-w-[220px]">
                    <SelectValue placeholder="Növ seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => openStageModal()} disabled={!selectedTypeId}>
                  <Plus className="h-4 w-4 mr-2" />Yeni mərhələ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTypeId && (
                <div className="text-center py-8 text-muted-foreground">
                  Əvvəlcə qiymətləndirmə növü seçin.
                </div>
              )}

              {selectedTypeId && stagesLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {selectedTypeId && stagesError && (
                <div className="text-center py-8 text-destructive">
                  Mərhələlər yüklənərkən problem yarandı.
                </div>
              )}

              {selectedTypeId && !stagesLoading && !stagesError && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead>Roma rəqəmi</TableHead>
                        <TableHead>Sıra</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Əməliyyatlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages && stages.length > 0 ? stages.map(stage => (
                        <TableRow key={stage.id}>
                          <TableCell>
                            <div className="font-semibold">{stage.name}</div>
                            {stage.description && (
                              <div className="text-sm text-muted-foreground">{stage.description}</div>
                            )}
                          </TableCell>
                          <TableCell>{stage.roman_numeral || '—'}</TableCell>
                          <TableCell>{stage.display_order}</TableCell>
                          <TableCell>
                            <Badge variant={stage.is_active ? 'default' : 'outline'}>
                              {stage.is_active ? 'Aktiv' : 'Deaktiv'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openStageModal(stage)}>
                                  <Edit className="h-4 w-4 mr-2" />Redaktə et
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmStageDelete(stage)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Mərhələ əlavə edilməmişdir.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resultFields" className="pt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Nəticə göstəriciləri</CardTitle>
                <CardDescription>Toplanacaq məlumat sütunlarını müəyyən edin.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTypeId ? selectedTypeId.toString() : ''}
                  onValueChange={(value) => setSelectedTypeId(Number(value))}
                >
                  <SelectTrigger className="min-w-[220px]">
                    <SelectValue placeholder="Növ seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => openFieldModal()} disabled={!selectedTypeId}>
                  <Plus className="h-4 w-4 mr-2" />Yeni sahə
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTypeId && (
                <div className="text-center py-8 text-muted-foreground">
                  Əvvəlcə qiymətləndirmə növü seçin.
                </div>
              )}

              {selectedTypeId && fieldsLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {selectedTypeId && fieldsError && (
                <div className="text-center py-8 text-destructive">
                  Nəticə sahələri yüklənərkən problem yarandı.
                </div>
              )}

              {selectedTypeId && !fieldsLoading && !fieldsError && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Açar</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Sahə</TableHead>
                        <TableHead>Toplama</TableHead>
                        <TableHead>Vacib</TableHead>
                        <TableHead>Sıra</TableHead>
                        <TableHead className="text-right">Əməliyyatlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultFields && resultFields.length > 0 ? resultFields.map(field => (
                        <TableRow key={field.id}>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>{field.field_key}</TableCell>
                          <TableCell>{field.input_type}</TableCell>
                          <TableCell>{field.scope === 'class' ? 'Sinif' : 'Ümumi'}</TableCell>
                          <TableCell>{field.aggregation}</TableCell>
                          <TableCell>
                            <Badge variant={field.is_required ? 'default' : 'outline'}>
                              {field.is_required ? 'Bəli' : 'Xeyr'}
                            </Badge>
                          </TableCell>
                          <TableCell>{field.display_order}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openFieldModal(field)}>
                                  <Edit className="h-4 w-4 mr-2" />Redaktə et
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmFieldDelete(field)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                            Nəticə sahəsi əlavə edilməyib.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssessmentTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assessmentType={selectedAssessmentType}
        onSuccess={handleAssessmentTypeSuccess}
        showInstitutionAssignment
      />

      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Mərhələni redaktə et' : 'Yeni mərhələ'}</DialogTitle>
            <DialogDescription>
              {editingStage ? 'Mövcud mərhələnin məlumatlarını yeniləyin.' : 'Yeni qiymətləndirmə mərhələsi əlavə edin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mərhələ adı</Label>
              <Input
                value={stageForm.name ?? ''}
                onChange={(e) => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Məs: I mərhələ"
              />
            </div>
            <div>
              <Label>Roma rəqəmi</Label>
              <Input
                value={stageForm.roman_numeral ?? ''}
                onChange={(e) => setStageForm(prev => ({ ...prev, roman_numeral: e.target.value }))}
                placeholder="I, II, III ..."
              />
            </div>
            <div>
              <Label>Təsvir</Label>
              <Textarea
                value={stageForm.description ?? ''}
                onChange={(e) => setStageForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Qısa izah"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sıra</Label>
                <Input
                  type="number"
                  min={1}
                  value={stageForm.display_order ?? 1}
                  onChange={(e) => setStageForm(prev => ({ ...prev, display_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Aktiv</Label>
                  <p className="text-sm text-muted-foreground">Mərhələ istifadə üçün açıq olsun</p>
                </div>
                <Switch
                  checked={stageForm.is_active ?? true}
                  onCheckedChange={(checked) => setStageForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageModalOpen(false)}>Bağla</Button>
            <Button onClick={submitStageForm} disabled={!stageForm.name?.trim()}>
              {editingStage ? 'Yenilə' : 'Yarat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Nəticə sahəsini redaktə et' : 'Yeni nəticə sahəsi'}</DialogTitle>
            <DialogDescription>
              Məktəblərdən toplanacaq göstəricinin parametrlərini daxil edin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sahə adı</Label>
              <Input
                value={fieldForm.label ?? ''}
                onChange={(e) => setFieldForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Məs: İki alanların sayı"
              />
            </div>
            <div>
              <Label>Açar (istəyə bağlı)</Label>
              <Input
                value={fieldForm.field_key ?? ''}
                onChange={(e) => setFieldForm(prev => ({ ...prev, field_key: e.target.value }))}
                placeholder="auto_iki_sayi"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tip</Label>
                <Select
                  value={fieldForm.input_type ?? 'number'}
                  onValueChange={(value) => setFieldForm(prev => ({ ...prev, input_type: value as AssessmentResultField['input_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Tam ədəd</SelectItem>
                    <SelectItem value="decimal">Ondalıq</SelectItem>
                    <SelectItem value="text">Mətn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sahə</Label>
                <Select
                  value={fieldForm.scope ?? 'class'}
                  onValueChange={(value) => setFieldForm(prev => ({ ...prev, scope: value as AssessmentResultField['scope'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Sinif üzrə</SelectItem>
                    <SelectItem value="overall">Ümumi sessiya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Toplama</Label>
                <Select
                  value={fieldForm.aggregation ?? 'sum'}
                  onValueChange={(value) => setFieldForm(prev => ({ ...prev, aggregation: value as AssessmentResultField['aggregation'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Cəm</SelectItem>
                    <SelectItem value="average">Orta</SelectItem>
                    <SelectItem value="max">Maksimum</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sıra</Label>
                <Input
                  type="number"
                  min={1}
                  value={fieldForm.display_order ?? 1}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, display_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Vacib sahə</Label>
                  <p className="text-sm text-muted-foreground">Məktəbadmin bu sahəni mütləq doldurmalıdır</p>
                </div>
                <Switch
                  checked={fieldForm.is_required ?? false}
                  onCheckedChange={(checked) => setFieldForm(prev => ({ ...prev, is_required: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldModalOpen(false)}>Bağla</Button>
            <Button onClick={submitFieldForm} disabled={!fieldForm.label?.trim()}>
              {editingField ? 'Yenilə' : 'Yarat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
