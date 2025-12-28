import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Send, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApprovalService } from '@/services/taskApproval';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

interface TaskApprovalActionsProps {
  task: any; // TODO: Add proper Task type
  userCanApprove: boolean;
  userIsCreator: boolean;
}

export function TaskApprovalActions({
  task,
  userCanApprove,
  userIsCreator,
}: TaskApprovalActionsProps) {
  const [notes, setNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const queryClient = useQueryClient();

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: () => taskApprovalService.submitForApproval(task.id),
    onSuccess: (data) => {
      toast.success(data.message || 'Tapşırıq təsdiq üçün göndərildi');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xəta baş verdi');
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (approvalNotes?: string) =>
      taskApprovalService.approve(task.id, approvalNotes),
    onSuccess: (data) => {
      toast.success(data.message || 'Tapşırıq təsdiqləndi');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xəta baş verdi');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (rejectionNotes: string) =>
      taskApprovalService.reject(task.id, rejectionNotes),
    onSuccess: (data) => {
      toast.success(data.message || 'Tapşırıq rədd edildi');
      setShowRejectForm(false);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xəta baş verdi');
    },
  });

  // Show submit button for task creator when task is completed and not yet submitted
  if (
    userIsCreator &&
    task.status === 'completed' &&
    task.requires_approval &&
    (!task.approval_status || task.approval_status === 'rejected')
  ) {
    return (
      <div className="space-y-3">
        <Button
          onClick={() => submitForApprovalMutation.mutate()}
          disabled={submitForApprovalMutation.isPending}
          className="w-full"
        >
          {submitForApprovalMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Göndərilir...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Təsdiq üçün göndər
            </>
          )}
        </Button>
        {task.approval_status === 'rejected' && task.approval_notes && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800 mb-1">Rədd səbəbi:</p>
            <p className="text-sm text-red-700">{task.approval_notes}</p>
          </div>
        )}
      </div>
    );
  }

  // Show approve/reject buttons for approver when task is pending approval
  if (userCanApprove && task.approval_status === 'pending') {
    return (
      <div className="space-y-4">
        {showRejectForm ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="reject-notes" className="text-sm font-medium">
                Rədd səbəbi (məcburi)
              </Label>
              <Textarea
                id="reject-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tapşırığın nəyə görə rədd edildiyini qeyd edin..."
                className="min-h-[100px] mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setNotes('');
                }}
                className="flex-1"
                disabled={rejectMutation.isPending}
              >
                İmtina
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate(notes)}
                disabled={!notes.trim() || rejectMutation.isPending}
                className="flex-1"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rədd edilir...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rədd et
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="flex-1"
                disabled={approveMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rədd et
              </Button>
              <Button
                onClick={() => approveMutation.mutate(notes)}
                disabled={approveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Təsdiq edilir...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Təsdiqlə
                  </>
                )}
              </Button>
            </div>

            <div>
              <Label htmlFor="approval-notes" className="text-sm text-muted-foreground">
                Qeyd (opsional)
              </Label>
              <Textarea
                id="approval-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Təsdiq qeydi əlavə edin..."
                className="mt-2"
                disabled={showRejectForm}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // No actions available
  return null;
}
