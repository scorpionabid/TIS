import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Task, UserAssignmentSummary } from '@/services/tasks';

interface TaskCancellationDialogProps {
  open: boolean;
  context: { task: Task; assignment: UserAssignmentSummary } | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isPending: boolean;
  isValid: boolean;
}

export const TaskCancellationDialog: React.FC<TaskCancellationDialogProps> = ({
  open,
  context,
  reason,
  onReasonChange,
  onSubmit,
  onClose,
  isPending,
  isValid,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tapşırığı ləğv et</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {context?.task.title ?? 'Tapşırıq'} üçün səbəb daxil edin.
          </p>

          <div>
            <Label htmlFor="decision-reason">Səbəb</Label>
            <Textarea
              id="decision-reason"
              rows={4}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Niyə icra edilmədiyini izah edin..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Səbəb ən azı 5 simvol olmalıdır.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Ləğv et
          </Button>
          <Button onClick={onSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Səbəbi göndər
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
