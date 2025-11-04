import type { User } from '@/types/user';
import type { DocumentCollection } from '@/types/documentCollection';

type MaybeUser = Partial<User> & {
  roles?: Array<string | { name?: string }>;
};

const normalizeRole = (role?: string | number | null): string | null => {
  if (role === undefined || role === null) {
    return null;
  }

  return role.toString().trim().toLowerCase() || null;
};

export const getUserRoles = (user?: MaybeUser | null): string[] => {
  if (!user) {
    return [];
  }

  const rolesFromArray =
    Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
          .map((role) => {
            if (typeof role === 'string') {
              return normalizeRole(role);
            }
            return normalizeRole(role?.name);
          })
          .filter(Boolean)
      : [];

  const primaryRole = normalizeRole((user as any).role);

  const roles = [...rolesFromArray];

  if (primaryRole) {
    roles.push(primaryRole);
  }

  // Unique role names
  return Array.from(new Set(roles)) as string[];
};

export const hasRole = (user: MaybeUser | null | undefined, role: string): boolean => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;

  return getUserRoles(user).includes(normalizedRole);
};

export const hasAnyRole = (user: MaybeUser | null | undefined, roles: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  const normalizedRoles = roles
    .map((role) => normalizeRole(role))
    .filter((role): role is string => !!role);

  if (normalizedRoles.length === 0) return false;

  const userRoles = getUserRoles(user);
  return normalizedRoles.some((role) => userRoles.includes(role));
};

export const getUserInstitutionId = (user?: MaybeUser | null): number | null => {
  if (!user) return null;
  const institutionId = (user as any)?.institution?.id ?? (user as any)?.institution_id;
  return typeof institutionId === 'number' ? institutionId : null;
};

type FolderLike = DocumentCollection & {
  target_institutions?: Array<number | { id: number }>;
  targetInstitutions?: Array<number | { id: number }>;
};

const getTargetInstitutionIds = (folder?: FolderLike | null): number[] => {
  if (!folder) return [];

  const rawTargets =
    (folder as any)?.target_institutions ??
    (folder as any)?.targetInstitutions ??
    [];

  if (!Array.isArray(rawTargets)) {
    return [];
  }

  return rawTargets
    .map((target) => {
      if (typeof target === 'number') {
        return target;
      }
      if (target && typeof target === 'object' && 'id' in target) {
        return (target as { id?: number }).id ?? null;
      }
      return null;
    })
    .filter((id): id is number => typeof id === 'number');
};

export const canUserCreateRegionalFolder = (user?: MaybeUser | null): boolean => {
  return hasAnyRole(user, ['superadmin', 'regionadmin']);
};

export const canUserManageFolder = (user: MaybeUser | null | undefined, folder: FolderLike): boolean => {
  if (!user) return false;
  if (hasRole(user, 'superadmin')) return true;

  if (hasRole(user, 'regionadmin')) {
    const userInstitutionId = getUserInstitutionId(user);
    return !!userInstitutionId && userInstitutionId === folder.owner_institution_id;
  }

  return false;
};

export const isUserSchoolAdmin = (user?: MaybeUser | null): boolean => {
  return hasRole(user, 'schooladmin');
};

export interface FolderUploadPermission {
  allowed: boolean;
  reason?: string;
  reasonCode?:
    | 'missing-user'
    | 'folder-locked'
    | 'uploads-disabled'
    | 'missing-institution'
    | 'no-targets'
    | 'institution-not-allowed';
  maxSizeMb?: number;
}

const DEFAULT_MAX_UPLOAD_MB = 50;

export const getFolderUploadPermission = (
  user: MaybeUser | null | undefined,
  folder: FolderLike
): FolderUploadPermission => {
  if (!user || !folder) {
    return {
      allowed: false,
      reason: 'İstifadəçi məlumatları tapılmadı. Zəhmət olmasa yenidən daxil olun.',
      reasonCode: 'missing-user'
    };
  }

  if (folder.is_locked) {
    return {
      allowed: false,
      reason: 'Folder kilidlidir. Administrator kilidi açmadan yükləmə mümkün deyil.',
      reasonCode: 'folder-locked'
    };
  }

  const isAdminUploader = hasAnyRole(user, ['superadmin', 'regionadmin']);

  if (!folder.allow_school_upload && !isAdminUploader) {
    return {
      allowed: false,
      reason: 'Bu folder üçün məktəb yükləməsi deaktiv edilib. Administrator icazəsi tələb olunur.',
      reasonCode: 'uploads-disabled'
    };
  }

  const userInstitutionId = getUserInstitutionId(user);
  if (!userInstitutionId && !isAdminUploader) {
    return {
      allowed: false,
      reason: 'Müəssisə məlumatı tapılmadı. Profildə institusiya seçilməlidir.',
      reasonCode: 'missing-institution'
    };
  }

  if (isAdminUploader) {
    return { allowed: true, maxSizeMb: DEFAULT_MAX_UPLOAD_MB };
  }

  const targetIds = getTargetInstitutionIds(folder);
  if (targetIds.length === 0) {
    return {
      allowed: false,
      reason: 'Bu folder üçün hədəf müəssisə seçilməyib. Administrator təyin etməlidir.',
      reasonCode: 'no-targets'
    };
  }

  if (!userInstitutionId || !targetIds.includes(userInstitutionId)) {
    return {
      allowed: false,
      reason: 'Sizin müəssisə hədəf siyahısında deyil. Administrator icazə verməlidir.',
      reasonCode: 'institution-not-allowed'
    };
  }

  return { allowed: true, maxSizeMb: DEFAULT_MAX_UPLOAD_MB };
};

export const canUserUploadToFolder = (user: MaybeUser | null | undefined, folder: FolderLike): boolean => {
  return getFolderUploadPermission(user, folder).allowed;
};
