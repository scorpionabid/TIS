import { LucideIcon } from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  hasSubmenu?: boolean;
  key?: string;
  submenu?: { label: string; path: string }[];
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