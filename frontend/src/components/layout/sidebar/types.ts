import { LucideIcon } from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  hasSubmenu?: boolean;
  key?: string;
  submenu?: { label: string; path: string; permission?: string }[];
  permission?: string; // Permission required to see this menu item
}

export interface MenuGroup {
  groupLabel: string;
  items: MenuItem[];
}

export interface SidebarState {
  openGroups: Record<string, boolean>;
  itemSubmenus: Record<string, boolean>;
  isProfileEditOpen: boolean;
  isPasswordChangeOpen: boolean;
}