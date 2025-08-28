import { InstitutionType } from '@/services/institutions';
import { Building, MapPin, Users, School } from 'lucide-react';

/**
 * Get fallback institution types for specific user roles
 * This avoids API calls for non-SuperAdmin users
 */
export const getFallbackTypesForRole = (userRole?: string): InstitutionType[] => {
  const fallbackTypes: InstitutionType[] = [];
  
  // Ministry level types (for superadmin)
  if (userRole === 'superadmin') {
    fallbackTypes.push(
      { 
        id: 0, 
        key: 'ministry', 
        label_az: 'Nazirlik', 
        label: 'Nazirlik', 
        label_en: 'Ministry', 
        default_level: 1, 
        color: '#1F2937', 
        icon: 'Building', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
    );
  }
  
  if (userRole === 'regionadmin' || userRole === 'superadmin') {
    fallbackTypes.push(
      { 
        id: 1, 
        key: 'regional', 
        label_az: 'Regional İdarə', 
        label: 'Regional İdarə', 
        label_en: 'Regional Office', 
        default_level: 2, 
        color: '#3B82F6', 
        icon: 'MapPin', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 2, 
        key: 'sector', 
        label_az: 'Sektor', 
        label: 'Sektor', 
        label_en: 'Sector', 
        default_level: 3, 
        color: '#10B981', 
        icon: 'Users', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 3, 
        key: 'school', 
        label_az: 'Məktəb', 
        label: 'Məktəb', 
        label_en: 'School', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 4, 
        key: 'lyceum', 
        label_az: 'Lisey', 
        label: 'Lisey', 
        label_en: 'Lyceum', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      }
    );
  }
  
  if (userRole === 'sektoradmin' || userRole === 'regionadmin' || userRole === 'superadmin') {
    fallbackTypes.push(
      { 
        id: 2, 
        key: 'sector', 
        label_az: 'Sektor', 
        label: 'Sektor', 
        label_en: 'Sector', 
        default_level: 3, 
        color: '#10B981', 
        icon: 'Users', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 3, 
        key: 'school', 
        label_az: 'Məktəb', 
        label: 'Məktəb', 
        label_en: 'School', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 4, 
        key: 'lyceum', 
        label_az: 'Lisey', 
        label: 'Lisey', 
        label_en: 'Lyceum', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      }
    );
  }
  
  if (userRole === 'schooladmin' || userRole === 'sektoradmin' || userRole === 'regionadmin' || userRole === 'superadmin' || !userRole) {
    fallbackTypes.push(
      { 
        id: 3, 
        key: 'school', 
        label_az: 'Məktəb', 
        label: 'Məktəb', 
        label_en: 'School', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      },
      { 
        id: 4, 
        key: 'lyceum', 
        label_az: 'Lisey', 
        label: 'Lisey', 
        label_en: 'Lyceum', 
        default_level: 4, 
        color: '#F59E0B', 
        icon: 'School', 
        allowed_parent_types: [], 
        is_active: true, 
        is_system: true, 
        metadata: {}, 
        created_at: '', 
        updated_at: '' 
      }
    );
  }
  
  return fallbackTypes;
};

/**
 * Get appropriate icon component for institution type
 */
export const getInstitutionIcon = (type: string | { id: number; name: string; key: string; level: number } | null) => {
  let typeKey = '';
  
  // If type is an object (from API), use its key
  if (type && typeof type === 'object') {
    typeKey = type.key;
  } else if (typeof type === 'string') {
    typeKey = type;
  }
  
  // Map icon names to actual components
  switch (typeKey) {
    case 'ministry': return Building;
    case 'region':
    case 'regional_education_department':
    case 'regional': return MapPin;
    case 'sektor':
    case 'sector':
    case 'sector_education_office': return Users;
    case 'school': 
    case 'secondary_school':
    case 'lyceum':
    case 'gymnasium':
    case 'kindergarten':
    case 'preschool_center':
    case 'nursery':
    case 'vocational_school':
    case 'special_education_school':
    case 'primary_school':
    case 'vocational':
    case 'university':
      return School;
    default: return School;
  }
};

/**
 * Get human-readable label for institution type
 */
export const getTypeLabel = (type: string | { id: number; name: string; key: string; level: number } | null) => {
  // If type is an object (from API), use its name
  if (type && typeof type === 'object') {
    return type.name;
  }
  
  // If type is a string, use fallback mappings
  if (typeof type === 'string') {
    switch (type) {
      case 'ministry': return 'Nazirlik';
      case 'region': return 'Regional İdarə';
      case 'regional_education_department': return 'Regional Təhsil İdarəsi';
      case 'regional': return 'Regional İdarə';
      case 'sektor': return 'Sektor';
      case 'sector': return 'Sektor';
      case 'sector_education_office': return 'Sektor Təhsil Şöbəsi';
      case 'school': return 'Məktəb';
      case 'secondary_school': return 'Tam orta məktəb';
      case 'lyceum': return 'Lisey';
      case 'gymnasium': return 'Gimnaziya';
      case 'kindergarten': return 'Uşaq Bağçası';
      case 'preschool_center': return 'Məktəbəqədər Təhsil Mərkəzi';
      case 'nursery': return 'Uşaq Evi';
      case 'vocational_school': return 'Peşə Məktəbi';
      case 'special_education_school': return 'Xüsusi Təhsil Məktəbi';
      case 'primary_school': return 'İbtidai məktəb';
      case 'vocational': return 'Peşə məktəbi';
      case 'university': return 'Universitet';
      default: return type;
    }
  }
  
  return 'Naməlum';
};

/**
 * Check if user role can access specific institution type filters
 */
export const canAccessInstitutionType = (userRole: string | undefined, typeKey: string): boolean => {
  if (userRole === 'superadmin') return true;
  
  if (userRole === 'regionadmin') {
    return ['regional', 'region', 'sector', 'sektor', 'school', 'lyceum', 'gymnasium', 'kindergarten', 'preschool_center', 'vocational_school', 'special_education_school'].includes(typeKey);
  }
  
  if (userRole === 'sektoradmin') {
    return ['sector', 'sektor', 'school', 'lyceum', 'gymnasium', 'kindergarten', 'preschool_center', 'vocational_school', 'special_education_school'].includes(typeKey);
  }
  
  if (userRole === 'schooladmin') {
    return ['school', 'lyceum', 'gymnasium', 'kindergarten', 'preschool_center', 'vocational_school', 'special_education_school'].includes(typeKey);
  }
  
  return true; // Default: show all for unknown roles
};