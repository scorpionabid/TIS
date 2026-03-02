/**
 * TableTemplates - Manage and use report table templates
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Bookmark,
  BookmarkPlus,
  Copy,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  Grid3X3,
  FileText,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import type { ReportTable, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';

// Template interface extending ReportTable
type TableTemplate = ReportTable & {
  is_template: true;
  template_category?: string;
  cloned_from_id?: number;
}

export interface TableTemplate {
  id: number;
  name: string;
  description?: string;
  category?: string;
  columns: ReportTableColumn[];
  max_rows: number;
  is_public: boolean;
  is_favorite: boolean;
  usage_count: number;
  created_by: {
    id: number;
    name: string;
  };
  created_at: string;
  tags?: string[];
}

interface TableTemplatesProps {
  onSelectTemplate?: (template: TableTemplate) => void;
  currentTable?: ReportTable;
  trigger?: React.ReactNode;
}

// Mock API for templates - TODO: Replace with actual API endpoints
const templateService = {
  async getTemplates(): Promise<TableTemplate[]> {
    // TODO: Replace with actual API call
    // return apiClient.get('report-table-templates');
    return [];
  },

  async createTemplate(tableId: number, data: { name: string; description?: string; category?: string; is_public: boolean }): Promise<TableTemplate> {
    // TODO: Replace with actual API call
    // return apiClient.post(`report-tables/${tableId}/templates`, data);
    throw new Error('Şablon yaratma API-si hələ implement edilməyib');
  },

  async deleteTemplate(templateId: number): Promise<void> {
    // TODO: Replace with actual API call
    // return apiClient.delete(`report-table-templates/${templateId}`);
    throw new Error('Şablon silmə API-si hələ implement edilməyib');
  },

  async toggleFavorite(templateId: number, isFavorite: boolean): Promise<void> {
    // TODO: Replace with actual API call
    // return apiClient.patch(`report-table-templates/${templateId}/favorite`, { is_favorite: isFavorite });
    throw new Error('Favori API-si hələ implement edilməyib');
  },

  async duplicateTemplate(templateId: number): Promise<TableTemplate> {
    // TODO: Replace with actual API call
    // return apiClient.post(`report-table-templates/${templateId}/duplicate`);
    throw new Error('Şablon kopyalama API-si hələ implement edilməyib');
  },
};

const CATEGORIES = [
  { value: 'education', label: 'Təhsil', icon: '🎓' },
  { value: 'finance', label: 'Maliyyə', icon: '💰' },
  { value: 'inventory', label: 'İnventar', icon: '📦' },
  { value: 'hr', label: 'İnsan Resursları', icon: '👥' },
  { value: 'infrastructure', label: 'İnfrastruktur', icon: '🏗️' },
  { value: 'other', label: 'Digər', icon: '📝' },
];

export function TableTemplates({ onSelectTemplate, currentTable, trigger }: TableTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Save as template dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCategory, setTemplateCategory] = useState('other');
  const [isPublic, setIsPublic] = useState(false);

  const queryClient = useQueryClient();

  // Load templates from API
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['table-templates'],
    queryFn: () => reportTableService.getTemplates(),
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!currentTable) throw new Error('Cədvəl seçilməyib');
      return reportTableService.saveAsTemplate(currentTable.id, templateCategory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      toast.success('Şablon yadda saxlanıldı');
      setSaveDialogOpen(false);
      resetSaveForm();
    },
    onError: (error: Error) => toast.error(error.message || 'Şablon yadda saxlanılmadı'),
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: number) => templateService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      toast.success('Şablon silindi');
    },
    onError: () => toast.error('Şablon silinə bilmədi'),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) => 
      templateService.toggleFavorite(id, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (templateId: number) => 
      reportTableService.createFromTemplate(templateId, `${templateName || 'Kopya'} (Kopya)`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-templates'] });
      toast.success('Şablon kopyalandı');
    },
    onError: (error: Error) => toast.error(error.message || 'Şablon kopyalanmadı'),
  });

  const resetSaveForm = () => {
    setTemplateName('');
    setTemplateDesc('');
    setTemplateCategory('other');
    setIsPublic(false);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'favorites': return matchesSearch && t.is_favorite;
      case 'my': return matchesSearch && t.created_by.id === 1; // TODO: Use actual user ID
      case 'public': return matchesSearch && t.is_public;
      default: return matchesSearch;
    }
  });

  const handleSelect = (template: TableTemplate) => {
    // Create new table from template
    reportTableService.createFromTemplate(template.id, `${template.title} (Yeni)`)
      .then(() => {
        toast.success('Yeni cədvəl şablondan yaradıldı');
        onSelectTemplate?.(template);
        setOpen(false);
      })
      .catch((error: Error) => toast.error(error.message || 'Cədvəl yaradılmadı'));
  };

  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;
  const getCategoryIcon = (value: string) => CATEGORIES.find(c => c.value === value)?.icon || '📝';

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-1">
              <Bookmark className="h-4 w-4" />
              Şablonlar
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Cədvəl şablonları
            </DialogTitle>
            <DialogDescription>
              Hazır şablonlardan istifadə edin və ya öz şablonlarınızı yaradın
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Şablon axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center border rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {currentTable && (
              <Button 
                size="sm" 
                className="gap-1"
                onClick={() => {
                  setTemplateName(`${currentTable.title} (Şablon)`);
                  setSaveDialogOpen(true);
                }}
              >
                <BookmarkPlus className="h-4 w-4" />
                Şablon kimi saxla
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Hamısı</TabsTrigger>
              <TabsTrigger value="favorites">Seçilmişlər</TabsTrigger>
              <TabsTrigger value="my">Mənim</TabsTrigger>
              <TabsTrigger value="public">İctimai</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bookmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Şablon tapılmadı</p>
                  {activeTab === 'all' && (
                    <p className="text-sm">
                      Cari cədvəli şablon kimi saxlamaq üçün yuxarıdaki düymədən istifadə edin
                    </p>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Şablon</TableHead>
                      <TableHead>Kateqoriya</TableHead>
                      <TableHead>Sütun sayı</TableHead>
                      <TableHead>İstifadə</TableHead>
                      <TableHead>Yaradılıb</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow 
                        key={template.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSelect(template)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                favoriteMutation.mutate({ id: template.id, isFavorite: !template.is_favorite });
                              }}
                            >
                              <Bookmark className={`h-4 w-4 ${template.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </Button>
                            <div>
                              <p className="font-medium">{template.name}</p>
                              {template.description && (
                                <p className="text-xs text-gray-500">{template.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{getCategoryIcon(template.category || 'other')}</span>
                            {getCategoryLabel(template.category || 'other')}
                          </Badge>
                        </TableCell>
                        <TableCell>{template.columns.length} sütun</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{template.usage_count} dəfə</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {format(new Date(template.created_at), 'MMM yyyy', { locale: az })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSelect(template)}>
                                <Plus className="h-4 w-4 mr-2" /> İstifadə et
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate(template.id)}>
                                <Copy className="h-4 w-4 mr-2" /> Kopyala
                              </DropdownMenuItem>
                              {template.created_by.id === 1 && ( // TODO: Check actual user
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(template.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Sil
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelect(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getCategoryIcon(template.category || 'other')}</span>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {template.columns.length} sütun
                            </Badge>
                          </div>
                        </div>
                        {template.is_favorite && (
                          <Bookmark className="h-4 w-4 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{template.usage_count} istifadə</span>
                        <span>{format(new Date(template.created_at), 'MMM yyyy', { locale: az })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Şablon kimi saxla</DialogTitle>
            <DialogDescription>
              Cari cədvəli gələcəkdə istifadə etmək üçün şablon kimi saxlayın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Şablon adı <span className="text-red-500">*</span></Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Məs: Məktəb inventar siyahısı"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıqlama</Label>
              <Textarea
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Şablonun təsviri..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Kateqoriya</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={templateCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto py-2 flex flex-col items-center gap-1"
                    onClick={() => setTemplateCategory(cat.value)}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs">{cat.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                İctimai şablon (digər istifadəçilər görə bilər)
              </Label>
            </div>

            {currentTable && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-700 mb-1">Cədvəl məlumatları:</p>
                <ul className="text-gray-600 space-y-0.5">
                  <li>• {currentTable.columns?.length || 0} sütun</li>
                  <li>• Maksimum {currentTable.max_rows || 50} sətir</li>
                  <li>• Cari ad: {currentTable.title}</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Ləğv et
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!templateName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saxlanılır...' : 'Saxla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TableTemplates;
