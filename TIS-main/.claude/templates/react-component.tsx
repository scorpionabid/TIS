import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { {{ServiceName}} } from '@/services/{{serviceName}}';
import { {{ModelName}} } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

// ATİS Components
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { {{ModelName}}Modal } from '@/components/modals/{{ModelName}}Modal';

interface {{ComponentName}}Props {
  institutionId?: string;
  userRole?: string;
}

/**
 * {{ComponentName}} - ATİS {{ModelName}} idarəetmə komponenti
 * Role-based access control və institution hierarchy dəstəyi ilə
 */
export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({ 
  institutionId, 
  userRole 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{{ModelName}} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{{ModelName}} | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching
  const { 
    data: response, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['{{queryKey}}', searchTerm, statusFilter, institutionId],
    queryFn: () => {{ServiceName}}.getAll({ 
      search: searchTerm, 
      status: statusFilter !== 'all' ? statusFilter : undefined,
      institution_id: institutionId 
    }),
    keepPreviousData: true,
  });

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<{{ModelName}}>) => 
      editingItem ? {{ServiceName}}.update(editingItem.id, data) : {{ServiceName}}.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['{{queryKey}}'] });
      setIsModalOpen(false);
      setEditingItem(null);
      toast({
        title: 'Uğurlu!',
        description: `{{ModelName}} ${editingItem ? 'yeniləndi' : 'yaradıldı'}`,
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta!',
        description: error.response?.data?.message || 'Əməliyyat uğursuz oldu',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {{ServiceName}}.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{{queryKey}}'] });
      setDeleteConfirm(null);
      toast({
        title: 'Silindi',
        description: '{{ModelName}} uğurla silindi',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta!',
        description: error.response?.data?.message || 'Silmə əməliyyatı uğursuz oldu',
        variant: 'destructive',
      });
    },
  });

  // Bulk operations mutation
  const bulkMutation = useMutation({
    mutationFn: (action: { type: string; ids: string[] }) => 
      {{ServiceName}}.bulkAction(action.type, action.ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{{queryKey}}'] });
      setSelectedItems([]);
      toast({
        title: 'Tamamlandı',
        description: 'Seçilmiş elementlər üzərində əməliyyat həyata keçirildi',
        variant: 'default',
      });
    },
  });

  // Event handlers
  const handleEdit = (item: {{ModelName}}) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: {{ModelName}}) => {
    setDeleteConfirm(item);
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) return;
    bulkMutation.mutate({ type: action, ids: selectedItems });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && response?.data?.data) {
      setSelectedItems(response.data.data.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    }
  };

  // Permission checks
  const canCreate = ['SuperAdmin', 'RegionAdmin', 'SektorAdmin'].includes(userRole || '');
  const canEdit = ['SuperAdmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin'].includes(userRole || '');
  const canDelete = ['SuperAdmin', 'RegionAdmin'].includes(userRole || '');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  const items = response?.data?.data || [];
  const pagination = response?.data?.meta || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{{ModelName}} İdarəetməsi</h1>
          <p className="text-gray-600">ATİS {{ModelName}} sistemini idarə edin</p>
        </div>
        
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} />
            Yeni {{ModelName}}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="{{ModelName}} axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Bütün statuslar</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Deaktiv</option>
              </select>
              
              {selectedItems.length > 0 && canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter size={16} className="mr-2" />
                      Seçilmiş ({selectedItems.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                      Aktivləşdir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                      Deaktivləşdir
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBulkAction('delete')}
                      className="text-red-600"
                    >
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {canDelete && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              <TableHead>Ad</TableHead>
              <TableHead>Təşkilat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Yaradılıb</TableHead>
              <TableHead className="w-12">Əməliyyatlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: {{ModelName}}) => (
              <TableRow key={item.id}>
                {canDelete && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.institution?.name}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {item.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(item.created_at).toLocaleDateString('az-AZ')}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit size={16} className="mr-2" />
                          Düzəliş et
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(item)}
                          className="text-red-600"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Sil
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Heç bir {{ModelName}} tapılmadı
          </div>
        )}
      </Card>

      {/* Modals */}
      {isModalOpen && (
        <{{ModelName}}Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSubmit={(data) => createMutation.mutate(data)}
          editingItem={editingItem}
          isLoading={createMutation.isLoading}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="{{ModelName}} silinsin?"
          description={`"${deleteConfirm.name}" adlı {{ModelName}} silinəcək. Bu əməliyyat geri alına bilməz.`}
          confirmText="Sil"
          cancelText="Ləğv et"
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleteMutation.isLoading}
          variant="destructive"
        />
      )}
    </div>
  );
};