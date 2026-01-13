/**
 * useKeyboardNavigation Hook
 *
 * Handles keyboard navigation between cells (Tab, Shift+Tab, Arrow keys)
 */

import { useCallback, useEffect, useRef } from 'react';
import { CellPosition, NavigationDirection } from '../types';
import { excelColumns, getColumnIndex } from '../columns';

interface UseKeyboardNavigationProps {
  totalRows: number;
  isEditing: boolean;
  currentCell: CellPosition | null;
  onNavigate: (position: CellPosition) => void;
  onStartEdit: (position: CellPosition) => void;
}

export function useKeyboardNavigation({
  totalRows,
  isEditing,
  currentCell,
  onNavigate,
  onStartEdit,
}: UseKeyboardNavigationProps) {
  const navigationEnabledRef = useRef(true);

  /**
   * Get next cell position based on direction
   */
  const getNextPosition = useCallback(
    (current: CellPosition, direction: NavigationDirection): CellPosition | null => {
      const editableColumns = excelColumns.filter((col) => col.editable);
      const currentColIndex = editableColumns.findIndex(
        (col) => getColumnIndex(col.id) === current.columnIndex
      );

      let nextRowIndex = current.rowIndex;
      let nextColIndex = currentColIndex;

      switch (direction) {
        case 'tab':
        case 'right':
          nextColIndex++;
          if (nextColIndex >= editableColumns.length) {
            nextColIndex = 0;
            nextRowIndex++;
          }
          break;

        case 'left':
          nextColIndex--;
          if (nextColIndex < 0) {
            nextColIndex = editableColumns.length - 1;
            nextRowIndex--;
          }
          break;

        case 'down':
          nextRowIndex++;
          break;

        case 'up':
          nextRowIndex--;
          break;

        case 'enter':
          // Enter moves down to same column
          nextRowIndex++;
          break;

        default:
          return null;
      }

      // Boundary checks
      if (nextRowIndex < 0 || nextRowIndex >= totalRows) {
        return null;
      }

      if (nextColIndex < 0 || nextColIndex >= editableColumns.length) {
        return null;
      }

      return {
        rowIndex: nextRowIndex,
        columnIndex: getColumnIndex(editableColumns[nextColIndex].id),
      };
    },
    [totalRows]
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!navigationEnabledRef.current || !currentCell) return;

      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Only allow Enter and Esc when editing
        if (isEditing && (e.key === 'Enter' || e.key === 'Escape')) {
          return; // Let the cell handle it
        }
        return;
      }

      let direction: NavigationDirection | null = null;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          direction = e.shiftKey ? 'left' : 'tab';
          break;
        case 'ArrowLeft':
          e.preventDefault();
          direction = 'left';
          break;
        case 'ArrowRight':
          e.preventDefault();
          direction = 'right';
          break;
        case 'ArrowUp':
          e.preventDefault();
          direction = 'up';
          break;
        case 'ArrowDown':
          e.preventDefault();
          direction = 'down';
          break;
        case 'Enter':
          if (!isEditing) {
            e.preventDefault();
            // Start editing current cell
            onStartEdit(currentCell);
            return;
          }
          break;
        default:
          return;
      }

      if (direction) {
        const nextPosition = getNextPosition(currentCell, direction);
        if (nextPosition) {
          onNavigate(nextPosition);
        }
      }
    },
    [currentCell, isEditing, getNextPosition, onNavigate, onStartEdit]
  );

  /**
   * Attach keyboard event listeners
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /**
   * Enable/disable navigation
   */
  const setNavigationEnabled = useCallback((enabled: boolean) => {
    navigationEnabledRef.current = enabled;
  }, []);

  return {
    setNavigationEnabled,
  };
}
