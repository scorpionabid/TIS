import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock } from 'lucide-react';
import { CreateSurveyData } from '@/services/surveys';

interface SurveyBasicInfoProps {
  formData: CreateSurveyData;
  onInputChange: (field: keyof CreateSurveyData, value: any) => void;
  maxTitleLength: number;
  maxDescriptionLength: number;
  isEditable?: boolean;
}

export const SurveyBasicInfo: React.FC<SurveyBasicInfoProps> = ({
  formData,
  onInputChange,
  maxTitleLength,
  maxDescriptionLength,
  isEditable = true,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
          1
        </div>
        <div>
          <h3 className="text-lg font-semibold">Əsas məlumatlar</h3>
          <p className="text-sm text-muted-foreground">
            Sorğunun başlığı, təsviri və əsas parametrləri
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <Label htmlFor="survey-title">
            Sorğu başlığı <span className="text-red-500">*</span>
          </Label>
          <Input
            id="survey-title"
            value={formData.title}
            onChange={(e) => onInputChange('title', e.target.value)}
            placeholder="Sorğunun başlığını daxil edin..."
            maxLength={maxTitleLength}
            disabled={!isEditable}
            className={!formData.title.trim() ? 'border-red-300 focus:border-red-500' : ''}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              Qısa və aydın başlıq yazın
            </p>
            <span className={`text-xs ${
              formData.title.length > maxTitleLength * 0.9 
                ? 'text-red-500' 
                : 'text-muted-foreground'
            }`}>
              {formData.title.length}/{maxTitleLength}
            </span>
          </div>
          {!formData.title.trim() && (
            <p className="text-xs text-red-500 mt-1">
              Başlıq mütləqdir
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="survey-description">Təsvir</Label>
          <Textarea
            id="survey-description"
            value={formData.description || ''}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="Sorğu haqqında ətraflı məlumat verin..."
            maxLength={maxDescriptionLength}
            disabled={!isEditable}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-muted-foreground">
              İstifadəçilərə sorğunun məqsədini izah edin
            </p>
            <span className={`text-xs ${
              (formData.description?.length || 0) > maxDescriptionLength * 0.9 
                ? 'text-red-500' 
                : 'text-muted-foreground'
            }`}>
              {formData.description?.length || 0}/{maxDescriptionLength}
            </span>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date" className="flex items-center space-x-1">
              <CalendarIcon className="h-4 w-4" />
              <span>Başlama tarixi</span>
            </Label>
            <Input
              id="start-date"
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => onInputChange('start_date', e.target.value)}
              disabled={!isEditable}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <Label htmlFor="end-date" className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Bitmə tarixi</span>
            </Label>
            <Input
              id="end-date"
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => onInputChange('end_date', e.target.value)}
              disabled={!isEditable}
              min={formData.start_date || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Survey Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sorğu parametrləri</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={(checked) => onInputChange('is_anonymous', checked)}
                disabled={!isEditable}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Anonim sorğu
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="multiple-responses"
                checked={formData.allow_multiple_responses}
                onCheckedChange={(checked) => onInputChange('allow_multiple_responses', checked)}
                disabled={!isEditable}
              />
              <Label htmlFor="multiple-responses" className="text-sm">
                Çoxsaylı cavab verməyə icazə ver
              </Label>
            </div>
          </div>
        </div>

        {/* Max Responses */}
        {formData.allow_multiple_responses && (
          <div>
            <Label htmlFor="max-responses">Maksimum cavab sayı</Label>
            <Input
              id="max-responses"
              type="number"
              value={formData.max_responses || ''}
              onChange={(e) => onInputChange('max_responses', parseInt(e.target.value) || undefined)}
              placeholder="Məhdudiyyət olmayacaq"
              min="1"
              disabled={!isEditable}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Boş saxlasanız, məhdudiyyət olmayacaq
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            💡 Məsləhətlər
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Başlıq qısa və aydın olmalıdır</li>
            <li>• Təsvirdə sorğunun məqsədini izah edin</li>
            <li>• Tarixi diapazonunu dəqiq təyin edin</li>
            <li>• Anonim sorğularda istifadəçi məlumatları toplanmır</li>
          </ul>
        </div>
      </div>
    </div>
  );
};