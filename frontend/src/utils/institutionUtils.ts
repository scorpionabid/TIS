import React from 'react';
import { InstitutionType } from '@/services/institutions';
import { Building, MapPin, Users, School } from 'lucide-react';

/**
 * Get fallback institution types for specific user roles
 * This avoids API calls for non-SuperAdmin users
 */
export const getFallbackTypesForRole = (userRole?: string): InstitutionType[] => {
  // Define all types once to avoid duplicates
  const allTypes: Record<string, InstitutionType> = {
    ministry: { 
      id: 1, 
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
    regional: { 
      id: 2, 
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
    sector: { 
      id: 3, 
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
    secondary_school: { 
      id: 4, 
      key: 'secondary_school', 
      label_az: 'Tam orta məktəb', 
      label: 'Tam orta məktəb', 
      label_en: 'Secondary School', 
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
    lyceum: { 
      id: 5, 
      key: 'lyceum', 
      label_az: 'Lisey', 
      label: 'Lisey', 
      label_en: 'Lyceum', 
      default_level: 4, 
      color: '#8B5CF6', 
      icon: 'School', 
      allowed_parent_types: [], 
      is_active: true, 
      is_system: true, 
      metadata: {}, 
      created_at: '', 
      updated_at: '' 
    },
    gymnasium: { 
      id: 6, 
      key: 'gymnasium', 
      label_az: 'Gimnaziya', 
      label: 'Gimnaziya', 
      label_en: 'Gymnasium', 
      default_level: 4, 
      color: '#EC4899', 
      icon: 'School', 
      allowed_parent_types: [], 
      is_active: true, 
      is_system: true, 
      metadata: {}, 
      created_at: '', 
      updated_at: '' 
    },
    kindergarten: { 
      id: 7, 
      key: 'kindergarten', 
      label_az: 'Uşaq bağçası', 
      label: 'Uşaq bağçası', 
      label_en: 'Kindergarten', 
      default_level: 4, 
      color: '#10B981', 
      icon: 'School', 
      allowed_parent_types: [], 
      is_active: true, 
      is_system: true, 
      metadata: {}, 
      created_at: '', 
      updated_at: '' 
    },
    regional_education_department: { 
      id: 8, 
      key: 'regional_education_department', 
      label_az: 'Regional Təhsil İdarəsi', 
      label: 'Regional Təhsil İdarəsi', 
      label_en: 'Regional Education Department', 
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
    sector_education_office: { 
      id: 9, 
      key: 'sector_education_office', 
      label_az: 'Sektor Təhsil Şöbəsi', 
      label: 'Sektor Təhsil Şöbəsi', 
      label_en: 'Sector Education Office', 
      default_level: 3, 
      color: '#10B981', 
      icon: 'Users', 
      allowed_parent_types: [], 
      is_active: true, 
      is_system: true, 
      metadata: {}, 
      created_at: '', 
      updated_at: '' 
    }
  };

  // Define role-based access with unique keys
  const roleAccess: Record<string, string[]> = {
    superadmin: ['ministry', 'regional_education_department', 'sector_education_office', 'secondary_school', 'lyceum', 'gymnasium', 'kindergarten'],
    regionadmin: ['regional_education_department', 'sector_education_office', 'secondary_school', 'lyceum', 'gymnasium', 'kindergarten'],
    sektoradmin: ['sector_education_office', 'secondary_school', 'lyceum', 'gymnasium', 'kindergarten'],
    schooladmin: ['secondary_school', 'lyceum', 'gymnasium', 'kindergarten'],
  };

  // Get accessible types for role
  const effectiveRole = userRole || 'superadmin';
  const accessibleTypes = roleAccess[effectiveRole] || roleAccess.schooladmin;
  
  // Return unique types based on role
  return accessibleTypes.map(key => allTypes[key]).filter(Boolean);
};

/**
 * Get appropriate icon component for institution type
 */
export const getInstitutionIcon = (type: string | { id: number; name: string; key: string; level: number } | null): React.ReactElement => {
  let typeKey = '';
  
  // If type is an object (from API), use its key
  if (type && typeof type === 'object') {
    typeKey = type.key;
  } else if (typeof type === 'string') {
    typeKey = type;
  }
  
  // Map icon names to actual JSX elements
  switch (typeKey) {
    case 'ministry': return React.createElement(Building, { size: 16 });
    case 'region':
    case 'regional_education_department':
    case 'regional': return React.createElement(MapPin, { size: 16 });
    case 'sektor':
    case 'sector':
    case 'sector_education_office': return React.createElement(Users, { size: 16 });
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
      return React.createElement(School, { size: 16 });
    default: return React.createElement(School, { size: 16 });
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