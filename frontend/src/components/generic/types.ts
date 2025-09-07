// Generic Manager Types and Interfaces

import { ReactNode, ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';
import { PaginationParams } from '@/services/BaseService';

// Base filters interface for all entity managers
export interface BaseFilters extends PaginationParams {
  [key: string]: any;
}

// Base entity interface
export interface BaseEntity {
  id: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Column configuration for table
export interface ColumnConfig<T = any> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, value: any) => ReactNode;
}

// Action button configuration
export interface ActionConfig<T = any> {
  key: string;
  icon: LucideIcon;
  label: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  onClick: (item: T) => void;
  isVisible?: (item: T) => boolean;
  isDisabled?: (item: T) => boolean;
}

// Tab configuration
export interface TabConfig {
  key: string;
  label: string;
  count?: number;
  filter?: (items: any[]) => any[];
}

// Stats card configuration
export interface StatsConfig {
  key: string;
  label: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'green' | 'red' | 'blue' | 'yellow' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// Filter field configuration
export interface FilterFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'multiselect';
  options?: Array<{ value: string | number; label: string; }>;
  placeholder?: string;
  multiple?: boolean;
}

// Custom logic injection points
export interface ManagerCustomLogic<T extends BaseEntity> {
  // Custom permission checks
  permissionCheck?: (action: string, item?: T) => boolean;
  
  // Custom filter rendering
  renderCustomFilters?: (manager: any) => ReactNode;
  
  // Custom stats calculation
  calculateCustomStats?: (items: T[]) => StatsConfig[];
  
  // Custom row rendering
  renderCustomRow?: (item: T, defaultRender: ReactNode) => ReactNode;
  
  // Custom modal/form rendering
  renderCustomModal?: (props: any) => ReactNode;
  
  // Custom bulk actions
  bulkActions?: Array<{
    key: string;
    label: string;
    icon: LucideIcon;
    onClick: (selectedItems: T[]) => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
  
  // Custom header actions
  headerActions?: Array<{
    key: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'outline';
  }>;
}

// Entity configuration
export interface EntityConfig<T extends BaseEntity, TFilters extends BaseFilters, TCreateData> {
  // Basic info
  entityType: string;
  entityName: string;
  entityNamePlural: string;
  
  // API service
  service: {
    get: (filters: TFilters) => Promise<T[]>;
    create: (data: Partial<TCreateData>) => Promise<any>;
    update: (id: number, data: Partial<TCreateData>) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
  
  // Query configuration  
  queryKey: string[];
  defaultFilters: TFilters;
  defaultCreateData: TCreateData;
  
  // UI Configuration
  columns: ColumnConfig<T>[];
  actions: ActionConfig<T>[];
  tabs: TabConfig[];
  filterFields: FilterFieldConfig[];
  
  // Feature flags
  features?: {
    search?: boolean;
    filters?: boolean;
    stats?: boolean;
    tabs?: boolean;
    bulk?: boolean;
    export?: boolean;
    import?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
}

// Generic Manager Props
export interface GenericManagerProps<T extends BaseEntity, TFilters extends BaseFilters, TCreateData> {
  config: EntityConfig<T, TFilters, TCreateData>;
  customLogic?: ManagerCustomLogic<T>;
  className?: string;
}

// Hook return type extension
export interface EnhancedEntityManager<T extends BaseEntity> {
  // Original useEntityManager fields
  entities: T[];
  isLoading: boolean;
  error: any;
  searchTerm: string;
  filters: any;
  selectedTab: string;
  selectedEntity: T | null;
  createModalOpen: boolean;
  editingEntity: T | null;
  
  // Enhanced fields
  filteredEntities: T[];
  selectedItems: T[];
  stats: StatsConfig[];
  
  // Original actions
  setSearchTerm: (term: string) => void;
  setFilters: (filters: any) => void;
  setSelectedTab: (tab: string) => void;
  setSelectedEntity: (entity: T | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEditingEntity: (entity: T | null) => void;
  handleCreate: (data: any) => void;
  handleUpdate: (id: number, data: any) => void;
  refetch: () => void;
  
  // Enhanced actions
  setSelectedItems: (items: T[]) => void;
  toggleItemSelection: (item: T) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  
  // Loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}