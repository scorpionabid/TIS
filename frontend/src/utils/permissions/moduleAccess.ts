import { USER_ROLES } from '@/constants/roles';
import { User } from '@/types/user';

export type ModuleKey = 'surveys' | 'tasks' | 'documents' | 'folders' | 'links';

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
} as const;

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
      regionOperatorFlags: ['can_view_surveys'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['surveys.create', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: ['can_create_surveys'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.update', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: ['can_edit_surveys'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.delete', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: ['can_delete_surveys'],
    },
    publish: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.publish', 'surveys.write', 'surveys.manage'],
      regionOperatorFlags: ['can_publish_surveys'],
    },
  },
  tasks: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.read', 'tasks.analytics'],
      regionOperatorFlags: ['can_view_tasks'],
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.create', 'tasks.bulk'],
      regionOperatorFlags: ['can_create_tasks'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.update', 'tasks.bulk'],
      regionOperatorFlags: ['can_edit_tasks'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['tasks.delete', 'tasks.bulk'],
      regionOperatorFlags: ['can_delete_tasks'],
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.bulk', 'tasks.analytics'],
      regionOperatorFlags: ['can_assign_tasks'],
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
      regionOperatorFlags: ['can_view_documents'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.create', 'documents.bulk'],
      regionOperatorFlags: ['can_upload_documents'],
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.update', 'documents.bulk'],
      regionOperatorFlags: ['can_edit_documents'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['documents.delete', 'documents.bulk'],
      regionOperatorFlags: ['can_delete_documents'],
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.share', 'documents.update'],
      regionOperatorFlags: ['can_share_documents'],
    },
  },
  folders: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.read'],
      regionOperatorFlags: ['can_view_folders'],
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.create'],
      regionOperatorFlags: ['can_create_folders'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.update'],
      regionOperatorFlags: ['can_edit_folders'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.delete'],
      regionOperatorFlags: ['can_delete_folders'],
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['documents.update'],
      regionOperatorFlags: ['can_manage_folder_access'],
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
      regionOperatorFlags: ['can_view_links'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.create', 'links.bulk'],
      regionOperatorFlags: ['can_create_links'],
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.update', 'links.bulk'],
      regionOperatorFlags: ['can_edit_links'],
    },
    delete: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.delete', 'links.bulk'],
      regionOperatorFlags: ['can_delete_links'],
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.share', 'links.update'],
      regionOperatorFlags: ['can_share_links'],
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
