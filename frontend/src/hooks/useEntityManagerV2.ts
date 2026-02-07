import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  BaseEntity, 
  EntityConfig, 
  ManagerCustomLogic, 
  EnhancedEntityManager,
  StatsConfig,
  BaseFilters,
  PaginatedItems
} from '@/components/generic/types';
import { Users, CheckCircle, XCircle } from 'lucide-react';
import { PaginationMeta } from '@/types/api';

interface NormalizedResult<T> {
  items: T[];
  pagination?: PaginationMeta | null;
  raw?: any;
}

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
  const serverSide = config.serverSide || {};
  const useServerPagination = Boolean(serverSide.pagination);
  const useServerFiltering = Boolean(serverSide.filtering);
  const dataMode: 'client' | 'server' = (useServerPagination || useServerFiltering) ? 'server' : 'client';
  const initialFilters = useMemo(() => ({ ...((defaultFilters || {}) as object) }) as TFilters, [defaultFilters]);
  
  // State management
  const [searchTerm, setSearchTerm] = useState<string>((initialFilters as any)?.search || '');
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  
  // Debug logging for createModalOpen state changes
  React.useEffect(() => {
    console.log(`🎭 useEntityManagerV2(${entityType}) createModalOpen changed:`, createModalOpen);
  }, [createModalOpen, entityType]);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const normalizeServiceResult = useCallback((result: T[] | PaginatedItems<T> | any): NormalizedResult<T> => {
    if (Array.isArray(result)) {
      return { items: result };
    }

    if (result && Array.isArray((result as PaginatedItems<T>).items)) {
      const payload = result as PaginatedItems<T>;
      return {
        items: payload.items,
        pagination: payload.pagination || (payload.raw as any)?.pagination || null,
        raw: payload.raw || result,
      };
    }

    if (result?.data && Array.isArray(result.data)) {
      return {
        items: result.data,
        pagination: result.pagination || result.meta || null,
        raw: result,
      };
    }

    if (result?.data && typeof result.data === 'object' && 'grades' in result.data) {
      return {
        items: Array.isArray(result.data.grades) ? result.data.grades : [],
        pagination: result.data.pagination || result.meta || null,
        raw: result,
      };
    }

    return {
      items: [],
      pagination: result?.pagination || result?.meta || null,
      raw: result,
    };
  }, []);

  // Data fetching with enhanced logging
  const { 
    data: queryResult, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: [...queryKey, entityType, filters],
    queryFn: async () => {
      console.log(`🔍 EntityManagerV2(${entityType}): Fetching entities with filters:`, filters);
      try {
        const result = await service.get(filters);
        const normalized = normalizeServiceResult(result);
        console.log(`✅ EntityManagerV2(${entityType}): Fetched ${normalized.items.length} entities`);
        return normalized;
      } catch (fetchError) {
        console.error(`❌ EntityManagerV2(${entityType}): Failed to fetch entities:`, fetchError);
        throw fetchError;
      }
    },
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always refetch after invalidation for fresh data
  });

  const entities = queryResult?.items ?? [];

  React.useEffect(() => {
    if (queryResult?.pagination) {
      setPaginationMeta(queryResult.pagination);
    } else if (useServerPagination) {
      setPaginationMeta({
        current_page: filters?.page || 1,
        per_page: filters?.per_page || 20,
        total: entities.length,
        total_pages: 1,
        from: entities.length > 0 ? 1 : 0,
        to: entities.length,
      });
    }
  }, [queryResult, useServerPagination, filters, entities.length]);

  React.useEffect(() => {
    if (!useServerFiltering) {
      return;
    }
    const normalizedSearch = (searchTerm || '').trim();
    setFilters((prev) => {
      const current = (prev as any)?.search || '';
      if (current === normalizedSearch || (!normalizedSearch && !current)) {
        return prev;
      }
      const nextFilters = { ...(prev as any), search: normalizedSearch || undefined, page: 1 };
      if (!normalizedSearch) {
        delete nextFilters.search;
      }
      return nextFilters as TFilters;
    });
  }, [searchTerm, useServerFiltering]);

  React.useEffect(() => {
    if (!useServerFiltering) {
      return;
    }
    const filterSearchValue = ((filters as any)?.search || '') as string;
    if (filterSearchValue !== searchTerm) {
      setSearchTerm(filterSearchValue || '');
    }
  }, [filters, useServerFiltering]);

  React.useEffect(() => {
    if (!useServerFiltering) {
      return;
    }
    const tabConfig = config.tabs.find((tab) => tab.key === selectedTab);
    const serverFilters = tabConfig?.serverFilters;
    if (!serverFilters) {
      return;
    }
    setFilters((prev) => {
      let changed = false;
      const next = { ...(prev as any) };
      Object.entries(serverFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        } else if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      });
      if (!changed) {
        return prev;
      }
      next.page = 1;
      return next as TFilters;
    });
  }, [selectedTab, useServerFiltering, config.tabs]);

  // Enhanced filtering with tab and search logic
  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    if (useServerFiltering) {
      return entities;
    }
    
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
    if (searchTerm && searchTerm.trim()) {
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
  }, [entities, selectedTab, searchTerm, config.tabs, config.columns, entityType, useServerFiltering]);

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

  const setPageHandler = useCallback(
    (page: number) => {
      if (!useServerPagination) {
        return;
      }
      setFilters((prev) => {
        if ((prev as any)?.page === page) {
          return prev;
        }
        return { ...(prev as any), page } as TFilters;
      });
    },
    [useServerPagination]
  );

  const setPerPageHandler = useCallback(
    (perPage: number) => {
      if (!useServerPagination) {
        return;
      }
      setFilters((prev) => {
        if ((prev as any)?.per_page === perPage) {
          return prev;
        }
        return { ...(prev as any), per_page: perPage, page: 1 } as TFilters;
      });
    },
    [useServerPagination]
  );

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
    pagination: paginationMeta,
    dataMode,
    
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
    setPage: setPageHandler,
    setPerPage: setPerPageHandler,
    
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
