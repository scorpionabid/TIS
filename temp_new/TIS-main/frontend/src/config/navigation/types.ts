import { LucideIcon } from 'lucide-react';
import { UserRole } from '@/constants/roles';
import { SidebarPanel } from '@/types/sidebar';

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  roles?: UserRole[];
  description?: string;
  permissions?: string[];
  permissionMatch?: 'any' | 'all';
  /** Sidebar badge key — maps to unread notification count category */
  badgeKey?:
    | 'tasks'
    | 'tasks_assigned'
    | 'surveys'
    | 'documents'
    | 'report_tables'
    | 'attendance'
    | 'messages';
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
  roles?: UserRole[];
  panel: SidebarPanel;
}
