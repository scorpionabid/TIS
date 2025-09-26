export type SidebarBehavior = 'auto' | 'manual';

export interface SidebarPreferences {
  behavior: SidebarBehavior;
  defaultExpanded: boolean;
  persistState: boolean;
  autoCollapseOnNavigation: boolean;
  keepAlwaysExpanded: boolean;
}

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferences = {
  behavior: 'auto',
  defaultExpanded: false,
  persistState: true,
  autoCollapseOnNavigation: true,
  keepAlwaysExpanded: false
};

export interface SidebarState {
  isExpanded: boolean;
  isHovered: boolean;
  isManuallyToggled: boolean;
  preferences: SidebarPreferences;
}