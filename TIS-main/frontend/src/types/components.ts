/**
 * Component Props Type Definitions
 * Centralized interfaces for component props and state
 */

import { ReactNode, ComponentProps } from 'react';
import { User } from './user';
import { ApiResponse, PaginatedResponse } from './api';
import { BaseFormProps } from './forms';

// Base Component Props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

// Loading States
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
  loadingComponent?: ReactNode;
}

// Error States
export interface ErrorProps {
  error?: string | null;
  errorComponent?: ReactNode;
  onErrorRetry?: () => void;
}

// Combined State Props
export interface AsyncComponentProps extends LoadingProps, ErrorProps {
  data?: any;
  refetch?: () => void;
}

// Modal Component Props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Table Component Props
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> extends BaseComponentProps, LoadingProps {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  selection?: {
    selectedRowKeys: (string | number)[];
    onSelect: (selectedRowKeys: (string | number)[], selectedRows: T[]) => void;
    type?: 'checkbox' | 'radio';
  };
  sorting?: {
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    onSort: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  };
  filtering?: {
    filters: Record<string, any>;
    onFilter: (filters: Record<string, any>) => void;
  };
  onRowClick?: (record: T, index: number) => void;
  emptyText?: ReactNode;
  rowKey?: keyof T | ((record: T) => string | number);
}

// Dashboard Component Props
export interface DashboardProps extends BaseComponentProps {
  user: User;
  permissions: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface DashboardCardProps extends BaseComponentProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  loading?: boolean;
  error?: string;
  onClick?: () => void;
}

// Navigation Component Props
export interface NavigationItem {
  key: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  permissions?: string[];
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface NavigationProps extends BaseComponentProps {
  items: NavigationItem[];
  currentPath: string;
  user: User;
  collapsed?: boolean;
  onItemClick?: (item: NavigationItem) => void;
}

// Form Component Props
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  name: string;
  required?: boolean;
  error?: string | string[];
  helpText?: ReactNode;
  disabled?: boolean;
}

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps extends FormFieldProps {
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  value?: any;
  onChange?: (value: any) => void;
}

// Assessment Component Props
export interface AssessmentFormProps<T = any> extends BaseFormProps<T> {
  academicYears: Array<{ id: number; name: string; is_active: boolean }>;
  institutions: Array<{ id: number; name: string; type: string }>;
  defaultInstitution?: { id: number; name: string; type: string };
  activeAcademicYear?: { id: number; name: string; is_active: boolean };
  loadingAcademicYears?: boolean;
  loadingInstitutions?: boolean;
}

export interface AssessmentCriteriaProps {
  criteria: Array<{ name: string; score: number }>;
  maxScore?: number;
  readonly?: boolean;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onChange?: (index: number, field: 'name' | 'score', value: string | number) => void;
}

export interface AssessmentListProps {
  title: string;
  items: string[];
  readonly?: boolean;
  maxItems?: number;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onChange?: (index: number, value: string) => void;
}

// Schedule Component Props
export interface ScheduleSlot {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room?: string;
  class: string;
  color?: string;
  conflicts?: boolean;
}

export interface ScheduleViewProps extends BaseComponentProps {
  slots: ScheduleSlot[];
  view: 'week' | 'day';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSlotClick?: (slot: ScheduleSlot) => void;
  onSlotDrop?: (slot: ScheduleSlot, newTime: { start: string; end: string; date: string }) => void;
  readOnly?: boolean;
}

// Notification Component Props
export interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  closable?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive';
  }>;
  onClose?: () => void;
}

// Search Component Props
export interface SearchProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  showClearButton?: boolean;
  loading?: boolean;
  suggestions?: Array<{
    label: string;
    value: string;
    category?: string;
  }>;
}

// Filter Component Props
export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  options?: SelectOption[];
  placeholder?: string;
  defaultValue?: any;
}

export interface FilterProps extends BaseComponentProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  onReset?: () => void;
  showReset?: boolean;
  collapsible?: boolean;
}

// File Upload Component Props
export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onUpload: (files: File[]) => void | Promise<void>;
  onError?: (error: string) => void;
  uploading?: boolean;
  progress?: number;
  showProgress?: boolean;
  dragAndDrop?: boolean;
}

// Chart Component Props
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  interactive?: boolean;
  onPointClick?: (point: ChartDataPoint) => void;
}

// List Component Props
export interface ListItem<T = any> {
  id: string | number;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  metadata?: T;
}

export interface ListProps<T = any> extends BaseComponentProps, LoadingProps {
  items: ListItem<T>[];
  onItemClick?: (item: ListItem<T>) => void;
  renderItem?: (item: ListItem<T>) => ReactNode;
  emptyText?: ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

// Card Component Props
export interface CardProps extends BaseComponentProps {
  title?: string;
  description?: string;
  footer?: ReactNode;
  actions?: ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
}

// Breadcrumb Component Props
export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: ReactNode;
  dropdown?: BreadcrumbItem[];
}

export interface BreadcrumbProps extends BaseComponentProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  onItemClick?: (item: BreadcrumbItem) => void;
  maxItems?: number;
}

// Tab Component Props
export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  closable?: boolean;
  icon?: ReactNode;
}

export interface TabProps extends BaseComponentProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  onClose?: (key: string) => void;
  type?: 'line' | 'card';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Tree Component Props
export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  icon?: ReactNode;
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  isLeaf?: boolean;
  expanded?: boolean;
}

export interface TreeProps extends BaseComponentProps {
  data: TreeNode[];
  selectedKeys?: string[];
  checkedKeys?: string[];
  expandedKeys?: string[];
  onSelect?: (selectedKeys: string[], node: TreeNode) => void;
  onCheck?: (checkedKeys: string[], node: TreeNode) => void;
  onExpand?: (expandedKeys: string[], node: TreeNode) => void;
  checkable?: boolean;
  multiple?: boolean;
  showIcon?: boolean;
  showLine?: boolean;
}

// Calendar Component Props
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  metadata?: any;
}

export interface CalendarProps extends BaseComponentProps {
  events: CalendarEvent[];
  view: 'month' | 'week' | 'day';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (event: CalendarEvent, date: Date) => void;
  readOnly?: boolean;
}

// Statistics Component Props
export interface StatisticProps extends BaseComponentProps {
  title: string;
  value: string | number;
  precision?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  loading?: boolean;
  valueStyle?: React.CSSProperties;
}

// Timeline Component Props
export interface TimelineItem {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: ReactNode;
  actions?: ReactNode;
}

export interface TimelineProps extends BaseComponentProps {
  items: TimelineItem[];
  reverse?: boolean;
  pending?: boolean;
  mode?: 'left' | 'right' | 'center';
}