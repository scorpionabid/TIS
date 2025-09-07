import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  BaseEntity, 
  EntityConfig, 
  ManagerCustomLogic, 
  EnhancedEntityManager,
  StatsConfig,
  BaseFilters
} from '@/components/generic/types';
import { Users, CheckCircle, XCircle } from 'lucide-react';

export function useEntityManagerV2<
  T extends BaseEntity,
  TFilters extends BaseFilters,
  TCreateData
>(
  config: EntityConfig<T, TFilters, TCreateData>,
  customLogic?: ManagerCustomLogic<T>
): EnhancedEntityManager<T> {
  const queryClient = useQueryClient();
  const { entityType, entityName, service, defaultFilters, defaultCreateData, queryKey } = config;
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TFilters>(defaultFilters);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  
  // Debug logging for createModalOpen state changes
  React.useEffect(() => {
    console.log(`🎭 useEntityManagerV2(${entityType}) createModalOpen changed:`, createModalOpen);
  }, [createModalOpen, entityType]);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  // Data fetching with enhanced logging
  const { 
    data: entities, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: [...queryKey, entityType, filters],
    queryFn: async () => {
      console.log(`🔍 EntityManagerV2(${entityType}): Fetching entities with filters:`, filters);
      try {
        const result = await service.get(filters);
        console.log(`✅ EntityManagerV2(${entityType}): Fetched ${Array.isArray(result) ? result.length : 'unknown'} entities`);
        console.log(`📊 EntityManagerV2(${entityType}): Raw result:`, result);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error(`❌ EntityManagerV2(${entityType}): Failed to fetch entities:`, error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Enhanced filtering with tab and search logic
  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    
    console.log(`🔄 EntityManagerV2(${entityType}): Filtering ${entities.length} entities`);
    console.log(`📊 Current filters - Tab: ${selectedTab}, Search: "${searchTerm}"`);
    
    let filtered = entities;
    
    // Apply tab filtering
    if (selectedTab !== 'all') {
      const tabConfig = config.tabs.find(tab => tab.key === selectedTab);
      if (tabConfig?.filter) {
        filtered = tabConfig.filter(filtered);
      } else {
        // Default tab filtering
        switch (selectedTab) {
          case 'active':
            filtered = filtered.filter(item => item.is_active === true);
            break;
          case 'inactive':
            filtered = filtered.filter(item => item.is_active === false);
            break;
        }
      }
    }
    
    // Apply search filtering
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        // Search through searchable fields from columns
        return config.columns.some(column => {
          const value = item[column.key as keyof T];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
      });
    }
    
    console.log(`✅ EntityManagerV2(${entityType}): Filtered to ${filtered.length} entities`);
    return filtered;
  }, [entities, selectedTab, searchTerm, config.tabs, config.columns, entityType]);

  // Enhanced stats calculation
  const stats = useMemo(() => {
    if (!entities) return [];
    
    // Custom stats if provided
    if (customLogic?.calculateCustomStats) {
      return customLogic.calculateCustomStats(entities);
    }
    
    // Default stats calculation
    const defaultStats: StatsConfig[] = [
      {
        key: 'total',
        label: 'Ümumi',
        value: entities.length,
        icon: Users,
        color: 'default',
      }
    ];
    
    // Add active/inactive stats if entities have is_active field
    if (entities.length > 0 && 'is_active' in entities[0]) {
      const activeCount = entities.filter(e => e.is_active === true).length;
      const inactiveCount = entities.filter(e => e.is_active === false).length;
      
      defaultStats.push(
        {
          key: 'active',
          label: 'Aktiv',
          value: activeCount,
          icon: CheckCircle,
          color: 'green',
        },
        {
          key: 'inactive',
          label: 'Passiv',
          value: inactiveCount,
          icon: XCircle,
          color: 'red',
        }
      );
    }
    
    return defaultStats;
  }, [entities, customLogic]);

  // Enhanced cache invalidation function (learned from grades system)
  const invalidateEntityCaches = React.useCallback(() => {
    // Triple invalidation strategy for consistent UI updates
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ predicate: (query) => 
      query.queryKey[0] === entityType || 
      (Array.isArray(query.queryKey) && query.queryKey.includes(entityType))
    });
    queryClient.refetchQueries({ queryKey });
    
    // Cross-entity cache invalidation for related data
    if (entityType === 'students') {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    } else if (entityType === 'grades') {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    }
  }, [queryClient, queryKey, entityType]);

  // Create mutation with enhanced cache invalidation
  const createEntityMutation = useMutation({
    mutationFn: (data: Partial<TCreateData>) => {
      console.log(`➕ EntityManagerV2(${entityType}): Creating entity:`, data);
      return service.create(data);
    },
    onSuccess: (result) => {
      console.log(`✅ EntityManagerV2(${entityType}): Entity created successfully:`, result);
      toast.success(`${entityName} uğurla yaradıldı`);
      
      // Enhanced cache invalidation
      invalidateEntityCaches();
      
      setCreateModalOpen(false);
      setEditingEntity(null);
    },
    onError: (error) => {
      console.error(`❌ EntityManagerV2(${entityType}): Create failed:`, error);
      toast.error(`${entityName} yaradıla bilmədi`);
    },
  });

  // Update mutation with enhanced cache invalidation
  const updateEntityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TCreateData> }) => {
      console.log(`📝 EntityManagerV2(${entityType}): Updating entity ${id}:`, data);
      return service.update(id, data);
    },
    onSuccess: (result) => {
      console.log(`✅ EntityManagerV2(${entityType}): Entity updated successfully:`, result);
      toast.success(`${entityName} uğurla yeniləndi`);
      
      // Enhanced cache invalidation
      invalidateEntityCaches();
      
      setEditingEntity(null);
      setCreateModalOpen(false);
    },
    onError: (error) => {
      console.error(`❌ EntityManagerV2(${entityType}): Update failed:`, error);
      toast.error(`${entityName} yenilənə bilmədi`);
    },
  });

  // Delete mutation with enhanced cache invalidation
  const deleteEntityMutation = useMutation({
    mutationFn: (id: number) => {
      console.log(`🗑️ EntityManagerV2(${entityType}): Deleting entity ${id}`);
      return service.delete(id);
    },
    onSuccess: () => {
      console.log(`✅ EntityManagerV2(${entityType}): Entity deleted successfully`);
      toast.success(`${entityName} uğurla silindi`);
      
      // Enhanced cache invalidation
      invalidateEntityCaches();
      
      // Clear selection if deleted item was selected
      setSelectedItems(prev => prev.filter(item => !prev.find(p => p.id === (selectedEntity?.id || 0))));
    },
    onError: (error) => {
      console.error(`❌ EntityManagerV2(${entityType}): Delete failed:`, error);
      toast.error(`${entityName} silinə bilmədi`);
    },
  });

  // Enhanced selection management
  const toggleItemSelection = (item: T) => {
    setSelectedItems(prev => {
      const isSelected = prev.find(p => p.id === item.id);
      if (isSelected) {
        return prev.filter(p => p.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const selectAllItems = () => {
    setSelectedItems([...filteredEntities]);
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Handler functions with permission checks
  const handleCreate = (data: Partial<TCreateData>) => {
    // Check permissions if custom logic provided
    if (customLogic?.permissionCheck && !customLogic.permissionCheck('create')) {
      toast.error('Bu əməliyyat üçün icazəniz yoxdur');
      return;
    }
    
    createEntityMutation.mutate(data);
  };

  const handleUpdate = (id: number, data: Partial<TCreateData>) => {
    // Check permissions if custom logic provided
    if (customLogic?.permissionCheck && !customLogic.permissionCheck('update')) {
      toast.error('Bu əməliyyat üçün icazəniz yoxdur');
      return;
    }
    
    updateEntityMutation.mutate({ id, data });
  };

  const handleDelete = (id: number) => {
    // Check permissions if custom logic provided
    if (customLogic?.permissionCheck && !customLogic.permissionCheck('delete')) {
      toast.error('Bu əməliyyat üçün icazəniz yoxdur');
      return;
    }
    
    if (confirm(`${entityName} silmək istədiyinizdən əminsiniz?`)) {
      deleteEntityMutation.mutate(id);
    }
  };

  return {
    // Data
    entities: entities || [],
    filteredEntities,
    isLoading,
    error,
    
    // Enhanced data
    selectedItems,
    stats,
    
    // State
    searchTerm,
    filters,
    selectedTab,
    selectedEntity,
    createModalOpen,
    editingEntity,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSelectedTab,
    setSelectedEntity,
    setCreateModalOpen,
    setEditingEntity,
    
    // Enhanced actions
    setSelectedItems,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
    
    // Handlers
    handleCreate,
    handleUpdate,
    refetch,
    
    // Loading states
    isCreating: createEntityMutation.isPending,
    isUpdating: updateEntityMutation.isPending,
    isDeleting: deleteEntityMutation.isPending,
  };
}