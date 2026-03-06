export type SidebarBehavior = 'auto' | 'manual';
export type SidebarPanel = 'management' | 'work';

export interface SidebarPreferences {
  behavior: SidebarBehavior;
  defaultExpanded: boolean;
  persistState: boolean;
  autoCollapseOnNavigation: boolean;
  keepAlwaysExpanded: boolean;
  activePanel: SidebarPanel;
}

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferences = {
  behavior: 'auto',
  defaultExpanded: false,
  persistState: true,
  autoCollapseOnNavigation: true,
  keepAlwaysExpanded: false,
  activePanel: 'work'
};

export interface SidebarState {
  isExpanded: boolean;
  isHovered: boolean;
  isManuallyToggled: boolean;
  preferences: SidebarPreferences;
}