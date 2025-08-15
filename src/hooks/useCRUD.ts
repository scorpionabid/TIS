import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ApiResponse, PaginatedResponse } from '@/services/api';

export interface CRUDState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  selectedItem: T | null;
  isModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  itemToDelete: T | null;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CRUDActions<T> {
  setData: (data: T[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openModal: (item?: T) => void;
  closeModal: () => void;
  openDeleteDialog: (item: T) => void;
  closeDeleteDialog: () => void;
  handleCreate: (item: any) => Promise<void>;
  handleUpdate: (id: string | number, item: Partial<T>) => Promise<void>;
  handleDelete: (id: string | number) => Promise<void>;
  handleBulkDelete: (ids: (string | number)[]) => Promise<void>;
  loadData: (params?: any) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface CRUDConfig<T> {
  fetchData?: (params?: any) => Promise<T[] | PaginatedResponse<T>>;
  create?: (item: any) => Promise<T>;
  update?: (id: string | number, item: Partial<T>) => Promise<T>;
  delete?: (id: string | number) => Promise<void>;
  bulkDelete?: (ids: (string | number)[]) => Promise<void>;
  autoLoad?: boolean;
  onSuccess?: (action: 'create' | 'update' | 'delete' | 'load', item?: T) => void;
  onError?: (action: 'create' | 'update' | 'delete' | 'load', error: Error) => void;
}

export function useCRUD<T extends { id: string | number }>(
  initialData: T[] = [],
  config: CRUDConfig<T> = {}
) {
  const { toast } = useToast();
  
  const [state, setState] = useState<CRUDState<T>>({
    data: initialData,
    loading: false,
    error: null,
    selectedItem: null,
    isModalOpen: false,
    isDeleteDialogOpen: false,
    itemToDelete: null,
    pagination: undefined,
  });

  // Auto-load data on mount if fetchData is provided
  useEffect(() => {
    if (config.fetchData && config.autoLoad !== false) {
      loadData();
    }
  }, [config.fetchData, config.autoLoad]);

  const setData = useCallback((data: T[]) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const openModal = useCallback((item?: T) => {
    setState(prev => ({
      ...prev,
      selectedItem: item || null,
      isModalOpen: true,
    }));
  }, []);

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedItem: null,
      isModalOpen: false,
    }));
  }, []);

  const openDeleteDialog = useCallback((item: T) => {
    setState(prev => ({
      ...prev,
      itemToDelete: item,
      isDeleteDialogOpen: true,
    }));
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      itemToDelete: null,
      isDeleteDialogOpen: false,
    }));
  }, []);

  const loadData = useCallback(async (params?: any) => {
    if (!config.fetchData) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await config.fetchData(params);
      
      if (Array.isArray(result)) {
        setData(result);
      } else {
        // Paginated response
        setData(result.data);
        setState(prev => ({
          ...prev,
          pagination: {
            current_page: result.current_page,
            last_page: result.last_page,
            per_page: result.per_page,
            total: result.total,
          }
        }));
      }
      
      config.onSuccess?.('load');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Məlumatları yükləmək mümkün olmadı';
      setError(errorMessage);
      config.onError?.('load', error as Error);
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [config, toast, setData, setLoading, setError]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const handleCreate = useCallback(async (item: any) => {
    setLoading(true);
    setError(null);

    try {
      if (config.create) {
        const newItem = await config.create(item);
        setData([...state.data, newItem]);
        config.onSuccess?.('create', newItem);
        
        toast({
          title: 'Uğurlu',
          description: 'Yeni məlumat əlavə edildi',
        });
      } else {
        // Fallback: optimistic update with generated ID
        const newItem = { ...item, id: Date.now().toString() } as T;
        setData([...state.data, newItem]);
        
        toast({
          title: 'Uğurlu',
          description: 'Yeni məlumat əlavə edildi',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xəta baş verdi';
      setError(errorMessage);
      config.onError?.('create', error as Error);
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, config, toast, setData, setLoading, setError]);

  const handleUpdate = useCallback(async (id: string | number, updates: Partial<T>) => {
    setLoading(true);
    setError(null);

    try {
      if (config.update) {
        const updatedItem = await config.update(id, updates);
        setData(state.data.map(item => item.id === id ? updatedItem : item));
        config.onSuccess?.('update', updatedItem);
      } else {
        // Fallback: optimistic update
        setData(state.data.map(item => 
          item.id === id ? { ...item, ...updates } : item
        ));
      }
      
      toast({
        title: 'Uğurlu',
        description: 'Məlumatlar yeniləndi',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xəta baş verdi';
      setError(errorMessage);
      config.onError?.('update', error as Error);
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, config, toast, setData, setLoading, setError]);

  const handleDelete = useCallback(async (id: string | number) => {
    setLoading(true);
    setError(null);

    try {
      if (config.delete) {
        await config.delete(id);
      }
      
      setData(state.data.filter(item => item.id !== id));
      config.onSuccess?.('delete');
      
      toast({
        title: 'Uğurlu',
        description: 'Məlumat silindi',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xəta baş verdi';
      setError(errorMessage);
      config.onError?.('delete', error as Error);
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, config, toast, setData, setLoading, setError]);

  const handleBulkDelete = useCallback(async (ids: (string | number)[]) => {
    setLoading(true);
    setError(null);

    try {
      if (config.bulkDelete) {
        await config.bulkDelete(ids);
      }
      
      setData(state.data.filter(item => !ids.includes(item.id)));
      
      toast({
        title: 'Uğurlu',
        description: `${ids.length} məlumat silindi`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Xəta baş verdi';
      setError(errorMessage);
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.data, config, toast, setData, setLoading, setError]);

  return {
    ...state,
    actions: {
      setData,
      setLoading,
      setError,
      openModal,
      closeModal,
      openDeleteDialog,
      closeDeleteDialog,
      handleCreate,
      handleUpdate,
      handleDelete,
      handleBulkDelete,
      loadData,
      refresh,
    },
  };
}