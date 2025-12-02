import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit, X } from 'lucide-react';
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
];

interface SortableQuestionItemProps {
  question: Question;
  index: number;
  isEditing: boolean;
  isPublishedWithResponses: boolean;
  restrictionsLoading: boolean;
  getQuestionRestrictions: (id: string) => any;
  onStartEditing: (question: Question) => void;
  onRemove: (id: string) => void;
  renderEditMode?: (question: Question) => React.ReactNode;
}

export function SortableQuestionItem({
  question,
  index,
  isEditing,
  isPublishedWithResponses,
  restrictionsLoading,
  getQuestionRestrictions,
  onStartEditing,
  onRemove,
  renderEditMode,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const restrictions = getQuestionRestrictions(question.id || '');

  // If in edit mode and custom renderer provided, use it
  if (isEditing && renderEditMode) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-start gap-2">
        {/* Drag Handle - disabled while editing */}
        <div className="p-2 opacity-30 cursor-not-allowed">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        {/* Edit Mode Content */}
        <div className="flex-1">
          {renderEditMode(question)}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 ${isDragging ? 'z-50' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded transition-colors self-start mt-4"
        title="Sürükləyərək sıralamaq"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      {/* Question Content */}
      <div className="flex-1 p-4 border rounded-lg bg-white space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{index + 1}</Badge>
            <Badge variant="secondary">{questionTypes.find(t => t.value === question.type)?.label}</Badge>
            {question.required && <Badge variant="destructive">Məcburi</Badge>}
            {isPublishedWithResponses && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {restrictionsLoading ? 'Yüklənir...' : 'Məhdud Edit'}
              </Badge>
            )}
            {!restrictionsLoading && restrictions?.approved_responses_count > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {restrictions.approved_responses_count} Təsdiq
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStartEditing(question)}
              disabled={restrictions?.isLocked}
              title={restrictions?.isLocked ? 'Bu sual kilidlidir' : 'Redaktə et'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemove(question.id!)}
              disabled={restrictions?.canDelete === false || isPublishedWithResponses}
              title={restrictions?.canDelete === false ? 'Bu sualı silmək olmaz' : 'Sil'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <p className="font-medium text-lg break-words">{question.question}</p>
          {question.description && (
            <p className="text-sm text-gray-500 mt-1 break-words italic">{question.description}</p>
          )}
        </div>

        {/* Options */}
        {question.options && question.options.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-600">Variantlar:</p>
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline" className="text-xs min-w-[24px] text-center">
                    {i + 1}
                  </Badge>
                  <span className="break-words">{option}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
