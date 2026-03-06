/**
 * useInlineEdit Hook
 *
 * Manages inline cell editing state and operations
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, UpdateTaskData } from '@/services/tasks';
import { useToast } from '@/hooks/use-toast';
import { CellEditState, ColumnId } from '../types';

export function useInlineEdit() {
  const [editingCell, setEditingCell] = useState<CellEditState | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: UpdateTaskData }) =>
      taskService.update(taskId, data),
    onSuccess: () => {
      // Invalidate tasks query to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      toast({
        title: 'Uğurlu',
        description: 'Tapşırıq yeniləndi',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error?.message || 'Tapşırıq yenilənərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  /**
   * Start editing a cell
   */
  const startEdit = useCallback((taskId: number, columnId: ColumnId, value: any) => {
    setEditingCell({
      taskId,
      columnId,
      value,
      originalValue: value,
    });
  }, []);

  /**
   * Save cell edit
   */
  const saveEdit = useCallback(
    async (taskId: number, data: Partial<UpdateTaskData>) => {
      try {
        await updateMutation.mutateAsync({ taskId, data });
        setEditingCell(null);
      } catch (error) {
        // Error handled by mutation onError
        console.error('Failed to save edit:', error);
      }
    },
    [updateMutation]
  );

  /**
   * Cancel editing and revert to original value
   */
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  /**
   * Check if a cell is being edited
   */
  const isEditing = useCallback(
    (taskId: number, columnId: ColumnId): boolean => {
      return (
        editingCell !== null &&
        editingCell.taskId === taskId &&
        editingCell.columnId === columnId
      );
    },
    [editingCell]
  );

  return {
    editingCell,
    startEdit,
    saveEdit,
    cancelEdit,
    isEditing,
    isSaving: updateMutation.isPending,
  };
}
