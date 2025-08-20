import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaginationParams } from '@/services/BaseService';
import { toast } from 'sonner';

export interface BaseFilters extends PaginationParams {
  [key: string]: any;
}

export interface EntityManagerConfig<TEntity, TFilters extends BaseFilters, TCreateData> {
  entityType: string;
  entityName: string;
  service: {
    get: (filters: TFilters) => Promise<TEntity[]>;
    create: (data: Partial<TCreateData>) => Promise<any>;
    update: (id: number, data: Partial<TCreateData>) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
  defaultFilters: TFilters;
  defaultCreateData: TCreateData;
  queryKey: string[];
}

export function useEntityManager<
  TEntity extends { id: number },
  TFilters extends BaseFilters,
  TCreateData
>(config: EntityManagerConfig<TEntity, TFilters, TCreateData>) {
  const queryClient = useQueryClient();
  const { entityType, entityName, service, defaultFilters, defaultCreateData, queryKey } = config;
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TFilters>(defaultFilters);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<TEntity | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TEntity | null>(null);
  const [newEntityData, setNewEntityData] = useState<TCreateData>(defaultCreateData);

  // Data fetching
  const { 
    data: entities, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: [...queryKey, entityType, filters],
    queryFn: async () => {
      console.log(`🔍 EntityManager(${entityType}): Fetching entities with filters:`, filters);
      try {
        const result = await service.get(filters);
        console.log(`✅ EntityManager(${entityType}): Fetched ${Array.isArray(result) ? result.length : 'unknown'} entities`);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error(`❌ EntityManager(${entityType}): Failed to fetch entities:`, error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create mutation
  const createEntityMutation = useMutation({
    mutationFn: (data: Partial<TCreateData>) => service.create(data),
    onSuccess: () => {
      toast.success(`${entityName} uğurla yaradıldı`);
      queryClient.invalidateQueries({ queryKey: [...queryKey, entityType] });
      refetch();
      setCreateModalOpen(false);
      setNewEntityData(defaultCreateData);
    },
    onError: (error) => {
      console.error(`❌ EntityManager(${entityType}): Create failed:`, error);
      toast.error(`${entityName} yaradıla bilmədi`);
    },
  });

  // Update mutation
  const updateEntityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TCreateData> }) => 
      service.update(id, data),
    onSuccess: () => {
      toast.success(`${entityName} uğurla yeniləndi`);
      queryClient.invalidateQueries({ queryKey: [...queryKey, entityType] });
      refetch();
      setEditingEntity(null);
    },
    onError: (error) => {
      console.error(`❌ EntityManager(${entityType}): Update failed:`, error);
      toast.error(`${entityName} yenilənə bilmədi`);
    },
  });

  // Delete mutation
  const deleteEntityMutation = useMutation({
    mutationFn: (id: number) => service.delete(id),
    onSuccess: () => {
      toast.success(`${entityName} uğurla silindi`);
      queryClient.invalidateQueries({ queryKey: [...queryKey, entityType] });
      refetch();
    },
    onError: (error) => {
      console.error(`❌ EntityManager(${entityType}): Delete failed:`, error);
      toast.error(`${entityName} silinə bilmədi`);
    },
  });

  // Handler functions
  const handleCreate = (data: Partial<TCreateData>) => {
    console.log(`🔧 EntityManager(${entityType}): Creating entity with data:`, data);
    createEntityMutation.mutate(data);
  };

  const handleUpdate = (id: number, data: Partial<TCreateData>) => {
    console.log(`🔧 EntityManager(${entityType}): Updating entity ${id} with data:`, data);
    updateEntityMutation.mutate({ id, data });
  };

  const handleDelete = (id: number) => {
    console.log(`🗑️ EntityManager(${entityType}): Deleting entity ${id}`);
    if (confirm(`${entityName} silmək istədiyinizdən əminsiniz?`)) {
      deleteEntityMutation.mutate(id);
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchTerm('');
    setSelectedTab('all');
  };

  const openCreateModal = () => {
    setNewEntityData(defaultCreateData);
    setCreateModalOpen(true);
  };

  const openEditModal = (entity: TEntity) => {
    setEditingEntity(entity);
    setNewEntityData(entity as unknown as TCreateData);
  };

  return {
    // Data
    entities: entities || [],
    isLoading,
    error,
    
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedEntity,
    createModalOpen,
    editingEntity,
    newEntityData,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedEntity,
    setCreateModalOpen,
    setEditingEntity,
    setNewEntityData,
    
    // Handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    resetFilters,
    openCreateModal,
    openEditModal,
    refetch,
    
    // Loading states
    isCreating: createEntityMutation.isPending,
    isUpdating: updateEntityMutation.isPending,
    isDeleting: deleteEntityMutation.isPending,
  };
}

export type UseEntityManagerReturn<TEntity, TCreateData> = ReturnType<
  typeof useEntityManager<TEntity, BaseFilters, TCreateData>
>;
