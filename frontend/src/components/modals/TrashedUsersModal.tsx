import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Search,
  User,
  Calendar,
  Building,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

interface TrashedUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  institution?: {
    id: number;
    name: string;
  };
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
  }>;
  deleted_at: string;
}

interface TrashedUsersModalProps {
  open: boolean;
  onClose: () => void;
}

export const TrashedUsersModal: React.FC<TrashedUsersModalProps> = ({
  open,
  onClose,
}) => {
  const [users, setUsers] = useState<TrashedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total: 0,
    per_page: 10,
    last_page: 1
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trashed users
  const fetchTrashedUsers = async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
        ...(searchQuery && { search: searchQuery })
      });

      const token = apiClient.getToken();

      const response = await fetch(`/api/users/trashed?${params}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Silinmiş istifadəçilər yüklənə bilmədi');
      }

      const data = await response.json();
      setUsers(data.data.data || []);
      setPagination({
        current_page: data.data.current_page,
        total: data.data.total,
        per_page: data.data.per_page,
        last_page: data.data.last_page
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: error instanceof Error ? error.message : 'Gözlənilməz xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Restore single user
  const restoreUser = async (userId: number) => {
    try {
      const token = apiClient.getToken();
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('İstifadəçi bərpa edilə bilmədi');
      }

      toast({
        title: 'Uğur',
        description: 'İstifadəçi uğurla bərpa edildi',
      });

      // Refresh the list and main users list
      fetchTrashedUsers(pagination.current_page, search);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: error instanceof Error ? error.message : 'Gözlənilməz xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Bulk restore users
  const bulkRestoreUsers = async () => {
    if (selectedUsers.size === 0) return;

    setRestoring(true);
    try {
      const token = apiClient.getToken();
      const response = await fetch('/api/users/bulk/restore', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: Array.from(selectedUsers),
          confirm: true
        }),
      });

      if (!response.ok) {
        throw new Error('İstifadəçilər bərpa edilə bilmədi');
      }

      const result = await response.json();
      toast({
        title: 'Uğur',
        description: `${result.data.restored_count} istifadəçi uğurla bərpa edildi`,
      });

      // Refresh the list and clear selection, also refresh main users list
      fetchTrashedUsers(pagination.current_page, search);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(new Set());
    } catch (error) {
      toast({
        title: 'Xəta',
        description: error instanceof Error ? error.message : 'Gözlənilməz xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  // Force delete user (SuperAdmin only)
  const forceDeleteUser = async (userId: number) => {
    if (!confirm('Bu istifadəçini həmişəlik silmək istədiyinizə əminsinizmi? Bu əməliyyat geri qaytarıla bilməz!')) {
      return;
    }

    try {
      const token = apiClient.getToken();
      const response = await fetch(`/api/users/${userId}/force`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        throw new Error('İstifadəçi həmişəlik silinə bilmədi');
      }

      toast({
        title: 'Uğur',
        description: 'İstifadəçi həmişəlik silindi',
      });

      // Refresh the list and main users list  
      fetchTrashedUsers(pagination.current_page, search);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: error instanceof Error ? error.message : 'Gözlənilməz xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  // Toggle user selection
  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Select all users on current page
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(user => user.id)));
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    fetchTrashedUsers(1, value);
  };

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      fetchTrashedUsers();
      setSelectedUsers(new Set());
      setSearch('');
    }
  }, [open]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (user: TrashedUser) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Silinmiş İstifadəçilər
          </DialogTitle>
          <DialogDescription>
            Silinmiş istifadəçiləri idarə edin - bərpa edin və ya həmişəlik silin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İstifadəçi axtarın..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedUsers.size} seçilmiş
                </Badge>
                <Button
                  onClick={bulkRestoreUsers}
                  disabled={restoring}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  {restoring ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Bərpa et
                </Button>
              </div>
            )}

            <Button
              onClick={() => fetchTrashedUsers(pagination.current_page, search)}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Yüklənir...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Silinmiş istifadəçi tapılmadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-2 p-2 border-b">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">Hamısını seç</span>
              </div>

              {/* User Cards */}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                  />

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getUserDisplayName(user)}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.roles[0]?.display_name || 'Role not found'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>📧 {user.email}</div>
                      {user.institution && (
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {user.institution.name}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Silinmə tarixi: {formatDate(user.deleted_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => restoreUser(user.id)}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Bərpa
                    </Button>
                    
                    <Button
                      onClick={() => forceDeleteUser(user.id)}
                      size="sm"
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Həmişəlik sil
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Cəmi {pagination.total} istifadəçi ({pagination.current_page} / {pagination.last_page} səhifə)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => fetchTrashedUsers(pagination.current_page - 1, search)}
                      disabled={pagination.current_page <= 1 || loading}
                      size="sm"
                      variant="outline"
                    >
                      Əvvəlki
                    </Button>
                    <Button
                      onClick={() => fetchTrashedUsers(pagination.current_page + 1, search)}
                      disabled={pagination.current_page >= pagination.last_page || loading}
                      size="sm"
                      variant="outline"
                    >
                      Növbəti
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrashedUsersModal;
