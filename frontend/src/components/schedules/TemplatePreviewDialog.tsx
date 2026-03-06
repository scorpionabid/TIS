import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleTemplate } from './hooks/useScheduleTemplate';

interface TemplatePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: ScheduleTemplate | null;
  onUseTemplate: (template: ScheduleTemplate) => void;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => string;
}

export const TemplatePreviewDialog: React.FC<TemplatePreviewDialogProps> = ({
  isOpen,
  onClose,
  template,
  onUseTemplate,
  getTypeLabel,
  getTypeColor
}) => {
  if (!template) return null;

  const handleUseTemplate = () => {
    onUseTemplate(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* General Information and Settings */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Ümumi Məlumatlar</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip:</span>
                  <Badge variant={getTypeColor(template.type)}>
                    {getTypeLabel(template.type)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sinif səviyyələri:</span>
                  <span>{template.grade_levels.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Günlük dərs sayı:</span>
                  <span>{template.constraints.max_periods_per_day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İstifadə sayı:</span>
                  <span>{template.metadata.usage_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nahar fasiləsi:</span>
                  <span>{template.constraints.lunch_break_start} ({template.constraints.lunch_break_duration} dəq)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum fasilə:</span>
                  <span>{template.constraints.min_break_between_classes} dəq</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Parametrlər</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    template.settings.auto_assign_teachers ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>Avtomatik müəllim təyinatı</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    template.settings.prefer_morning_slots ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>Səhər saatlarına üstünlük</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    template.settings.balance_workload ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>İş yükü balansı</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    template.settings.consider_room_capacity ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>Otaq tutumu nəzərə alınması</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    template.settings.avoid_single_periods ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>Tək dərslər qarşısının alınması</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    !template.settings.allow_conflicts ? "text-green-500" : "text-muted-foreground"
                  )} />
                  <span>Konfliktlərin qarşısının alınması</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <div>
              <h4 className="font-semibold mb-2">Açıqlama</h4>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {template.metadata.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Etiketlər</h4>
              <div className="flex flex-wrap gap-1">
                {template.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Subject Configuration */}
          {template.subjects_config.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Fənn Konfiqurasiyası</h4>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {template.subjects_config.map((subject) => (
                  <div 
                    key={subject.subject_id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{subject.subject_name}</span>
                      <div className="text-xs text-muted-foreground">
                        {subject.weekly_periods} saat/həftə • {subject.period_duration} dəq/dərs
                        {subject.max_consecutive > 1 && ` • Max ${subject.max_consecutive} ardıcıl`}
                      </div>
                      {subject.preferred_times.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Üstünlük verilən saatlar: {subject.preferred_times.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        subject.priority === 'high' ? 'destructive' : 
                        subject.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {subject.priority}
                      </Badge>
                      {subject.requires_lab && (
                        <Badge variant="outline">Lab</Badge>
                      )}
                      {subject.required_room_type && (
                        <Badge variant="outline">{subject.required_room_type}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Constraints */}
          {template.constraints.no_class_times.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Dərs Olmayan Saatlar</h4>
              <div className="flex flex-wrap gap-1">
                {template.constraints.no_class_times.map((time) => (
                  <Badge key={time} variant="outline">
                    {time}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h4 className="font-semibold mb-2">Metadata</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yaradılma tarixi:</span>
                <span>{new Date(template.metadata.created_at).toLocaleDateString('az-AZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Son istifadə:</span>
                <span>{new Date(template.metadata.last_used).toLocaleDateString('az-AZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standart şablon:</span>
                <span>{template.metadata.is_default ? 'Bəli' : 'Xeyr'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ümumi istifadə:</span>
                <span>{template.metadata.is_public ? 'Bəli' : 'Xeyr'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Bağla
            </Button>
            <Button onClick={handleUseTemplate}>
              Bu Şablonu İstifadə Et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};