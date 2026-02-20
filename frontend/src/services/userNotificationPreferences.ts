/**
 * User Notification Preferences Service
 *
 * Handles API calls for user-specific notification preferences
 */

import { apiClient as api } from "./api";

export interface UserNotificationPreferences {
  // Task notifications
  task_deadline_reminder: boolean;
  task_reminder_days: number;
  task_assigned_notification: boolean;
  task_status_change_notification: boolean;
  task_comment_notification: boolean;
  task_mention_notification: boolean;

  // Email preferences
  email_enabled: boolean;
  email_daily_digest: boolean;
  email_digest_time: string;

  // In-app notification preferences
  in_app_enabled: boolean;
  browser_push_enabled: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface UserNotificationPreferencesResponse {
  success: boolean;
  data: UserNotificationPreferences;
  message?: string;
}

export const userNotificationPreferencesService = {
  /**
   * Get current user's notification preferences
   */
  async getPreferences(): Promise<UserNotificationPreferencesResponse> {
    const response = await api.get<UserNotificationPreferences>("/user/notification-preferences");
    return response as unknown as UserNotificationPreferencesResponse;
  },

  /**
   * Update current user's notification preferences
   */
  async updatePreferences(
    data: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferencesResponse> {
    const response = await api.put<UserNotificationPreferences>("/user/notification-preferences", data);
    return response as unknown as UserNotificationPreferencesResponse;
  },

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<UserNotificationPreferencesResponse> {
    const defaultPreferences: UserNotificationPreferences = {
      task_deadline_reminder: true,
      task_reminder_days: 3,
      task_assigned_notification: true,
      task_status_change_notification: true,
      task_comment_notification: true,
      task_mention_notification: true,
      email_enabled: true,
      email_daily_digest: false,
      email_digest_time: "09:00",
      in_app_enabled: true,
      browser_push_enabled: false,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
    };
    return this.updatePreferences(defaultPreferences);
  },

  /**
   * Get default preferences (for UI fallback)
   */
  getDefaultPreferences(): UserNotificationPreferences {
    return {
      task_deadline_reminder: true,
      task_reminder_days: 3,
      task_assigned_notification: true,
      task_status_change_notification: true,
      task_comment_notification: true,
      task_mention_notification: true,
      email_enabled: true,
      email_daily_digest: false,
      email_digest_time: "09:00",
      in_app_enabled: true,
      browser_push_enabled: false,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
    };
  },
};
