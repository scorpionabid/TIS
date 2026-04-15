import { USER_ROLES, UserRole } from '@/constants/roles';

/** SuperAdmin → SchoolAdmin: all 5 administrative roles */
export const ALL_ADMINS: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
  USER_ROLES.SEKTORADMIN,
  USER_ROLES.SCHOOLADMIN,
];

/** All administrative roles + teacher */
export const ALL_USERS: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
  USER_ROLES.SEKTORADMIN,
  USER_ROLES.SCHOOLADMIN,
  USER_ROLES.MUELLIM,
];

/** SuperAdmin → SektorAdmin: above school level */
export const REGION_AND_ABOVE: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
  USER_ROLES.SEKTORADMIN,
];

/** SuperAdmin, RegionAdmin, RegionOperator */
export const REGION_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.REGIONOPERATOR,
];

/** SuperAdmin, RegionAdmin */
export const REGION_ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
];

/** SuperAdmin, RegionAdmin, SektorAdmin — system management level */
export const MGMT_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.SEKTORADMIN,
];

/** SuperAdmin, RegionAdmin, SektorAdmin, SchoolAdmin — reporting level */
export const REPORTING_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.REGIONADMIN,
  USER_ROLES.SEKTORADMIN,
  USER_ROLES.SCHOOLADMIN,
];

/** SuperAdmin, SchoolAdmin */
export const SCHOOL_ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.SCHOOLADMIN,
];
