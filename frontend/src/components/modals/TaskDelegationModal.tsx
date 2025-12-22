import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Info, ArrowRightCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { taskDelegationService } from '@/services/taskDelegation';
import { Task } from '@/services/tasks';

interface TaskDelegationModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  onSuccess: () => void;
}

export function TaskDelegationModal({
  open,
  onClose,
  task,
  onSuccess,
}: TaskDelegationModalProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const { data: eligibleUsers, isLoading } = useQuery({
    queryKey: ['eligible-delegates', task.id],
    queryFn: () => taskDelegationService.getEligibleDelegates(task.id),
    enabled: open,
  });

  const delegateMutation = useMutation({
    mutationFn: () =>
      taskDelegationService.delegate(task.id, {
        new_assignee_id: selectedUserId!,
        delegation_reason: reason || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Tapşırıq uğurla yönləndirildi',
      });
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error?.response?.data?.message || 'Tapşırıq yönləndirilərkən xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setSelectedUserId(null);
    setReason('');
    onClose();
  };

  const handleDelegate = () => {
    if (!selectedUserId) return;
    delegateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5" />
            Tapşırığı Yönləndir
          </DialogTitle>
          <DialogDescription>
            Tapşırığı eyni müəssisədən olan digər məsul şəxsə yönləndirin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tapşırıq: {task.title}</AlertTitle>
            <AlertDescription>Hazırki məsul: {task.user_assignment?.assigned_user?.name || 'Məlum deyil'}</AlertDescription>
          </Alert>

          {/* User Selection */}
          <div>
            <Label>Yeni məsul şəxs seçin *</Label>
            <RadioGroup
              value={selectedUserId?.toString()}
              onValueChange={(v) => setSelectedUserId(Number(v))}
              className="mt-2"
            >
              <ScrollArea className="h-[250px] border rounded-lg p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">İstifadəçilər yüklənir...</span>
                  </div>
                ) : eligibleUsers && eligibleUsers.length > 0 ? (
                  eligibleUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 mb-3 p-2 hover:bg-accent rounded-md">
                      <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                      <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.institution.name}</div>
                          </div>
                          <Badge variant="outline">{user.role_display}</Badge>
                        </div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Uyğun istifadəçi tapılmadı
                  </div>
                )}
              </ScrollArea>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div>
            <Label>Səbəb (isteğe bağlı)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Yönləndirmə səbəbini qeyd edin..."
              rows={3}
              maxLength={500}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">{reason.length}/500 simvol</p>
          </div>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Qeyd: Tapşırıq yalnız 1 dəfə yönləndirilə bilər. Yönləndirdikdən sonra yeni məsul tapşırığı yerinə yetirə bilər.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={delegateMutation.isPending}>
            İmtina
          </Button>
          <Button onClick={handleDelegate} disabled={!selectedUserId || delegateMutation.isPending}>
            {delegateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yönləndir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
