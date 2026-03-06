import { SidebarPreferences, DEFAULT_SIDEBAR_PREFERENCES } from '@/types/sidebar';
import { storageHelpers } from '@/utils/helpers';

const SIDEBAR_PREFERENCES_KEY = 'atis_sidebar_preferences';
const SIDEBAR_STATE_KEY = 'atis_sidebar_state';

export class SidebarStorage {
  static savePreferences(preferences: SidebarPreferences): void {
    try {
      const stored = storageHelpers.set(SIDEBAR_PREFERENCES_KEY, preferences);
      if (!stored) {
        console.warn('Failed to persist sidebar preferences');
      }
    } catch (error) {
      console.warn('Failed to save sidebar preferences:', error);
    }
  }

  static loadPreferences(): SidebarPreferences {
    try {
      const stored = storageHelpers.get<SidebarPreferences>(SIDEBAR_PREFERENCES_KEY);
      if (stored) {
        // Merge with defaults to handle missing properties from updates
        return {
          ...DEFAULT_SIDEBAR_PREFERENCES,
          ...stored,
        };
      }
    } catch (error) {
      console.warn('Failed to load sidebar preferences:', error);
    }
    return DEFAULT_SIDEBAR_PREFERENCES;
  }

  static saveSidebarState(isExpanded: boolean): void {
    try {
      storageHelpers.set(SIDEBAR_STATE_KEY, { isExpanded });
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  static loadSidebarState(): { isExpanded: boolean } | null {
    try {
      return storageHelpers.get<{ isExpanded: boolean }>(SIDEBAR_STATE_KEY) || null;
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
    }
    return null;
  }

  static clearPreferences(): void {
    try {
      storageHelpers.remove(SIDEBAR_PREFERENCES_KEY);
      storageHelpers.remove(SIDEBAR_STATE_KEY);
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
