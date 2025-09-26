import { SidebarPreferences, DEFAULT_SIDEBAR_PREFERENCES } from '@/types/sidebar';

const SIDEBAR_PREFERENCES_KEY = 'atis_sidebar_preferences';
const SIDEBAR_STATE_KEY = 'atis_sidebar_state';

export class SidebarStorage {
  static savePreferences(preferences: SidebarPreferences): void {
    try {
      localStorage.setItem(SIDEBAR_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save sidebar preferences:', error);
    }
  }

  static loadPreferences(): SidebarPreferences {
    try {
      const stored = localStorage.getItem(SIDEBAR_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SidebarPreferences;
        // Merge with defaults to handle missing properties from updates
        return {
          ...DEFAULT_SIDEBAR_PREFERENCES,
          ...parsed,
        };
      }
    } catch (error) {
      console.warn('Failed to load sidebar preferences:', error);
    }
    return DEFAULT_SIDEBAR_PREFERENCES;
  }

  static saveSidebarState(isExpanded: boolean): void {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify({ isExpanded }));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  static loadSidebarState(): { isExpanded: boolean } | null {
    try {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
    }
    return null;
  }

  static clearPreferences(): void {
    try {
      localStorage.removeItem(SIDEBAR_PREFERENCES_KEY);
      localStorage.removeItem(SIDEBAR_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear sidebar preferences:', error);
    }
  }

  static resetToDefaults(): SidebarPreferences {
    this.clearPreferences();
    this.savePreferences(DEFAULT_SIDEBAR_PREFERENCES);
    return DEFAULT_SIDEBAR_PREFERENCES;
  }
}