import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Info, ArrowRightCircle, Search, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { taskDelegationService, EligibleDelegate } from '@/services/taskDelegation';
import { Task } from '@/services/tasks';
import { cn } from '@/lib/utils';

interface TaskDelegationModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  onSuccess: () => void;
}

// Helper function: Get role level color
const getLevelColor = (level: number): string => {
  switch (level) {
    case 3: return 'bg-blue-100 text-blue-800 border-blue-300';  // regionoperator
    case 4: return 'bg-green-100 text-green-800 border-green-300'; // sektoradmin
    case 5: return 'bg-purple-100 text-purple-800 border-purple-300'; // schooladmin
    case 6: return 'bg-orange-100 text-orange-800 border-orange-300'; // muavin, ubr, etc
    case 7: return 'bg-pink-100 text-pink-800 border-pink-300'; // müəllim
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function TaskDelegationModal({
  open,
  onClose,
  task,
  onSuccess,
}: TaskDelegationModalProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: eligibleUsers, isLoading } = useQuery({
    queryKey: ['eligible-delegates', task.id],
    queryFn: () => taskDelegationService.getEligibleDelegates(task.id),
    enabled: open,
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!eligibleUsers) return [];

    if (!searchQuery.trim()) return eligibleUsers;

    const query = searchQuery.toLowerCase();
    return eligibleUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.institution.name.toLowerCase().includes(query) ||
      user.role_display.toLowerCase().includes(query)
    );
  }, [eligibleUsers, searchQuery]);

  // Group users by role
  const groupedUsers = useMemo(() => {
    const groups: Record<string, EligibleDelegate[]> = {};

    filteredUsers.forEach(user => {
      const roleKey = user.role_display || 'Digər';
      if (!groups[roleKey]) groups[roleKey] = [];
      groups[roleKey].push(user);
    });

    // Sort groups by role level (lower level first)
    return Object.entries(groups).sort((a, b) => {
      const levelA = a[1][0]?.role_level || 999;
      const levelB = b[1][0]?.role_level || 999;
      return levelA - levelB;
    });
  }, [filteredUsers]);

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
    setSearchQuery('');
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
            <div className="flex items-center justify-between mb-2">
              <Label>Yeni məsul şəxs seçin *</Label>
              {eligibleUsers && eligibleUsers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filteredUsers.length} / {eligibleUsers.length} nəfər
                </Badge>
              )}
            </div>

            {/* Search Input */}
            {eligibleUsers && eligibleUsers.length > 0 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ad, email, müəssisə və ya rol axtar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            <RadioGroup
              value={selectedUserId?.toString()}
              onValueChange={(v) => setSelectedUserId(Number(v))}
            >
              <ScrollArea className="h-[350px] border rounded-lg p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">İstifadəçilər yüklənir...</span>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  groupedUsers.map(([roleDisplay, users]) => (
                    <div key={roleDisplay} className="mb-4 last:mb-0">
                      {/* Role Group Header */}
                      <div className="flex items-center justify-between px-2 py-1 mb-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {roleDisplay}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getLevelColor(users[0]?.role_level || 0))}
                        >
                          {users.length}
                        </Badge>
                      </div>

                      {/* Users in this role */}
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className={cn(
                            "flex items-center space-x-3 mb-2 p-3 rounded-lg border transition-all",
                            selectedUserId === user.id
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "hover:bg-accent hover:border-border border-transparent"
                          )}
                        >
                          <RadioGroupItem value={user.id.toString()} id={`user-${user.id}`} />
                          <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                <div className="text-sm text-muted-foreground truncate mt-0.5">
                                  {user.institution.name}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn("shrink-0", getLevelColor(user.role_level))}
                              >
                                {user.role_display}
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ))
                ) : eligibleUsers && eligibleUsers.length > 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Axtarış nəticəsi tapılmadı</p>
                    <p className="text-xs text-muted-foreground mt-1">"{searchQuery}" üzrə heç bir istifadəçi yoxdur</p>
                  </div>
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
