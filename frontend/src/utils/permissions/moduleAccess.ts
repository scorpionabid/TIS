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
      permissions: ['surveys.view', 'surveys.manage'],
      regionOperatorFlags: ['can_view_surveys'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['surveys.create', 'surveys.manage'],
      regionOperatorFlags: ['can_create_surveys'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.edit', 'surveys.manage'],
      regionOperatorFlags: ['can_edit_surveys'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.delete', 'surveys.manage'],
      regionOperatorFlags: ['can_delete_surveys'],
    },
    publish: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['surveys.publish', 'surveys.manage'],
      regionOperatorFlags: ['can_publish_surveys'],
    },
  },
  tasks: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.view', 'tasks.manage'],
      regionOperatorFlags: ['can_view_tasks'],
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.create', 'tasks.manage'],
      regionOperatorFlags: ['can_create_tasks'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.edit', 'tasks.manage'],
      regionOperatorFlags: ['can_edit_tasks'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['tasks.delete', 'tasks.manage'],
      regionOperatorFlags: ['can_delete_tasks'],
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['tasks.assign', 'tasks.manage'],
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
      permissions: ['documents.view', 'documents.manage'],
      regionOperatorFlags: ['can_view_documents'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.upload', 'documents.manage'],
      regionOperatorFlags: ['can_upload_documents'],
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.edit', 'documents.manage'],
      regionOperatorFlags: ['can_edit_documents'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin, ADMIN_ROLES.sektoradmin],
      permissions: ['documents.delete', 'documents.manage'],
      regionOperatorFlags: ['can_delete_documents'],
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['documents.share', 'documents.manage'],
      regionOperatorFlags: ['can_share_documents'],
    },
  },
  folders: {
    view: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['folders.view', 'folders.manage'],
      regionOperatorFlags: ['can_view_folders'],
    },
    create: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['folders.create', 'folders.manage'],
      regionOperatorFlags: ['can_create_folders'],
    },
    edit: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['folders.edit', 'folders.manage'],
      regionOperatorFlags: ['can_edit_folders'],
    },
    delete: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['folders.delete', 'folders.manage'],
      regionOperatorFlags: ['can_delete_folders'],
    },
    manage: {
      roles: [ADMIN_ROLES.superadmin, ADMIN_ROLES.regionadmin],
      permissions: ['folders.manage'],
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
      permissions: ['links.view', 'links.manage'],
      regionOperatorFlags: ['can_view_links'],
    },
    create: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.create', 'links.manage'],
      regionOperatorFlags: ['can_create_links'],
    },
    edit: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.edit', 'links.manage'],
      regionOperatorFlags: ['can_edit_links'],
    },
    delete: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.delete', 'links.manage'],
      regionOperatorFlags: ['can_delete_links'],
    },
    share: {
      roles: [
        ADMIN_ROLES.superadmin,
        ADMIN_ROLES.regionadmin,
        ADMIN_ROLES.sektoradmin,
        ADMIN_ROLES.schooladmin,
      ],
      permissions: ['links.share', 'links.manage'],
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

  if (normalizedRole === 'regionoperator' && rule.regionOperatorFlags) {
    console.log('[ModuleAccess] Checking region operator flags:', {
      role: normalizedRole,
      flags: rule.regionOperatorFlags,
      permissions: user.region_operator_permissions,
      hasPermissions: !!user.region_operator_permissions,
    });

    if (rule.regionOperatorFlags.some(flag => user.region_operator_permissions?.[flag])) {
      console.log('[ModuleAccess] Access granted via region operator flag');
      return true;
    }
  }

  return false;
};

export const buildModuleAccess = (
  user: User | null,
  module: ModuleKey,
  hasPermission?: (perm: string) => boolean
): ModuleAccessResult => {
  console.log('[ModuleAccess] buildModuleAccess called:', {
    module,
    hasUser: !!user,
    userId: user?.id,
    username: user?.username,
    role: user?.role,
    hasRegionOperatorPermissions: !!user?.region_operator_permissions,
  });

  if (!user) {
    console.log('[ModuleAccess] No user, returning default access');
    return { ...defaultAccess };
  }

  const normalizedRole = normalizeRole(user.role as string);
  const moduleRule = MODULE_ACCESS_RULES[module];

  console.log('[ModuleAccess] Evaluating access:', {
    normalizedRole,
    module,
    moduleRuleExists: !!moduleRule,
  });

  const result: Partial<ModuleAccessResult> = {};

  Object.entries(ACTION_PROP_MAP).forEach(([action, propName]) => {
    const actionRule = moduleRule[action as ModuleAction];
    const hasAccess = evaluateRule(user, actionRule, normalizedRole, hasPermission);
    (result as any)[propName] = hasAccess;

    if (action === 'view') {
      console.log('[ModuleAccess] View access evaluation:', {
        module,
        action,
        propName,
        hasAccess,
        rule: actionRule,
      });
    }
  });

  const finalResult = {
    ...defaultAccess,
    ...result,
    hasAccess: Boolean((result as any).canView),
  };

  console.log('[ModuleAccess] Final result:', {
    module,
    result: finalResult,
  });

  return finalResult;
};
