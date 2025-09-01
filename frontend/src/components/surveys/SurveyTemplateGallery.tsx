import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Layout,
  Calendar,
  Users,
  CheckCircle,
  Star,
  Copy,
  Download,
  Eye,
  Sparkles,
  Clock,
  FileText,
  BarChart3,
  Building,
  Loader2,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Survey, CreateSurveyData } from '@/services/surveys';

interface SurveyTemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: SurveyTemplate) => void;
  onCreateFromTemplate?: (templateData: CreateSurveyData) => void;
}

interface SurveyTemplate extends Survey {
  is_featured: boolean;
  usage_count: number;
  last_used_at: string | null;
  success_rate: number;
  average_completion_time: number;
  template_tags: string[];
  created_by_name: string;
  institution_name: string;
}

interface TemplateStats {
  total_templates: number;
  featured_templates: number;
  my_templates: number;
  most_popular: SurveyTemplate[];
  recent_templates: SurveyTemplate[];
  categories: Array<{
    name: string;
    count: number;
  }>;
}

export function SurveyTemplateGallery({ 
  open, 
  onClose, 
  onSelectTemplate, 
  onCreateFromTemplate 
}: SurveyTemplateGalleryProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'newest' | 'rating' | 'name'>('popularity');
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [showOnlyMyTemplates, setShowOnlyMyTemplates] = useState(false);

  // Template gallery məlumatlarını əldə et
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['survey-templates', searchTerm, selectedCategory, sortBy, showOnlyFeatured, showOnlyMyTemplates],
    queryFn: async () => {
      const response = await apiClient.get('/survey-templates', {
        params: {
          search: searchTerm,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          sort_by: sortBy,
          featured_only: showOnlyFeatured,
          my_templates: showOnlyMyTemplates,
          per_page: 50,
        },
      });
      return response.data;
    },
    enabled: open,
  });

  // Template statistikalarını əldə et
  const { data: templateStats } = useQuery({
    queryKey: ['survey-template-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/survey-templates/stats');
      return response.data;
    },
    enabled: open,
  });

  // Template-dən survey yarat
  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiClient.post(`/survey-templates/${templateId}/create-survey`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Uğurlu!",
        description: "Template-dən survey yaradıldı",
      });
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      if (onCreateFromTemplate) {
        onCreateFromTemplate(data.survey);
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Template-dən survey yaradarkən xəta baş verdi",
        variant: "destructive",
      });
    },
  });

  const templates = templatesData?.templates || [];
  const stats: TemplateStats = templateStats || {
    total_templates: 0,
    featured_templates: 0,
    my_templates: 0,
    most_popular: [],
    recent_templates: [],
    categories: [],
  };

  // Filtrlənmiş template-lər
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.template_tags?.some(tag => 
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  }, [templates, searchTerm]);

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { color: string, icon: React.ReactNode }> = {
      'statistics': { color: 'bg-blue-100 text-blue-800', icon: <BarChart3 className="h-3 w-3" /> },
      'finance': { color: 'bg-green-100 text-green-800', icon: <Clock className="h-3 w-3" /> },
      'strategic': { color: 'bg-purple-100 text-purple-800', icon: <FileText className="h-3 w-3" /> },
      'urgent': { color: 'bg-red-100 text-red-800', icon: <Clock className="h-3 w-3" /> },
      'general': { color: 'bg-gray-100 text-gray-800', icon: <Users className="h-3 w-3" /> },
    };

    const config = categoryConfig[category] || categoryConfig['general'];
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {category}
      </Badge>
    );
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleUseTemplate = (template: SurveyTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      createFromTemplateMutation.mutate(template.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Survey Template Gallery
          </DialogTitle>
        </DialogHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{stats.total_templates}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Seçilmiş</p>
                <p className="text-2xl font-bold">{stats.featured_templates}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Mənim</p>
                <p className="text-2xl font-bold">{stats.my_templates}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Kateqoriya</p>
                <p className="text-2xl font-bold">{stats.categories.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Template axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              <SelectItem value="statistics">Statistik</SelectItem>
              <SelectItem value="finance">Maliyyə</SelectItem>
              <SelectItem value="strategic">Strateji</SelectItem>
              <SelectItem value="urgent">Təcili</SelectItem>
              <SelectItem value="general">Ümumi</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Populyarlıq</SelectItem>
              <SelectItem value="newest">Ən yeni</SelectItem>
              <SelectItem value="rating">Reytinq</SelectItem>
              <SelectItem value="name">Ad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Filters */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={showOnlyFeatured ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyFeatured(!showOnlyFeatured)}
            className="flex items-center gap-2"
          >
            <Star className="h-4 w-4" />
            Yalnız seçilmiş
          </Button>
          
          <Button
            variant={showOnlyMyTemplates ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyMyTemplates(!showOnlyMyTemplates)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Mənim template-lər
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Template-lər yüklənir...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Template tapılmadı</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' || showOnlyFeatured || showOnlyMyTemplates
                  ? 'Filtr şərtlərinizi dəyişdirməyi cəhd edin'
                  : 'Hələlik template əlavə edilməyib'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template: SurveyTemplate) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2">
                          {template.title}
                          {template.is_featured && (
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryBadge(template.category || 'general')}
                          {template.frequency && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {template.frequency}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <CardDescription className="line-clamp-2">
                      {template.description || 'Təsvir yoxdur'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Template Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">İstifadə:</span>
                        <span className="font-medium">{template.usage_count || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Sual:</span>
                        <span className="font-medium">{template.current_questions_count || template.questions?.length || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Müvəffəqiyyət:</span>
                        <span className={`font-medium ${getSuccessRateColor(template.success_rate || 0)}`}>
                          {template.success_rate || 0}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Müddət:</span>
                        <span className="font-medium">{template.average_completion_time || 5} dəq</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {template.template_tags && template.template_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.template_tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.template_tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.template_tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Creator Info */}
                    <div className="text-xs text-muted-foreground border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span>Yaradan: {template.created_by_name || 'N/A'}</span>
                        <span>{template.institution_name || ''}</span>
                      </div>
                      <div className="mt-1">
                        Yaradılma: {new Date(template.created_at).toLocaleDateString('az-AZ')}
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                        disabled={createFromTemplateMutation.isPending}
                        className="flex-1"
                      >
                        {createFromTemplateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        İstifadə et
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Template preview functionality
                          toast({
                            title: "Önizləmə",
                            description: "Template önizləmə funksionallığı tezliklə əlavə ediləcək",
                          });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}