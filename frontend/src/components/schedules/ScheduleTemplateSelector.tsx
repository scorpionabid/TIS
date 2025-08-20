import React from 'react';
import { Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScheduleTemplate } from '@/services/schedule';

interface ScheduleTemplateSelectorProps {
  templates: ScheduleTemplate[];
  selectedTemplate: number | null;
  isCreatingFromTemplate: boolean;
  onTemplateSelect: (templateId: number | null) => void;
  onCreateFromTemplate: () => void;
  className?: string;
}

export const ScheduleTemplateSelector: React.FC<ScheduleTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  isCreatingFromTemplate,
  onTemplateSelect,
  onCreateFromTemplate,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5" />
          Dərs Cədvəli Şablonları
        </CardTitle>
        <CardDescription>
          Hazır şablonlardan birini seçin və ya öz şablonunuzu yaradın
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <Copy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Hələ ki şablon mövcud deyil</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Select
                value={selectedTemplate?.toString() || ''}
                onValueChange={(value) => onTemplateSelect(value ? Number(value) : null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Şablon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={onCreateFromTemplate}
                disabled={!selectedTemplate || isCreatingFromTemplate}
              >
                <Copy className="h-4 w-4 mr-2" />
                {isCreatingFromTemplate ? 'Yaradılır...' : 'Şablondan Yarat'}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <Card 
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedTemplate === template.id && "ring-2 ring-primary"
                  )}
                  onClick={() => onTemplateSelect(template.id)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Siniflər: {template.grade_levels.join(', ')}</span>
                      <span>Vaxt slotları: {template.time_slots.length}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};