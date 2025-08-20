import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleTemplate } from './hooks/useScheduleTemplate';
import { TemplateCreateDialog } from './TemplateCreateDialog';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { TemplateCard } from './TemplateCard';
import { TemplateFilters } from './TemplateFilters';
import type { ScheduleTemplate } from './hooks/useScheduleTemplate';

interface ScheduleTemplateProps {
  onTemplateSelect?: (template: ScheduleTemplate) => void;
  selectedGradeLevel?: number;
  className?: string;
}

export const ScheduleTemplateRefactored: React.FC<ScheduleTemplateProps> = ({
  onTemplateSelect,
  selectedGradeLevel,
  className
}) => {
  const {
    // State
    selectedTemplate,
    showCreateDialog,
    showPreviewDialog,
    filterType,
    searchTerm,
    templateForm,
    
    // Data
    templates,
    isLoading,
    
    // Mutations
    createTemplateMutation,
    generateScheduleMutation,
    
    // Actions
    setShowCreateDialog,
    setShowPreviewDialog,
    setFilterType,
    setSearchTerm,
    setTemplateForm,
    refetch,
    
    // Event handlers
    handleCreateTemplate,
    handleGenerateSchedule,
    handleUseTemplate,
    handlePreviewTemplate,
    
    // Utilities
    getTypeLabel,
    getTypeColor
  } = useScheduleTemplate({
    onTemplateSelect,
    selectedGradeLevel
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cədvəl Şablonları</h2>
          <p className="text-muted-foreground">
            Hazır şablonlardan istifadə edərək sürətli cədvəl yaradın
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Yenilə
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Şablon
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TemplateFilters
        filterType={filterType}
        setFilterType={setFilterType}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedGradeLevel={selectedGradeLevel}
      />

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Şablonlar yüklənir...</span>
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate?.id === template.id}
              isGenerating={generateScheduleMutation.isPending}
              onPreview={handlePreviewTemplate}
              onUse={handleUseTemplate}
              onGenerate={handleGenerateSchedule}
              getTypeLabel={getTypeLabel}
              getTypeColor={getTypeColor}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Şablon Tapılmadı</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'Axtarış kriteriyalarına uyğun şablon yoxdur'
                : 'Hələ ki heç bir şablon yaradılmayıb'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Şablonu Yarat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <TemplateCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        onCreateTemplate={handleCreateTemplate}
        isCreating={createTemplateMutation.isPending}
      />

      <TemplatePreviewDialog
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        template={selectedTemplate}
        onUseTemplate={handleUseTemplate}
        getTypeLabel={getTypeLabel}
        getTypeColor={getTypeColor}
      />
    </div>
  );
};

export default ScheduleTemplateRefactored;