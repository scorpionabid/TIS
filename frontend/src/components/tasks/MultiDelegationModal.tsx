import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Search, User, Building2, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { TaskSubDelegation, CreateSubDelegationRequest, User as UserType } from '@/services/tasks';

interface MultiDelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  availableUsers: UserType[];
  onDelegate: (data: CreateSubDelegationRequest) => Promise<void>;
}

interface SelectedUser {
  user_id: number;
  name: string;
  email: string;
  institution_name?: string;
  deadline?: Date;
  notes?: string;
}

export const MultiDelegationModal: React.FC<MultiDelegationModalProps> = ({
  isOpen,
  onClose,
  taskId,
  availableUsers,
  onDelegate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [globalNotes, setGlobalNotes] = useState('');
  const [globalDeadline, setGlobalDeadline] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter users based on search term
  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user is already selected
  const isUserSelected = (userId: number) =>
    selectedUsers.some((selected) => selected.user_id === userId);

  // Toggle user selection
  const toggleUserSelection = (user: UserType) => {
    if (isUserSelected(user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.user_id !== user.id));
    } else {
      setSelectedUsers([
        ...selectedUsers,
        {
          user_id: user.id,
          name: user.name,
          email: user.email,
          institution_name: user.assignedInstitution?.name,
          deadline: globalDeadline,
          notes: globalNotes,
        },
      ]);
    }
  };

  // Update all selected users with global deadline
  const updateGlobalDeadline = (deadline: Date | undefined) => {
    setGlobalDeadline(deadline);
    setSelectedUsers(selectedUsers.map((user) => ({ ...user, deadline })));
  };

  // Update all selected users with global notes
  const updateGlobalNotes = (notes: string) => {
    setGlobalNotes(notes);
    setSelectedUsers(selectedUsers.map((user) => ({ ...user, notes })));
  };

  // Update individual user deadline
  const updateUserDeadline = (userId: number, deadline: Date | undefined) => {
    setSelectedUsers(
      selectedUsers.map((user) =>
        user.user_id === userId ? { ...user, deadline } : user
      )
    );
  };

  // Update individual user notes
  const updateUserNotes = (userId: number, notes: string) => {
    setSelectedUsers(
      selectedUsers.map((user) =>
        user.user_id === userId ? { ...user, notes } : user
      )
    );
  };

  // Handle delegation submission
  const handleDelegate = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Xəta',
        description: 'Ən azı bir istifadəçi seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const delegationData: CreateSubDelegationRequest = {
        delegations: selectedUsers.map((user) => ({
          user_id: user.user_id,
          deadline: user.deadline ? user.deadline.toISOString().split('T')[0] : undefined,
          notes: user.notes,
        })),
      };

      await onDelegate(delegationData);
      
      toast({
        title: 'Uğurlu',
        description: `${selectedUsers.length} nəfərə yönləndirmə edildi`,
      });

      // Reset form
      setSelectedUsers([]);
      setSearchTerm('');
      setGlobalNotes('');
      setGlobalDeadline(undefined);
      onClose();
    } catch (error) {
      console.error('Delegation error:', error);
      toast({
        title: 'Xəta',
        description: 'Yönləndirmə zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setSearchTerm('');
      setGlobalNotes('');
      setGlobalDeadline(undefined);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tapşırığı Yönləndir</DialogTitle>
          <DialogDescription>
            Seçilmiş istifadəçilərə bu tapşırığın bir hissəsini yönləndirin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="İstifadəçiləri axtarın..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Deadline (bütün üçün)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !globalDeadline && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {globalDeadline ? (
                      format(globalDeadline, 'PPP', { locale: az })
                    ) : (
                      'Tarix seçin'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={globalDeadline}
                    onSelect={updateGlobalDeadline}
                    initialFocus
                    disabled={(date) => date < addDays(new Date(), 1)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Qeyd (bütün üçün)
              </label>
              <Textarea
                placeholder="Zəhmət olmasa hesabatları hazırlayın..."
                value={globalNotes}
                onChange={(e) => updateGlobalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                İstifadəçi tapılmadı
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = isUserSelected(user.id);
                const selectedUser = selectedUsers.find((u) => u.user_id === user.id);

                return (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => toggleUserSelection(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-gray-300"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{user.name}</span>
                          <Badge variant="secondary">{user.email}</Badge>
                        </div>
                        {user.assignedInstitution && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Building2 className="h-3 w-3" />
                            <span>{user.assignedInstitution.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && selectedUser && (
                      <div className="flex items-center space-x-2">
                        {selectedUser.deadline && (
                          <Badge variant="outline">
                            {format(selectedUser.deadline, 'dd.MM.yyyy')}
                          </Badge>
                        )}
                        {selectedUser.notes && (
                          <Badge variant="outline">Qeyd var</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Users Summary */}
          {selectedUsers.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">
                Seçilmiş: {selectedUsers.length} nəfər
              </h4>
              <div className="space-y-1">
                {selectedUsers.map((user) => (
                  <div key={user.user_id} className="text-sm text-green-700">
                    • {user.name} ({user.email})
                    {user.deadline && (
                      <span className="ml-2">
                        Deadline: {format(user.deadline, 'dd.MM.yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Ləğv et
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={isSubmitting || selectedUsers.length === 0}
          >
            {isSubmitting ? 'Göndərilir...' : `Yönləndir (${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
