import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Layout } from 'lucide-react';
import type { Survey } from '@/types/surveys';

interface Step1BasicInfoProps {
  formData: {
    title: string;
    description?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_anonymous: boolean;
    allow_multiple_responses: boolean;
  };
  survey: Survey | null;
  isEditMode: boolean;
  isLoading: boolean;
  isPublishedWithResponses: boolean;
  MAX_TITLE_LENGTH: number;
  MAX_DESCRIPTION_LENGTH: number;
  handleInputChange: (field: string, value: any) => void;
  isEditable: (survey: Survey | null) => boolean;
  onShowTemplateGallery: () => void;
}

export function Step1BasicInfo({
  formData,
  survey,
  isEditMode,
  isLoading,
  isPublishedWithResponses,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  handleInputChange,
  isEditable,
  onShowTemplateGallery,
}: Step1BasicInfoProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="title">Sorğu başlığı *</Label>
          <span className="text-xs text-muted-foreground">
            {formData.title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <Input
          id="title"
          value={formData.title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Sorğunun başlığını daxil edin"
          required
          className={isPublishedWithResponses ? "bg-blue-50 border-blue-200" : ""}
          disabled={!isEditable(survey)}
        />
        {formData.title.length > MAX_TITLE_LENGTH * 0.9 && (
          <p className="text-xs text-amber-600">Başlıq uzunluq limitinə yaxındır</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="description">Təsvir</Label>
          <span className="text-xs text-muted-foreground">
            {(formData.description || '').length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Sorğunun təsvirini daxil edin..."
          rows={4}
          className={isPublishedWithResponses ? "bg-blue-50 border-blue-200" : ""}
          disabled={!isEditable(survey)}
        />
        {(formData.description || '').length > MAX_DESCRIPTION_LENGTH * 0.9 && (
          <p className="text-xs text-amber-600">Təsvir uzunluq limitinə yaxındır</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Başlama tarixi</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date?.split('T')[0] || ''}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Bitmə tarixi</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date?.split('T')[0] || ''}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            min={formData.start_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_anonymous"
            checked={formData.is_anonymous}
            onCheckedChange={(checked) => handleInputChange('is_anonymous', checked)}
          />
          <Label htmlFor="is_anonymous" className="text-sm font-normal cursor-pointer">
            Anonim sorğu (cavab verənlərin kimliyi məxfi qalacaq)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allow_multiple_responses"
            checked={formData.allow_multiple_responses}
            onCheckedChange={(checked) => handleInputChange('allow_multiple_responses', checked)}
          />
          <Label htmlFor="allow_multiple_responses" className="text-sm font-normal cursor-pointer">
            Çoxsaylı cavablar (eyni istifadəçi bir neçə dəfə cavab verə bilər)
          </Label>
        </div>
      </div>

      {/* Template Selection - Only for new surveys */}
      {!isEditMode && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <Label className="text-base font-medium">Sürətli Başlama</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Hazır template-lərdən birini seçərək sorğunu tez yaradın
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onShowTemplateGallery}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 h-11 border-dashed hover:border-solid hover:bg-muted/50"
          >
            <Layout className="h-4 w-4" />
            <span>Template Qaleriyasından Seç</span>
          </Button>
        </div>
      )}
    </div>
  );
}
