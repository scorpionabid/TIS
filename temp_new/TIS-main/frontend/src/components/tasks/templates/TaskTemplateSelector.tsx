/**
 * TaskTemplateSelector Component
 *
 * Allows selecting and applying task templates when creating new tasks
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Clock,
  Flag,
  Tag,
  CheckCircle,
  Trash2,
  Edit,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
import { categoryLabels, priorityLabels } from "@/components/tasks/config/taskFormFields";

// Template interface
export interface TaskTemplate {
  id: number;
  title: string;
  description?: string;
  category: string;
  default_duration_days: number;
  default_priority: string;
  default_target_roles?: string[];
  created_by: number;
  is_active: boolean;
  created_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

// Template form data
interface TemplateFormData {
  title: string;
  description: string;
  category: string;
  default_duration_days: number;
  default_priority: string;
  default_target_roles: string[];
}

// Priority colors
const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

// Fetch templates
const fetchTemplates = async (): Promise<TaskTemplate[]> => {
  const response = await apiClient.get<{ data: TaskTemplate[] }>("/task-templates");
  return response.data || [];
};

// Create template
const createTemplate = async (data: TemplateFormData): Promise<TaskTemplate> => {
  const response = await apiClient.post<{ data: TaskTemplate }>("/task-templates", data);
  return response.data;
};

// Delete template
const deleteTemplate = async (id: number): Promise<void> => {
  await apiClient.delete(`/task-templates/${id}`);
};

interface TaskTemplateSelectorProps {
  onSelect: (template: TaskTemplate) => void;
  showCreateButton?: boolean;
  disabled?: boolean;
}

export function TaskTemplateSelector({
  onSelect,
  showCreateButton = true,
  disabled = false,
}: TaskTemplateSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    title: "",
    description: "",
    category: "other",
    default_duration_days: 7,
    default_priority: "medium",
    default_target_roles: [],
  });

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["task-templates"],
    queryFn: fetchTemplates,
    enabled: isOpen,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast({ title: "Şablon yaradıldı" });
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast({
        title: "Xəta baş verdi",
        description: err instanceof Error ? err.message : "Şablon yaradıla bilmədi",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      toast({ title: "Şablon silindi" });
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
    onError: (err) => {
      toast({
        title: "Xəta baş verdi",
        description: err instanceof Error ? err.message : "Şablon silinə bilmədi",
        variant: "destructive",
      });
    },
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = !searchTerm ||
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;

      return matchesSearch && matchesCategory && template.is_active;
    });
  }, [templates, searchTerm, selectedCategory]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, TaskTemplate[]> = {};
    filteredTemplates.forEach((template) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [filteredTemplates]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      default_duration_days: 7,
      default_priority: "medium",
      default_target_roles: [],
    });
  }, []);

  // Handle template select
  const handleSelectTemplate = useCallback((template: TaskTemplate) => {
    onSelect(template);
    setIsOpen(false);
    toast({
      title: "Şablon tətbiq edildi",
      description: `"${template.title}" şablonu seçildi`,
    });
  }, [onSelect, toast]);

  // Handle create
  const handleCreate = useCallback(() => {
    if (!formData.title.trim()) {
      toast({
        title: "Başlıq daxil edin",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  }, [formData, createMutation, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FileText className="h-4 w-4 mr-2" />
          Şablonlardan seç
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Tapşırıq Şablonları</DialogTitle>
          <DialogDescription>
            Hazır şablonlardan birini seçərək sürətli tapşırıq yaradın
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="mt-4">
          <TabsList>
            <TabsTrigger value="browse">Şablonlar</TabsTrigger>
            {showCreateButton && <TabsTrigger value="create">Yeni Şablon</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="mt-4 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Şablon axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Kateqoriya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates List */}
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  Şablonlar yüklənərkən xəta baş verdi
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Şablon tapılmadı</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {categoryLabels[category] || category}
                      </h4>
                      <div className="grid gap-2">
                        {categoryTemplates.map((template) => (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium truncate">{template.title}</h5>
                                    <Badge
                                      variant="secondary"
                                      className={cn("text-xs", priorityColors[template.default_priority])}
                                    >
                                      {priorityLabels[template.default_priority]}
                                    </Badge>
                                  </div>
                                  {template.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {template.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {template.default_duration_days} gün
                                    </span>
                                    {template.creator && (
                                      <span>Yaradan: {template.creator.name}</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(template.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {showCreateButton && (
            <TabsContent value="create" className="mt-4 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-title">Şablon adı *</Label>
                  <Input
                    id="template-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Şablon başlığını daxil edin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Təsvir</Label>
                  <Textarea
                    id="template-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Şablon təsvirini daxil edin"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kateqoriya</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioritet</Label>
                    <Select
                      value={formData.default_priority}
                      onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Müddət (gün)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={365}
                    value={formData.default_duration_days}
                    onChange={(e) =>
                      setFormData({ ...formData, default_duration_days: parseInt(e.target.value) || 7 })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Sıfırla
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Şablon yarat
                </Button>
              </DialogFooter>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using templates
export function useTaskTemplates() {
  return useQuery({
    queryKey: ["task-templates"],
    queryFn: fetchTemplates,
  });
}
