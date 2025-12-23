import { USER_ROLES } from '@/constants/roles';
import { User } from '@/types/user';
import regionOperatorPermissions from '@/shared/region-operator-permissions.json';

export type ModuleKey =
  | 'surveys'
  | 'tasks'
  | 'documents'
  | 'folders'
  | 'links'
  | 'attendance'
  | 'reports'
  | 'analytics'
  | 'approvals';

type ModuleAction = 'view' | 'create' | 'edit' | 'delete' | 'publish' | 'manage' | 'share';

type ActionRule = {
  roles?: string[];
  permissions?: string[];
  regionOperatorFlags?: string[];
};

type ModuleRuleConfig = Partial<Record<ModuleAction, ActionRule>>;

const ACTION_PROP_MAP: Record<ModuleAction, string> = {
  view: 'canView',
  create: 'canCreate',
  edit: 'canEdit',
  delete: 'canDelete',
  publish: 'canPublish',
  manage: 'canManage',
  share: 'canShare',
};

const ADMIN_ROLES = {
  superadmin: USER_ROLES.SUPERADMIN,
  regionadmin: USER_ROLES.REGIONADMIN,
  sektoradmin: USER_ROLES.SEKTORADMIN,
  schooladmin: USER_ROLES.SCHOOLADMIN,
  regionoperator: USER_ROLES.REGIONOPERATOR,
} as const;

type RegionOperatorActionConfig = {
  flag?: string;
  assignable?: string | string[];
};

type RegionOperatorModuleConfig = {
  actions?: Partial<Record<ModuleAction, RegionOperatorActionConfig>>;
};

type RegionOperatorModuleMap = Record<string, RegionOperatorModuleConfig>;
type RegionOperatorModuleKey = keyof typeof regionOperatorPermissions.modules;

const getRegionOperatorFlags = (
  moduleKey: RegionOperatorModuleKey,
  action: ModuleAction
): string[] | undefined => {
  const modules = regionOperatorPermissions.modules as RegionOperatorModuleMap;
  const moduleConfig = modules[moduleKey];
  const flag = moduleConfig?.actions?.[action]?.flag;
  return flag ? [flag] : undefined;
};

const MODULE_ACCESS_RULES: Record<ModuleKey, ModuleRuleConfig> = {
  surveys: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['surveys.read', 'surveys.manage'],
      regionOperatorFlags: getRegionOperatorFlags('surveys', 'view'),
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['surveys.create', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: getRegionOperatorFlags('surveys', 'create'),
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.update', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: getRegionOperatorFlags('surveys', 'edit'),
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.delete', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: getRegionOperatorFlags('surveys', 'delete'),
    },
    publish: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.publish', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: getRegionOperatorFlags('surveys', 'publish'),
    },
  },
  tasks: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.read', 'tasks.analytics'],
      regionOperatorFlags: getRegionOperatorFlags('tasks', 'view'),
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.create', 'tasks.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('tasks', 'create'),
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.update', 'tasks.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('tasks', 'edit'),
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['tasks.delete', 'tasks.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('tasks', 'delete'),
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.bulk', 'tasks.analytics'],
      regionOperatorFlags: getRegionOperatorFlags('tasks', 'manage'),
    },
  },
  documents: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.read', 'documents.analytics'],
      regionOperatorFlags: getRegionOperatorFlags('documents', 'view'),
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.create', 'documents.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('documents', 'create'),
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.update', 'documents.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('documents', 'edit'),
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['documents.delete', 'documents.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('documents', 'delete'),
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.share', 'documents.update'],
      regionOperatorFlags: getRegionOperatorFlags('documents', 'share'),
    },
  },
  folders: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.read'],
      regionOperatorFlags: getRegionOperatorFlags('folders', 'view'),
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.create'],
      regionOperatorFlags: getRegionOperatorFlags('folders', 'create'),
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.update'],
      regionOperatorFlags: getRegionOperatorFlags('folders', 'edit'),
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.delete'],
      regionOperatorFlags: getRegionOperatorFlags('folders', 'delete'),
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.update'],
      regionOperatorFlags: getRegionOperatorFlags('folders', 'manage'),
    },
  },
  links: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.read', 'links.analytics'],
      regionOperatorFlags: getRegionOperatorFlags('links', 'view'),
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.create', 'links.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('links', 'create'),
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.update', 'links.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('links', 'edit'),
    },
    delete: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.delete', 'links.bulk'],
      regionOperatorFlags: getRegionOperatorFlags('links', 'delete'),
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.share', 'links.update'],
      regionOperatorFlags: getRegionOperatorFlags('links', 'share'),
    },
  },
  attendance: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
        ADMIN_ROLES.regionoperator,
      ],
      permissions: ['attendance.read', 'students.attendance'],
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.schooladmin],
      permissions: ['attendance.create', 'attendance.update'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.schooladmin],
      permissions: ['attendance.update'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.schooladmin],
      permissions: ['attendance.delete'],
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['attendance.manage'],
    },
  },
  reports: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
        ADMIN_ROLES.regionoperator,
      ],
      permissions: ['reports.read'],
    },
  },
  analytics: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
        ADMIN_ROLES.regionoperator,
      ],
      permissions: ['analytics.view', 'reports.read'],
    },
  },
  approvals: {
    view: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
        ADMIN_ROLES.regionoperator,
      ],
      permissions: ['approvals.read', 'survey_responses.read'],
    },
    manage: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
      ],
      permissions: ['approvals.approve', 'survey_responses.approve'],
    },
  },
};

export type ModuleAccessResult = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManage: boolean;
  canShare: boolean;
  hasAccess: boolean;
};

const defaultAccess: ModuleAccessResult = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPublish: false,
  canManage: false,
  canShare: false,
  hasAccess: false,
};

const normalizeRole = (role?: string | null) => role?.toString().toLowerCase() ?? '';

const evaluateRule = (
  user: User | null,
  rule: ActionRule | undefined,
  normalizedRole: string,
  hasPermission?: (perm: string) => boolean
): boolean => {
  if (!user || !rule) return false;

  if (rule.roles && rule.roles.includes(normalizedRole)) {
    return true;
  }

  if (rule.permissions && hasPermission && rule.permissions.some(perm => hasPermission(perm))) {
    return true;
  }

  if (
    normalizedRole === 'regionoperator' &&
    rule.regionOperatorFlags &&
    rule.regionOperatorFlags.some(flag => user.region_operator_permissions?.[flag])
  ) {
    return true;
  }

  return false;
};

export const buildModuleAccess = (
  user: User | null,
  module: ModuleKey,
  hasPermission?: (perm: string) => boolean
): ModuleAccessResult => {
  if (!user) {
    return { ...defaultAccess };
  }

  const normalizedRole = normalizeRole(user.role as string);
  const moduleRule = MODULE_ACCESS_RULES[module];

  const result: Partial<ModuleAccessResult> = {};

  Object.entries(ACTION_PROP_MAP).forEach(([action, propName]) => {
    const actionRule = moduleRule[action as ModuleAction];
    (result as any)[propName] = evaluateRule(user, actionRule, normalizedRole, hasPermission);
  });

  return {
    ...defaultAccess,
    ...result,
    hasAccess: Boolean((result as any).canView),
  };
};
