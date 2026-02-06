import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import type { Question } from '@/types/surveyModal';

const questionTypes = [
  { value: 'text', label: 'Mətn sahəsi' },
  { value: 'number', label: 'Rəqəm sahəsi' },
  { value: 'date', label: 'Tarix seçimi' },
  { value: 'single_choice', label: 'Tək seçim' },
  { value: 'multiple_choice', label: 'Çox seçim' },
  { value: 'file_upload', label: 'Fayl yükləmə' },
  { value: 'rating', label: 'Qiymətləndirmə' },
  { value: 'table_matrix', label: 'Cədvəl/Matris' },
  { value: 'table_input', label: 'Dinamik cədvəl' },
];

const columnTypes = [
  { value: 'text', label: 'Mətn' },
  { value: 'number', label: 'Rəqəm' },
  { value: 'date', label: 'Tarix' },
];

const maxRowsOptions = [5, 10, 15, 20, 25, 30, 40, 50];

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
  const matrixRows = editingQuestion.tableRows || [];
  const matrixColumns = editingQuestion.tableHeaders || [];
  const tableInputColumns = editingQuestion.tableInputColumns || [];
  const isNumberQuestion = editingQuestion.type === 'number';
  const isFileQuestion = editingQuestion.type === 'file_upload';
  const isRatingQuestion = editingQuestion.type === 'rating';
  const isTableInputQuestion = editingQuestion.type === 'table_input';

  const handleTypeChange = (nextType: Question['type']) => {
    updateEditingQuestion('type', nextType);

    if (nextType === 'table_matrix') {
      if (!matrixRows.length) {
        updateEditingQuestion('tableRows', ['Sətir 1', 'Sətir 2']);
      }
      if (!matrixColumns.length) {
        updateEditingQuestion('tableHeaders', ['Sütun 1', 'Sütun 2']);
      }
    } else {
      updateEditingQuestion('tableRows', undefined);
      updateEditingQuestion('tableHeaders', undefined);
    }

    if (nextType === 'table_input') {
      if (!tableInputColumns.length) {
        updateEditingQuestion('tableInputColumns', [
          { key: 'col_1', label: 'Sütun 1', type: 'text' },
          { key: 'col_2', label: 'Sütun 2', type: 'text' },
        ]);
      }
      if (!editingQuestion.tableInputMaxRows) {
        updateEditingQuestion('tableInputMaxRows', 20);
      }
    } else {
      updateEditingQuestion('tableInputColumns', undefined);
      updateEditingQuestion('tableInputMaxRows', undefined);
    }

    if (nextType !== 'number') {
      updateEditingQuestion('min_value', undefined);
      updateEditingQuestion('max_value', undefined);
    }

    if (nextType !== 'file_upload') {
      updateEditingQuestion('max_file_size', undefined);
      updateEditingQuestion('allowed_file_types', undefined);
    }

    if (nextType !== 'rating') {
      updateEditingQuestion('rating_min', undefined);
      updateEditingQuestion('rating_max', undefined);
      updateEditingQuestion('rating_min_label', undefined);
      updateEditingQuestion('rating_max_label', undefined);
    } else {
      updateEditingQuestion('rating_min', editingQuestion.rating_min ?? 1);
      updateEditingQuestion('rating_max', editingQuestion.rating_max ?? 5);
      updateEditingQuestion('rating_min_label', editingQuestion.rating_min_label ?? 'Pis');
      updateEditingQuestion('rating_max_label', editingQuestion.rating_max_label ?? 'Əla');
    }
  };

  const addMatrixRow = () => {
    updateEditingQuestion('tableRows', [...matrixRows, `Sətir ${matrixRows.length + 1}`]);
  };

  const updateMatrixRow = (index: number, value: string) => {
    updateEditingQuestion('tableRows', matrixRows.map((row, i) => (i === index ? value : row)));
  };

  const removeMatrixRow = (index: number) => {
    updateEditingQuestion('tableRows', matrixRows.filter((_, i) => i !== index));
  };

  const addMatrixColumn = () => {
    updateEditingQuestion('tableHeaders', [...matrixColumns, `Sütun ${matrixColumns.length + 1}`]);
  };

  const updateMatrixColumn = (index: number, value: string) => {
    updateEditingQuestion('tableHeaders', matrixColumns.map((col, i) => (i === index ? value : col)));
  };

  const removeMatrixColumn = (index: number) => {
    updateEditingQuestion('tableHeaders', matrixColumns.filter((_, i) => i !== index));
  };

  // Table Input column management
  const addTableInputColumn = () => {
    const newKey = `col_${tableInputColumns.length + 1}`;
    updateEditingQuestion('tableInputColumns', [
      ...tableInputColumns,
      { key: newKey, label: `Sütun ${tableInputColumns.length + 1}`, type: 'text' as const },
    ]);
  };

  const updateTableInputColumn = (index: number, field: 'label' | 'type', value: string) => {
    updateEditingQuestion(
      'tableInputColumns',
      tableInputColumns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      )
    );
  };

  const removeTableInputColumn = (index: number) => {
    updateEditingQuestion('tableInputColumns', tableInputColumns.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg border-blue-300 bg-blue-50">
      {/* Question Text Edit */}
      <div className="space-y-2">
        <Label>
          Sual mətni {isTableInputQuestion ? '(İxtiyari)' : '*'}
        </Label>
        <Input
          value={editingQuestion.question}
          onChange={(e) => updateEditingQuestion('question', e.target.value)}
          placeholder={isTableInputQuestion ? "Sual mətni (ixtiyari - sütun adları kifayətdir)" : "Sual mətnini daxil edin"}
          maxLength={MAX_QUESTION_LENGTH}
          className={restrictions?.can_edit_text ? "bg-white" : "bg-gray-100"}
          disabled={!restrictions?.can_edit_text}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {isTableInputQuestion ? (
            <span className="text-blue-600">ℹ️ Dinamik cədvəl üçün sütun adları sual yerinə keçir</span>
          ) : restrictions?.can_edit_text ? (
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
            {questionTypes.map((type) => (
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

      {editingQuestion.type === 'table_matrix' && (
        <div className="space-y-4">
          <div>
            <Label>Cədvəl sətirləri</Label>
            <div className="space-y-2 mt-2">
              {matrixRows.map((row, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                    {index + 1}
                  </Badge>
                  <Input
                    value={row}
                    onChange={(e) => updateMatrixRow(index, e.target.value)}
                    placeholder={`Sətir ${index + 1}`}
                    className="flex-1 bg-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMatrixRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addMatrixRow}>
                <Plus className="h-4 w-4 mr-1" />
                Sətir əlavə et
              </Button>
            </div>
          </div>

          <div>
            <Label>Cədvəl sütunları</Label>
            <div className="space-y-2 mt-2">
              {matrixColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                    {index + 1}
                  </Badge>
                  <Input
                    value={column}
                    onChange={(e) => updateMatrixColumn(index, e.target.value)}
                    placeholder={`Sütun ${index + 1}`}
                    className="flex-1 bg-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMatrixColumn(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addMatrixColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Sütun əlavə et
              </Button>
            </div>
          </div>
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

      {isRatingQuestion && (
        <div className="space-y-2">
          <Label>Qiymətləndirmə tənzimləmələri</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Minimum bal</Label>
              <Input
                type="number"
                min={1}
                value={editingQuestion.rating_min ?? ''}
                onChange={(e) => updateEditingQuestion('rating_min', e.target.value === '' ? undefined : Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">Maksimum bal</Label>
              <Input
                type="number"
                min={1}
                value={editingQuestion.rating_max ?? ''}
                onChange={(e) => updateEditingQuestion('rating_max', e.target.value === '' ? undefined : Number(e.target.value))}
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">Minimum etiket</Label>
              <Input
                value={editingQuestion.rating_min_label ?? ''}
                onChange={(e) => updateEditingQuestion('rating_min_label', e.target.value || undefined)}
                placeholder="Pis"
                className="bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">Maksimum etiket</Label>
              <Input
                value={editingQuestion.rating_max_label ?? ''}
                onChange={(e) => updateEditingQuestion('rating_max_label', e.target.value || undefined)}
                placeholder="Əla"
                className="bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {isTableInputQuestion && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-700">
              <strong>Dinamik cədvəl:</strong> Cavab verənlər + düyməsi ilə sətir əlavə edə biləcəklər.
              Siz yalnız sütun başlıqlarını və tiplərini təyin edin.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cədvəl sütunları</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTableInputColumn}
                disabled={tableInputColumns.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Sütun əlavə et
              </Button>
            </div>
            <div className="space-y-2">
              {tableInputColumns.map((column, index) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                    {index + 1}
                  </Badge>
                  <Input
                    value={column.label}
                    onChange={(e) => updateTableInputColumn(index, 'label', e.target.value)}
                    placeholder={`Sütun ${index + 1}`}
                    className="flex-1 bg-white"
                  />
                  <Select
                    value={column.type}
                    onValueChange={(value) => updateTableInputColumn(index, 'type', value)}
                  >
                    <SelectTrigger className="w-28 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTableInputColumn(index)}
                    disabled={tableInputColumns.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Maksimum sətir sayı</Label>
            <Select
              value={String(editingQuestion.tableInputMaxRows ?? 20)}
              onValueChange={(value) => updateEditingQuestion('tableInputMaxRows', Number(value))}
            >
              <SelectTrigger className="w-32 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maxRowsOptions.map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} sətir
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Save/Cancel buttons */}
      <div className="flex items-center gap-2 justify-end mt-4 pt-4 border-t">
        <Button
          onClick={onSave}
          disabled={(editingQuestion.type !== 'table_input' && !editingQuestion?.question?.trim()) || isLoading}
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
