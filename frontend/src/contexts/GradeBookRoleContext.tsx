import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type GradeBookViewMode = 'region' | 'sector' | 'school' | 'teacher';

export interface GradeBookRoleContextType {
  viewMode: GradeBookViewMode;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canViewHierarchy: boolean;
  hierarchyLevel: number;
  currentScope: {
    regionId?: number;
    sectorId?: number;
    schoolId?: number;
  };
  isRegionAdmin: boolean;
  isSectorAdmin: boolean;
  isSchoolAdmin: boolean;
  isTeacher: boolean;
}

const GradeBookRoleContext = createContext<GradeBookRoleContextType | null>(null);

export const useGradeBookRole = () => {
  const context = useContext(GradeBookRoleContext);
  if (!context) {
    throw new Error('useGradeBookRole must be used within GradeBookRoleProvider');
  }
  return context;
};

export const GradeBookRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, hasRole } = useAuth();

  const roleContext = useMemo<GradeBookRoleContextType>(() => {
    // Use hasRole for proper role checking with normalization
    const isSuperAdmin = hasRole('superadmin');
    const isRegionAdmin = hasRole('regionadmin');
    const isSektorAdmin = hasRole('sektoradmin');
    const isSchoolAdmin = hasRole('schooladmin');
    const isTeacher = hasRole('müəllim');
    
    // Determine view mode based on role
    let viewMode: GradeBookViewMode = 'teacher';
    if (isSuperAdmin || isRegionAdmin) {
      viewMode = 'region';
    } else if (isSektorAdmin) {
      viewMode = 'sector';
    } else if (isSchoolAdmin) {
      viewMode = 'school';
    } else if (isTeacher) {
      viewMode = 'teacher';
    }

    // Determine permissions based on role
    const canEdit = isSchoolAdmin || isTeacher;
    const canCreate = isSchoolAdmin;
    const canDelete = isSchoolAdmin;
    const canViewHierarchy = isSuperAdmin || isRegionAdmin || isSektorAdmin;

    // Determine hierarchy level (lower = higher in hierarchy)
    let hierarchyLevel = 999;
    if (isSuperAdmin) hierarchyLevel = 1;
    else if (isRegionAdmin) hierarchyLevel = 2;
    else if (isSektorAdmin) hierarchyLevel = 3;
    else if (isSchoolAdmin) hierarchyLevel = 4;
    else if (isTeacher) hierarchyLevel = 5;

    return {
      viewMode,
      canEdit,
      canCreate,
      canDelete,
      canViewHierarchy,
      hierarchyLevel,
      currentScope: {
        regionId: currentUser?.region_id,
        sectorId: currentUser?.sector_id,
        schoolId: currentUser?.institution_id,
      },
      isRegionAdmin: isRegionAdmin || isSuperAdmin,
      isSectorAdmin: isSektorAdmin,
      isSchoolAdmin: isSchoolAdmin,
      isTeacher: isTeacher,
    };
  }, [currentUser, hasRole]);

  return (
    <GradeBookRoleContext.Provider value={roleContext}>
      {children}
    </GradeBookRoleContext.Provider>
  );
};

export default GradeBookRoleContext;
