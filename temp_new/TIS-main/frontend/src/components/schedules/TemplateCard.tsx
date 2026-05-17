import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText,
  Eye,
  Copy,
  Download,
  Users,
  BookOpen,
  Clock,
  Calendar,
  Star,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleTemplate } from './hooks/useScheduleTemplate';

interface TemplateCardProps {
  template: ScheduleTemplate;
  isSelected: boolean;
  isGenerating: boolean;
  onPreview: (template: ScheduleTemplate) => void;
  onUse: (template: ScheduleTemplate) => void;
  onGenerate: (template: ScheduleTemplate) => void;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => string;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  isGenerating,
  onPreview,
  onUse,
  onGenerate,
  getTypeLabel,
  getTypeColor
}) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{template.name}</h3>
              <p className="text-sm text-muted-foreground">
                {getTypeLabel(template.type)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant={getTypeColor(template.type)}>
              {getTypeLabel(template.type)}
            </Badge>
            {template.metadata.is_default && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Standart
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {template.description}
          </p>
        )}

        {/* Template Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              Siniflər: {template.grade_levels.join(', ')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>
              Fənn sayı: {template.subjects_config.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              Maksimum günlük dərs: {template.constraints.max_periods_per_day}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              İstifadə edildi: {template.metadata.usage_count} dəfə
            </span>
          </div>
        </div>

        {/* Template Tags */}
        {template.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.metadata.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Settings Summary */}
        <div className="mt-4 p-2 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Aktiv parametrlər:</div>
          <div className="flex flex-wrap gap-1">
            {template.settings.auto_assign_teachers && (
              <Badge variant="outline" className="text-xs">Avtomatik təyinat</Badge>
            )}
            {template.settings.prefer_morning_slots && (
              <Badge variant="outline" className="text-xs">Səhər üstünlüyü</Badge>
            )}
            {template.settings.balance_workload && (
              <Badge variant="outline" className="text-xs">Yük balansı</Badge>
            )}
            {template.settings.consider_room_capacity && (
              <Badge variant="outline" className="text-xs">Otaq tutumu</Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(template)}
              title="Önizlə"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              title="Kopyala"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              title="Yüklə"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUse(template)}
            >
              İstifadə Et
            </Button>
            <Button
              size="sm"
              onClick={() => onGenerate(template)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Yaradılır...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Cədvəl Yarat
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};