/**
 * BulkEditToolbar Component
 *
 * Toolbar for bulk editing selected tasks
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateTaskData } from '@/services/tasks';
import { priorityOptions, statusLabels } from '../config/taskFormFields';
import { CheckSquare, X, Edit3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkEditToolbarProps {
  selectedCount: number;
  isUpdating: boolean;
  onBulkUpdate: (data: Partial<UpdateTaskData>) => Promise<void>;
  onClearSelection: () => void;
  onExitSelectionMode: () => void;
}

export function BulkEditToolbar({
  selectedCount,
  isUpdating,
  onBulkUpdate,
  onClearSelection,
  onExitSelectionMode,
}: BulkEditToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    try {
      await onBulkUpdate({ status: status as UpdateTaskData['status'] });
      setIsOpen(false);
    } catch (error) {
      console.error('[BulkEditToolbar] Status update failed', error);
    }
  };

  const handlePriorityUpdate = async (priority: string) => {
    try {
      await onBulkUpdate({ priority: priority as UpdateTaskData['priority'] });
      setIsOpen(false);
    } catch (error) {
      console.error('[BulkEditToolbar] Priority update failed', error);
    }
  };

  const statusOptions = [
    { value: 'pending', label: statusLabels.pending },
    { value: 'in_progress', label: statusLabels.in_progress },
    { value: 'review', label: statusLabels.review },
    { value: 'completed', label: statusLabels.completed },
    { value: 'cancelled', label: statusLabels.cancelled },
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border-b">
      <CheckSquare className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">
        {selectedCount} tapşırıq seçildi
      </span>

      <div className="flex gap-2 ml-auto">
        {/* Bulk Status Update */}
        <DropdownMenu open={isOpen && !isUpdating} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating || selectedCount === 0}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Status Dəyiş
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Status seçin</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusUpdate(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bulk Priority Update */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating || selectedCount === 0}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Prioritet Dəyiş
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Prioritet seçin</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {priorityOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePriorityUpdate(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isUpdating}
          className="gap-2"
        >
          Seçimi Təmizlə
        </Button>

        {/* Exit Selection Mode */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitSelectionMode}
          disabled={isUpdating}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yenilənir...
        </div>
      )}
    </div>
  );
}
