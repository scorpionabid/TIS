import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, Plus, X } from 'lucide-react';
import { SortableQuestionList } from './SortableQuestionList';
import { QuestionEditForm } from './QuestionEditForm';
import type { Survey } from '@/types/surveys';
import type { Question } from '@/types/surveyModal';

interface Step2QuestionsProps {
  questions: Question[];
  newQuestion: Partial<Question>;
  editingQuestion: Partial<Question> | null;
  editingQuestionId: string | null;
  isPublishedWithResponses: boolean;
  restrictionsLoading: boolean;
  isLoading: boolean;
  questionRestrictions: Record<string, any>;
  MAX_QUESTION_LENGTH: number;
  MAX_DESCRIPTION_LENGTH: number;
  needsOptions: boolean;
  needsNumberValidation: boolean;
  needsFileValidation: boolean;
  needsMatrixConfiguration: boolean;
  needsRatingConfiguration: boolean;
  questionTypes: Array<{ value: string; label: string }>;
  setQuestions: (questions: Question[]) => void;
  setNewQuestion: React.Dispatch<React.SetStateAction<Partial<Question>>>;
  getQuestionRestrictions: (id: string) => any;
  startEditingQuestion: (question: Question) => void;
  removeQuestion: (id: string) => void;
  updateEditingQuestion: (field: keyof Question, value: any) => void;
  addEditingQuestionOption: () => void;
  updateEditingQuestionOption: (index: number, value: string) => void;
  removeEditingQuestionOption: (index: number) => void;
  saveEditingQuestion: () => void;
  cancelEditingQuestion: () => void;
  addQuestion: () => void;
  addOption: () => void;
  updateOption: (index: number, value: string) => void;
  removeOption: (index: number) => void;
  addTableRow: () => void;
  updateTableRow: (index: number, value: string) => void;
  removeTableRow: (index: number) => void;
  addTableColumn: () => void;
  updateTableColumn: (index: number, value: string) => void;
  removeTableColumn: (index: number) => void;
  toast: (options: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

export function Step2Questions({
  questions,
  newQuestion,
  editingQuestion,
  editingQuestionId,
  isPublishedWithResponses,
  restrictionsLoading,
  isLoading,
  questionRestrictions,
  MAX_QUESTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  needsOptions,
  needsNumberValidation,
  needsFileValidation,
  needsMatrixConfiguration,
  needsRatingConfiguration,
  questionTypes,
  setQuestions,
  setNewQuestion,
  getQuestionRestrictions,
  startEditingQuestion,
  removeQuestion,
  updateEditingQuestion,
  addEditingQuestionOption,
  updateEditingQuestionOption,
  removeEditingQuestionOption,
  saveEditingQuestion,
  cancelEditingQuestion,
  addQuestion,
  addOption,
  updateOption,
  removeOption,
  addTableRow,
  updateTableRow,
  removeTableRow,
  addTableColumn,
  updateTableColumn,
  removeTableColumn,
  toast,
}: Step2QuestionsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Mövcud Suallar ({questions.length})</h3>
          {restrictionsLoading && isPublishedWithResponses && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Məhdudiyyətlər yüklənir...
            </div>
          )}
        </div>

        {/* Restrictions Summary */}
        {!restrictionsLoading && Object.keys(questionRestrictions).length > 0 && isPublishedWithResponses && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Məhdud Edit Rejimi</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {(() => {
                    const totalQuestions = questions.length;
                    const restrictedQuestions = questions.filter(q =>
                      getQuestionRestrictions(q.id)?.approved_responses_count > 0
                    ).length;
                    const editableQuestions = totalQuestions - restrictedQuestions;

                    return (
                      <>
                        <p>• <strong>{editableQuestions}</strong> sual tam dəyişdirilə bilər</p>
                        <p>• <strong>{restrictedQuestions}</strong> sualın təsdiq edilmiş cavabları var və məhdudiyyətlidir</p>
                        <p>• Yeni suallar əlavə edilə bilər</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sortable Question List */}
        <SortableQuestionList
          questions={questions}
          onReorder={(reorderedQuestions) => {
            setQuestions(reorderedQuestions);
            toast({
              title: "Sıralama dəyişdi",
              description: "Sualların sırası uğurla yeniləndi",
            });
          }}
          editingQuestionId={editingQuestionId}
          isPublishedWithResponses={isPublishedWithResponses}
          restrictionsLoading={restrictionsLoading}
          getQuestionRestrictions={getQuestionRestrictions}
          onStartEditing={startEditingQuestion}
          onRemove={removeQuestion}
          renderEditMode={(question) => {
            if (!editingQuestion || editingQuestionId !== question.id) {
              return null;
            }

            return (
              <QuestionEditForm
                question={question}
                editingQuestion={editingQuestion}
                isPublishedWithResponses={isPublishedWithResponses}
                isLoading={isLoading}
                MAX_QUESTION_LENGTH={MAX_QUESTION_LENGTH}
                MAX_DESCRIPTION_LENGTH={MAX_DESCRIPTION_LENGTH}
                getQuestionRestrictions={getQuestionRestrictions}
                updateEditingQuestion={updateEditingQuestion}
                addOptionToEditingQuestion={addEditingQuestionOption}
                updateEditingQuestionOption={updateEditingQuestionOption}
                removeEditingQuestionOption={removeEditingQuestionOption}
                onSave={saveEditingQuestion}
                onCancel={cancelEditingQuestion}
              />
            );
          }}
        />
      </div>

      {/* Add New Question Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Yeni sual əlavə et</h4>

        <div className="space-y-4">
          {/* Question Text */}
          <div className="space-y-2">
            <Label>Sual mətni *</Label>
            <Textarea
              value={newQuestion.question || ''}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Sualınızı daxil edin..."
              rows={2}
            />
          </div>

          {/* Question Type and Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sual növü</Label>
              <Select
                value={newQuestion.type || 'text'}
                onValueChange={(value) => setNewQuestion(prev => {
                  const nextType = value as Question['type'];

                  if (nextType === 'table_matrix') {
                    return {
                      ...prev,
                      type: nextType,
                      options: [],
                      tableRows: prev.tableRows && prev.tableRows.length > 0
                        ? prev.tableRows
                        : ['Sətir 1', 'Sətir 2'],
                      tableHeaders: prev.tableHeaders && prev.tableHeaders.length > 0
                        ? prev.tableHeaders
                        : ['Sütun 1', 'Sütun 2'],
                      min_value: undefined,
                      max_value: undefined,
                      max_file_size: undefined,
                      allowed_file_types: undefined,
                      rating_min: undefined,
                      rating_max: undefined,
                      rating_min_label: undefined,
                      rating_max_label: undefined,
                    };
                  }

                  const resetOptions = ['single_choice', 'multiple_choice'].includes(nextType)
                    ? prev.options || []
                    : [];

                  return {
                    ...prev,
                    type: nextType,
                    options: resetOptions,
                    tableRows: nextType === 'table_matrix' ? prev.tableRows : undefined,
                    tableHeaders: nextType === 'table_matrix' ? prev.tableHeaders : undefined,
                    min_value: nextType === 'number' ? prev.min_value : undefined,
                    max_value: nextType === 'number' ? prev.max_value : undefined,
                    max_file_size: nextType === 'file_upload' ? (prev.max_file_size || 10 * 1024 * 1024) : undefined,
                    allowed_file_types: nextType === 'file_upload' ? prev.allowed_file_types : undefined,
                    rating_min: nextType === 'rating' ? (prev.rating_min ?? 1) : undefined,
                    rating_max: nextType === 'rating' ? (prev.rating_max ?? 5) : undefined,
                    rating_min_label: nextType === 'rating' ? (prev.rating_min_label ?? 'Pis') : undefined,
                    rating_max_label: nextType === 'rating' ? (prev.rating_max_label ?? 'Əla') : undefined,
                  };
                })}
              >
                <SelectTrigger>
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
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={Boolean(newQuestion.required)}
                  onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, required: Boolean(checked) }))}
                />
                <Label htmlFor="required" className="text-sm font-normal cursor-pointer">
                  Məcburi sual
                </Label>
              </div>
            </div>
          </div>

          {/* Options for choice questions */}
          {needsOptions && (
            <div className="space-y-2">
              <Label>Seçim variantları</Label>
              <div className="space-y-2">
                {(newQuestion.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Seçim ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Seçim əlavə et
                </Button>
              </div>
            </div>
          )}

          {/* Number validation */}
          {needsNumberValidation && (
            <div className="space-y-2">
              <Label>Rəqəm tənzimləmələri</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Minimum dəyər</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newQuestion.min_value ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      min_value: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Maksimum dəyər</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={newQuestion.max_value ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      max_value: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* File upload validation */}
          {needsFileValidation && (
            <div className="space-y-2">
              <Label>Fayl yükləmə tənzimləmələri</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Maksimum fayl ölçüsü (MB)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={newQuestion.max_file_size ? Math.round(newQuestion.max_file_size / (1024 * 1024)) : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setNewQuestion(prev => ({
                        ...prev,
                        max_file_size: rawValue ? Number(rawValue) * 1024 * 1024 : undefined
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">İcazəli formatlar</Label>
                  <Select
                    value={newQuestion.allowed_file_types?.join(',') || undefined}
                    onValueChange={(value) => {
                      const formats = value.split(',');
                      setNewQuestion(prev => ({
                        ...prev,
                        allowed_file_types: formats
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Format seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="doc,docx">Word</SelectItem>
                      <SelectItem value="xls,xlsx">Excel</SelectItem>
                      <SelectItem value="jpg,png">Şəkil</SelectItem>
                      <SelectItem value="pdf,doc,docx,xls,xlsx">Sənədlər</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Rating configuration */}
          {needsRatingConfiguration && (
            <div className="space-y-2">
              <Label>Qiymətləndirmə tənzimləmələri</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Minimum bal</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newQuestion.rating_min ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      rating_min: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Maksimum bal</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newQuestion.rating_max ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      rating_max: e.target.value === '' ? undefined : Number(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Minimum etiket</Label>
                  <Input
                    value={newQuestion.rating_min_label ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      rating_min_label: e.target.value || undefined
                    }))}
                    placeholder="Məs: Pis"
                  />
                </div>
                <div>
                  <Label className="text-xs">Maksimum etiket</Label>
                  <Input
                    value={newQuestion.rating_max_label ?? ''}
                    onChange={(e) => setNewQuestion(prev => ({
                      ...prev,
                      rating_max_label: e.target.value || undefined
                    }))}
                    placeholder="Məs: Əla"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Table/Matrix configuration */}
          {needsMatrixConfiguration && (
            <div className="space-y-4">
              <div>
                <Label>Cədvəl sətirləri</Label>
                <div className="space-y-2 mt-2">
                  {(newQuestion.tableRows || []).map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                        {index + 1}
                      </Badge>
                      <Input
                        value={row}
                        onChange={(e) => updateTableRow(index, e.target.value)}
                        placeholder={`Sətir ${index + 1} adı`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTableRow(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTableRow}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Sətir əlavə et
                  </Button>
                </div>
              </div>

              <div>
                <Label>Cədvəl sütunları</Label>
                <div className="space-y-2 mt-2">
                  {(newQuestion.tableHeaders || []).map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                        {index + 1}
                      </Badge>
                      <Input
                        value={header}
                        onChange={(e) => updateTableColumn(index, e.target.value)}
                        placeholder={`Sütun ${index + 1} adı`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTableColumn(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTableColumn}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Sütun əlavə et
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Question Button */}
          <Button
            type="button"
            onClick={addQuestion}
            disabled={isPublishedWithResponses}
            title={isPublishedWithResponses ? 'Yayımlanmış sorğuda yeni sual əlavə etmək olmaz' : 'Yeni sual əlavə et'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Sualı əlavə et
          </Button>
        </div>
      </div>
    </div>
  );
}
