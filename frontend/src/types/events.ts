/**
 * Event Handler Type Definitions
 * Centralized interfaces for React events and custom events
 */

import { ChangeEvent, FormEvent, MouseEvent, KeyboardEvent, FocusEvent, DragEvent } from 'react';

// Generic Event Handler Types
export type EventHandler<T = Element> = (event: FormEvent<T>) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: ChangeEvent<T>) => void;
export type ClickHandler<T = HTMLButtonElement> = (event: MouseEvent<T>) => void;
export type KeyHandler<T = HTMLInputElement> = (event: KeyboardEvent<T>) => void;
export type FocusHandler<T = HTMLInputElement> = (event: FocusEvent<T>) => void;
export type DragHandler<T = HTMLDivElement> = (event: DragEvent<T>) => void;

// Form-specific Event Types
export interface FormSubmitEvent<T = any> {
  data: T;
  formData?: FormData;
  preventDefault: () => void;
  target: EventTarget | null;
}

export interface FormChangeEvent<T = any> {
  field: keyof T;
  value: any;
  previousValue?: any;
  target: EventTarget | null;
}

export interface FormValidationEvent<T = any> {
  field: keyof T;
  value: any;
  errors: string[];
  isValid: boolean;
}

// Custom Application Events
export interface WebSocketMessage<T = any> {
  type: string;
  channel: string;
  data: T;
  timestamp: string;
  id?: string;
}

export interface NotificationEvent {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

// Navigation Events
export interface NavigationEvent {
  from: string;
  to: string;
  params?: Record<string, any>;
  state?: any;
}

export interface BreadcrumbClickEvent {
  level: number;
  path: string;
  label: string;
}

// Modal Events
export interface ModalEvent<T = any> {
  type: 'open' | 'close' | 'confirm' | 'cancel';
  data?: T;
  reason?: 'user' | 'escape' | 'backdrop' | 'programmatic';
}

// Table Events
export interface TableRowClickEvent<T = any> {
  row: T;
  index: number;
  event: MouseEvent;
}

export interface TableColumnSortEvent {
  column: string;
  direction: 'asc' | 'desc' | null;
}

export interface TablePaginationEvent {
  page: number;
  pageSize: number;
  total: number;
}

export interface TableFilterEvent {
  filters: Record<string, any>;
  activeFilters: string[];
}

// Assessment Events
export interface AssessmentScoreChangeEvent {
  criteriaIndex: number;
  field: 'name' | 'score';
  value: string | number;
  maxScore?: number;
}

export interface AssessmentListUpdateEvent {
  listType: 'strengths' | 'improvements' | 'recommendations';
  action: 'add' | 'remove' | 'update';
  index?: number;
  value?: string;
}

// Schedule Events
export interface ScheduleSlotEvent<T = any> {
  type: 'click' | 'drag' | 'drop' | 'resize';
  slot: T;
  time: {
    start: string;
    end: string;
    date: string;
  };
  event: MouseEvent | DragEvent;
}

export interface ScheduleConflictEvent {
  conflictType: 'teacher' | 'room' | 'class';
  conflicts: Array<{
    id: number;
    title: string;
    time: string;
  }>;
}

// File Upload Events
export interface FileUploadEvent {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  response?: any;
}

export interface FileDragEvent {
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop';
  files: FileList;
  event: DragEvent;
}

// Search Events
export interface SearchEvent {
  query: string;
  filters?: Record<string, any>;
  timestamp: number;
}

export interface SearchResultClickEvent<T = any> {
  result: T;
  query: string;
  index: number;
}

// User Interaction Events
export interface UserActionEvent {
  action: string;
  target: string;
  metadata?: Record<string, any>;
  timestamp: number;
  userId?: string;
}

export interface PermissionCheckEvent {
  permission: string;
  granted: boolean;
  resource?: string;
  reason?: string;
}

// Performance Events
export interface PerformanceEvent {
  metric: 'render' | 'api_call' | 'user_interaction' | 'page_load';
  duration: number;
  component?: string;
  endpoint?: string;
  timestamp: number;
}

// Error Events
export interface ErrorEvent {
  error: Error;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    timestamp: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Audit Events
export interface AuditEvent<T = any> {
  entity: string;
  entityId: string | number;
  action: 'create' | 'read' | 'update' | 'delete';
  changes?: {
    before: Partial<T>;
    after: Partial<T>;
  };
  userId: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

// Custom Hook Events
export interface StateChangeEvent<T = any> {
  previous: T;
  current: T;
  action?: string;
}

// Event Handler Function Types
export type CustomEventHandler<T> = (event: T) => void;
export type AsyncEventHandler<T> = (event: T) => Promise<void>;

// Event Bus Types
export interface EventBusEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
}

export type EventBusListener<T = any> = (event: EventBusEvent<T>) => void;

// WebSocket Event Types
export type WebSocketEventHandler<T = any> = (data: T) => void;

export interface WebSocketSubscription {
  channel: string;
  callback: WebSocketEventHandler;
  unsubscribe: () => void;
}

// React Synthetic Event Extensions
export interface ExtendedChangeEvent<T = HTMLInputElement> extends ChangeEvent<T> {
  field?: string;
  previousValue?: any;
}

export interface ExtendedClickEvent<T = HTMLButtonElement> extends MouseEvent<T> {
  actionType?: string;
  metadata?: Record<string, any>;
}

// Type Guards for Events
export function isFormEvent(event: any): event is FormEvent {
  return event && typeof event.preventDefault === 'function';
}

export function isChangeEvent(event: any): event is ChangeEvent {
  return event && event.target && 'value' in event.target;
}

export function isKeyboardEvent(event: any): event is KeyboardEvent {
  return event && 'key' in event && 'keyCode' in event;
}

export function isMouseEvent(event: any): event is MouseEvent {
  return event && 'button' in event && 'clientX' in event;
}