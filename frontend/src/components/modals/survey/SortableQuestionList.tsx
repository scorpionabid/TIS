import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableQuestionItem } from './SortableQuestionItem';
import type { Question } from '@/types/surveyModal';

interface SortableQuestionListProps {
  questions: Question[];
  onReorder: (questions: Question[]) => void;
  editingQuestionId: string | null;
  isPublishedWithResponses: boolean;
  restrictionsLoading: boolean;
  getQuestionRestrictions: (id: string) => any;
  onStartEditing: (question: Question) => void;
  onRemove: (id: string) => void;
  renderEditMode?: (question: Question) => React.ReactNode;
}

export function SortableQuestionList({
  questions,
  onReorder,
  editingQuestionId,
  isPublishedWithResponses,
  restrictionsLoading,
  getQuestionRestrictions,
  onStartEditing,
  onRemove,
  renderEditMode,
}: SortableQuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum 8px movement to activate drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const reordered = arrayMove(questions, oldIndex, newIndex);

    // Update order property for each question
    const reorderedWithOrder = reordered.map((q, idx) => ({
      ...q,
      order: idx + 1,
    }));

    onReorder(reorderedWithOrder);
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Hələlik sual əlavə edilməyib</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={questions.map(q => q.id!)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {questions.map((question, index) => {
            // Check if this question is being edited
            const isEditing = editingQuestionId === question.id;

            return (
              <SortableQuestionItem
                key={question.id}
                question={question}
                index={index}
                isEditing={isEditing}
                isPublishedWithResponses={isPublishedWithResponses}
                restrictionsLoading={restrictionsLoading}
                getQuestionRestrictions={getQuestionRestrictions}
                onStartEditing={onStartEditing}
                onRemove={onRemove}
                renderEditMode={renderEditMode}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
