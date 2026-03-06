/**
 * useBulkEdit Hook
 *
 * Manages bulk selection and editing of multiple tasks
 */

import { useState, useCallback } from 'react';
import { Task, UpdateTaskData, taskService } from '@/services/tasks';
import { useQueryClient } from '@tanstack/react-query';

interface UseBulkEditProps {
  tasks: Task[];
  onRefresh?: () => Promise<void>;
}

export interface BulkEditContext {
  selectedIds: Set<number>;
  isSelectionMode: boolean;
  toggleSelection: (taskId: number) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  bulkUpdate: (data: Partial<UpdateTaskData>) => Promise<void>;
  isBulkUpdating: boolean;
  selectedCount: number;
}

export function useBulkEdit({ tasks, onRefresh }: UseBulkEditProps): BulkEditContext {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const queryClient = useQueryClient();

  const toggleSelection = useCallback((taskId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === tasks.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  }, [tasks, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const bulkUpdate = useCallback(
    async (data: Partial<UpdateTaskData>) => {
      if (selectedIds.size === 0) return;

      setIsBulkUpdating(true);
      try {
        // Update all selected tasks
        const updatePromises = Array.from(selectedIds).map((taskId) =>
          taskService.update(taskId, data)
        );

        await Promise.all(updatePromises);

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });

        if (onRefresh) {
          await onRefresh();
        }

        // Clear selection after successful update
        clearSelection();
      } catch (error) {
        console.error('[useBulkEdit] Bulk update failed', error);
        throw error;
      } finally {
        setIsBulkUpdating(false);
      }
    },
    [selectedIds, queryClient, onRefresh, clearSelection]
  );

  return {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    toggleAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    bulkUpdate,
    isBulkUpdating,
    selectedCount: selectedIds.size,
  };
}
