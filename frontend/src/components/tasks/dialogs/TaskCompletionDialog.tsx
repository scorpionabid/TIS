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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Task, UserAssignmentSummary } from '@/services/tasks';
import { COMPLETION_TYPES } from '@/hooks/tasks/useAssignmentDialogs';

interface TaskCompletionDialogProps {
  open: boolean;
  context: { task: Task; assignment: UserAssignmentSummary } | null;
  completionType: string;
  completionNotes: string;
  onCompletionTypeChange: (value: string) => void;
  onCompletionNotesChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isPending: boolean;
  isValid: boolean;
}

export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  open,
  context,
  completionType,
  completionNotes,
  onCompletionTypeChange,
  onCompletionNotesChange,
  onSubmit,
  onClose,
  isPending,
  isValid,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tapşırığı tamamla</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {context?.task.title ?? 'Tapşırıq'} üçün tamamlama məlumatı daxil edin.
          </p>

          <div className="space-y-2">
            <Label>Tamamlama növü</Label>
            <Select value={completionType} onValueChange={onCompletionTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Tamamlama növü" />
              </SelectTrigger>
              <SelectContent>
                {COMPLETION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="completion-notes">Qeydlər (isteğe bağlı)</Label>
            <Textarea
              id="completion-notes"
              rows={4}
              value={completionNotes}
              onChange={(e) => onCompletionNotesChange(e.target.value)}
              placeholder="Qısa qeydlər əlavə edin..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Ləğv et
          </Button>
          <Button onClick={onSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tamamlandı kimi qeyd et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
