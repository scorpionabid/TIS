import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Layout,
  Calendar,
  FileText,
  Loader2,
  ArrowRight,
  Clock,
  X
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
  current_questions_count?: number;
  questions?: Array<{
    title: string;
    type: string;
    required: boolean;
    options?: any;
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

  // Template gallery məlumatlarını əldə et
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['survey-templates'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/survey-templates');
        return response.data || { templates: [], total: 0 };
      } catch (error) {
        console.error('Template fetch error:', error);
        return { templates: [], total: 0 };
      }
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

  const allTemplates = templatesData?.templates || [];

  // Axtarış filtri
  const filteredTemplates = allTemplates.filter(template => {
    if (!searchTerm) return true;
    return template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           template.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              Template Qaleriyası
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Simple Search */}
        <div className="mb-4">
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

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Template-lər yüklənir...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16">
              <Layout className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2 text-muted-foreground">
                {searchTerm ? 'Template tapılmadı' : 'Template yoxdur'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? 'Axtarış şərtinizi dəyişdirməyi cəhd edin'
                  : 'İlk template yaratmaq üçün mövcud sorğudan istifadə edin'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template: SurveyTemplate) => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group"
                  onClick={() => handleUseTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                          {template.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {template.description || 'Təsvir əlavə edilməyib'}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-2 flex-shrink-0" />
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Simple Template Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{template.current_questions_count || template.questions?.length || 0} sual</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(template.created_at)}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Template
                      </Badge>
                    </div>

                    {/* Use Button */}
                    <Button
                      size="sm"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                      variant="outline"
                      disabled={createFromTemplateMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                    >
                      {createFromTemplateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      İstifadə et
                    </Button>
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