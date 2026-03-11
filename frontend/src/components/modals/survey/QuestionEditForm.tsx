import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import { QUESTION_TYPES } from '@/types/surveyModal';
import type { Question } from '@/types/surveyModal';

interface QuestionEditFormProps {
  question: Question;
  editingQuestion: Question;
  isPublishedWithResponses: boolean;
  isLoading: boolean;
  MAX_QUESTION_LENGTH: number;
  MAX_DESCRIPTION_LENGTH: number;
  getQuestionRestrictions: (id: string) => any;
  updateEditingQuestion: (field: keyof Question, value: any) => void;
  addOptionToEditingQuestion: () => void;
  updateEditingQuestionOption: (index: number, value: string) => void;
  removeEditingQuestionOption: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function QuestionEditForm({
  question,
  editingQuestion,
  isPublishedWithResponses,
  isLoading,
  MAX_QUESTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  getQuestionRestrictions,
  updateEditingQuestion,
  addOptionToEditingQuestion,
  updateEditingQuestionOption,
  removeEditingQuestionOption,
  onSave,
  onCancel,
}: QuestionEditFormProps) {
  const restrictions = getQuestionRestrictions(question.id || '');
  const isNumberQuestion = editingQuestion.type === 'number';
  const isFileQuestion = editingQuestion.type === 'file_upload';

  const handleTypeChange = (nextType: Question['type']) => {
    updateEditingQuestion('type', nextType);

    if (nextType !== 'number') {
      updateEditingQuestion('min_value', undefined);
      updateEditingQuestion('max_value', undefined);
    }

    if (nextType !== 'file_upload') {
      updateEditingQuestion('max_file_size', undefined);
      updateEditingQuestion('allowed_file_types', undefined);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg border-blue-300 bg-blue-50">
      {/* Question Text */}
      <div className="space-y-2">
        <Label>Sual mətni *</Label>
        <Input
          value={editingQuestion.question}
          onChange={(e) => updateEditingQuestion('question', e.target.value)}
          placeholder="Sual mətnini daxil edin"
          maxLength={MAX_QUESTION_LENGTH}
          className={restrictions?.can_edit_text ? 'bg-white' : 'bg-gray-100'}
          disabled={!restrictions?.can_edit_text}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {restrictions?.can_edit_text ? (
            <span className="text-green-600">✓ Bu sahə dəyişdirilə bilər</span>
          ) : (
            <span className="text-amber-600">
              ⚠️ Təsdiq edilmiş cavablar var ({restrictions?.approved_responses_count} cavab)
            </span>
          )}
          <span>{editingQuestion.question.length}/{MAX_QUESTION_LENGTH}</span>
        </div>
      </div>

      {/* Question Description Edit */}
      <div className="space-y-2">
        <Label>Sual təsviri (İxtiyari)</Label>
        <Textarea
          value={editingQuestion.description || ''}
          onChange={(e) => updateEditingQuestion('description', e.target.value)}
          placeholder="Sualın təsvirini daxil edin (ixtiyari)"
          rows={2}
          maxLength={MAX_DESCRIPTION_LENGTH}
          className="bg-white"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Bu sahə dəyişdirilə bilər</span>
          <span>{(editingQuestion.description || '').length}/{MAX_DESCRIPTION_LENGTH}</span>
        </div>
      </div>

      {/* Question Type - READONLY for published surveys */}
      <div className="space-y-2">
        <Label>Sual növü</Label>
        <Select
          value={editingQuestion.type}
          onValueChange={(value) => handleTypeChange(value as Question['type'])}
          disabled={isPublishedWithResponses}
        >
          <SelectTrigger className={isPublishedWithResponses ? "bg-gray-100" : "bg-white"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPublishedWithResponses && (
          <p className="text-xs text-amber-600">⚠️ Yayımlanmış sorğuda sual növü dəyişdirilə bilməz</p>
        )}
      </div>

      {/* Required Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`required-${question.id}`}
          checked={editingQuestion.required}
          onCheckedChange={(checked) => updateEditingQuestion('required', checked)}
          disabled={!restrictions?.can_edit_required}
        />
        <Label
          htmlFor={`required-${question.id}`}
          className={!restrictions?.can_edit_required ? "text-gray-500" : ""}
        >
          Məcburi sual
        </Label>
        {!restrictions?.can_edit_required && (
          <span className="text-xs text-amber-600">
            ⚠️ Təsdiq edilmiş cavablar var ({restrictions?.approved_responses_count} cavab)
          </span>
        )}
      </div>

      {/* Options Editing for Choice Questions */}
      {['single_choice', 'multiple_choice'].includes(editingQuestion.type) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Seçimlər</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOptionToEditingQuestion}
            >
              <Plus className="h-4 w-4 mr-1" />
              Yeni seçim
            </Button>
          </div>

          {editingQuestion.options?.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                {optionIndex + 1}
              </Badge>
              <Input
                value={option}
                onChange={(e) => updateEditingQuestionOption(optionIndex, e.target.value)}
                placeholder={`Seçim ${optionIndex + 1}`}
                className="flex-1 bg-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEditingQuestionOption(optionIndex)}
                disabled={!restrictions?.can_remove_options}
                title={!restrictions?.can_remove_options ? 'Təsdiq edilmiş cavablar var - seçimi silmək olmaz' : 'Seçimi sil'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

      {!restrictions?.can_remove_options && restrictions?.approved_responses_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs text-amber-700">
            <strong>Məhdud rejim:</strong> Bu sualın {restrictions.approved_responses_count} təsdiq edilmiş cavabı var.
            Yeni seçimlər əlavə edə bilərsiniz, lakin mövcud seçimləri silə bilməzsiniz.
          </p>
        </div>
      )}
    </div>
  )}

      {isNumberQuestion && (
        <div className="space-y-2">
          <Label>Rəqəm limitləri</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Minimum dəyər</Label>
              <Input
                type="number"
                value={editingQuestion.min_value ?? ''}
                onChange={(e) => updateEditingQuestion('min_value', e.target.value === '' ? undefined : Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">Maksimum dəyər</Label>
              <Input
                type="number"
                value={editingQuestion.max_value ?? ''}
                onChange={(e) => updateEditingQuestion('max_value', e.target.value === '' ? undefined : Number(e.target.value))}
                className="bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {isFileQuestion && (
        <div className="space-y-2">
          <Label>Fayl yükləmə tənzimləmələri</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Maksimum ölçü (MB)</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={editingQuestion.max_file_size ? Math.round(editingQuestion.max_file_size / (1024 * 1024)) : ''}
                onChange={(e) => updateEditingQuestion('max_file_size', e.target.value === '' ? undefined : Number(e.target.value) * 1024 * 1024)}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">İcazəli formatlar (vergüllə)</Label>
              <Input
                value={(editingQuestion.allowed_file_types || []).join(',')}
                onChange={(e) => {
                  const value = e.target.value;
                  const formats = value
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean);
                  updateEditingQuestion('allowed_file_types', formats.length > 0 ? formats : undefined);
                }}
                placeholder="pdf,docx,xls"
                className="bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save/Cancel buttons */}
      <div className="flex items-center gap-2 justify-end mt-4 pt-4 border-t">
        <Button
          onClick={onSave}
          disabled={!editingQuestion?.question?.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saxlanır...
            </>
          ) : (
            'Saxla'
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          İmtina
        </Button>
      </div>
    </div>
  );
}
