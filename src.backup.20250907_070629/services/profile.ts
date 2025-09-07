import { apiClient, ApiResponse } from './api';

export interface UserProfile {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  patronymic?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  national_id?: string;
  profile_image_path?: string;
  contact_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  education_history?: Array<{
    institution: string;
    degree: string;
    year: number;
  }>;
  employment_history?: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    expiry_date?: string;
  }>;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    notifications?: {
      email?: boolean;
      browser?: boolean;
      sound?: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
    institution?: {
      id: number;
      name: string;
      type: string;
    };
    region?: {
      id: number;
      name: string;
    };
    department?: {
      id: number;
      name: string;
    };
    profile?: UserProfile;
    created_at: string;
    updated_at: string;
  };
  avatar_url?: string;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    patronymic?: string;
    birth_date?: string;
    gender?: string;
    contact_phone?: string;
    bio?: string;
  };
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: {
      email?: boolean;
      browser?: boolean;
      sound?: boolean;
    };
  };
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ActivityRecord {
  id: number;
  description: string;
  subject_type?: string;
  subject_id?: number;
  created_at: string;
}

class ProfileService {
  private readonly baseEndpoint = '/profile';

  /**
   * Get current user profile with all related data
   */
  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>(this.baseEndpoint);
    
    if (!response.data) {
      throw new Error('Profil məlumatları alına bilmədi');
    }
    
    return response.data;
  }

  /**
   * Update user profile data
   */
  async updateProfile(data: UpdateProfileData): Promise<ProfileResponse> {
    const response = await apiClient.put<ProfileResponse>(this.baseEndpoint, data);
    
    if (!response.data) {
      throw new Error('Profil yenilənə bilmədi');
    }
    
    return response.data;
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string; avatar_path: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await apiClient.post<{ avatar_url: string; avatar_path: string }>(
      `${this.baseEndpoint}/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (!response.data) {
      throw new Error('Avatar yüklənə bilmədi');
    }
    
    return response.data;
  }

  /**
   * Remove profile avatar
   */
  async removeAvatar(): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/avatar`);
  }

  /**
   * Get user activity history
   */
  async getActivity(page = 1, perPage = 15): Promise<{
    data: ActivityRecord[];
    current_page: number;
    last_page: number;
    total: number;
  }> {
    const response = await apiClient.get<{
      data: ActivityRecord[];
      current_page: number;
      last_page: number;
      total: number;
    }>(`${this.baseEndpoint}/activity`, {
      page,
      per_page: perPage,
    });
    
    if (!response.data) {
      throw new Error('Fəaliyyət tarixçəsi alına bilmədi');
    }
    
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.put(`${this.baseEndpoint}/password`, data);
  }

  /**
   * Validate avatar file before upload
   */
  validateAvatarFile(file: File): { valid: boolean; error?: string } {
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { valid: false, error: 'Fayl ölçüsü 2MB-dan böyük ola bilməz' };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Yalnız JPG, PNG və GIF formatları dəstəklənir' };
    }

    return { valid: true };
  }

  /**
   * Get user initials for avatar fallback
   */
  getUserInitials(name?: string): string {
    if (!name) return 'U';
    
    return name
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  }

  /**
   * Format display name
   */
  getDisplayName(profile?: UserProfile, fallbackName?: string): string {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    
    if (profile?.first_name) {
      return profile.first_name;
    }
    
    return fallbackName || 'İstifadəçi';
  }

  /**
   * Get full name with patronymic
   */
  getFullName(profile?: UserProfile): string {
    const parts = [
      profile?.first_name,
      profile?.patronymic,
      profile?.last_name
    ].filter(Boolean);
    
    return parts.join(' ') || '';
  }
}

export const profileService = new ProfileService();