// School-specific role types and interfaces
export interface SchoolRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  permissions: string[];
  parent_role?: string;
}

// School role definitions
export const SCHOOL_ROLES = {
  SCHOOL_ADMIN: 'schooladmin',
  MUAVIN: 'muavin',
  UBR: 'ubr', 
  TESARRUFAT: 'tesarrufat',
  PSIXOLOQ: 'psixoloq',
  MUELLIM: 'müəllim'
} as const;

export type SchoolRoleType = typeof SCHOOL_ROLES[keyof typeof SCHOOL_ROLES];

// Role hierarchy and permissions mapping
export const SCHOOL_ROLE_HIERARCHY: Record<SchoolRoleType, SchoolRole> = {
  [SCHOOL_ROLES.SCHOOL_ADMIN]: {
    id: 'schooladmin',
    name: 'SchoolAdmin',
    display_name: 'Məktəb Direktoru',
    description: 'Məktəbin ümumi idarəetməsi və strategiyası',
    hierarchy_level: 1,
    permissions: [
      'users.create', 'users.read', 'users.update',
      'institutions.read',
      'surveys.create', 'surveys.read', 'surveys.update',
      'schedules.create', 'schedules.read', 'schedules.update', 'schedules.approve',
      'grades.create', 'grades.read', 'grades.update', 'grades.manage', 'grades.assign',
      'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
      'documents.create', 'documents.read', 'documents.update', 'documents.share',
      'tasks.read', 'tasks.update',
      'assessments.create', 'assessments.read', 'assessments.update',
      'rooms.create', 'rooms.read', 'rooms.update', 'rooms.manage', 'rooms.assign',
      'events.create', 'events.read', 'events.update', 'events.manage', 'events.approve',
      'psychology.read', 'psychology.manage',
      'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage',
      'view teacher_performance', 'create teacher_performance', 'edit teacher_performance',
      'reports.read'
    ]
  },
  [SCHOOL_ROLES.MUAVIN]: {
    id: 'muavin',
    name: 'Müavin',
    display_name: 'Müavin (Dərs İdarəetməsi)',
    description: 'Dərs cədvəli, sinif bölgüsü və akademik proseslərin idarəetməsi',
    hierarchy_level: 2,
    permissions: [
      'schedules.create', 'schedules.read', 'schedules.update',
      'classes.create', 'classes.read', 'classes.update', 'classes.manage', 'classes.assign',
      'subjects.create', 'subjects.read', 'subjects.update', 'subjects.manage', 'subjects.assign',
      'rooms.read', 'rooms.update', 'rooms.assign',
      'grades.read', 'grades.update',
      'attendance.read', 'attendance.update',
      'documents.read', 'documents.create', 'documents.update',
      'assessments.read', 'assessments.update',
      'tasks.read', 'tasks.update',
      'view teacher_performance', 'edit teacher_performance',
      'reports.read'
    ],
    parent_role: SCHOOL_ROLES.SCHOOL_ADMIN
  },
  [SCHOOL_ROLES.UBR]: {
    id: 'ubr',
    name: 'UBR',
    display_name: 'Tədris-Bilimlər Referenti',
    description: 'Tədbir planlaması, ekskursiyalar və məktəb fəaliyyətləri',
    hierarchy_level: 2,
    permissions: [
      'events.create', 'events.read', 'events.update', 'events.manage', 'events.register', 'events.cancel',
      'schedules.read',
      'grades.read', 'attendance.read',
      'documents.read', 'documents.create', 'documents.share',
      'tasks.read', 'tasks.update',
      'assessments.read',
      'rooms.read',
      'surveys.read', 'surveys.respond',
      'reports.read'
    ],
    parent_role: SCHOOL_ROLES.SCHOOL_ADMIN
  },
  [SCHOOL_ROLES.TESARRUFAT]: {
    id: 'tesarrufat',
    name: 'Təsərrüfat',
    display_name: 'Təsərrüfat Müdiri',
    description: 'İnventarizasiya, avadanlıq və təsərrüfat işlərinin idarəetməsi',
    hierarchy_level: 2,
    permissions: [
      'inventory.create', 'inventory.read', 'inventory.update', 'inventory.manage', 
      'inventory.assign', 'inventory.maintenance',
      'rooms.read', 'rooms.update', 'rooms.manage',
      'documents.read', 'documents.create', 'documents.update',
      'tasks.read', 'tasks.update',
      'reports.read',
      'surveys.read', 'surveys.respond'
    ],
    parent_role: SCHOOL_ROLES.SCHOOL_ADMIN
  },
  [SCHOOL_ROLES.PSIXOLOQ]: {
    id: 'psixoloq',
    name: 'Psixoloq',
    display_name: 'Məktəb Psixoloquu',
    description: 'Şagird qayğısı, psixoloji dəstək və inkişaf izləməsi',
    hierarchy_level: 2,
    permissions: [
      'psychology.create', 'psychology.read', 'psychology.update', 'psychology.manage', 'psychology.assess',
      'students.read', 'students.update',
      'grades.read', 'attendance.read',
      'documents.read', 'documents.create', 'documents.share',
      'tasks.read', 'tasks.update',
      'assessments.read',
      'surveys.read', 'surveys.respond',
      'reports.read'
    ],
    parent_role: SCHOOL_ROLES.SCHOOL_ADMIN
  },
  [SCHOOL_ROLES.MUELLIM]: {
    id: 'müəllim',
    name: 'Müəllim',
    display_name: 'Fənn Müəllimi',
    description: 'Tədris prosesi, qiymətləndirmə və davamiyyət qeydiyyatı',
    hierarchy_level: 3,
    permissions: [
      'surveys.read', 'surveys.respond',
      'schedules.read',
      'grades.create', 'grades.read', 'grades.update',
      'attendance.manage', 'attendance.create', 'attendance.read', 'attendance.update',
      'documents.read', 'documents.create', 'documents.share',
      'tasks.read', 'tasks.update',
      'assessments.read', 'assessments.create', 'assessments.update',
      'students.read',
      'classes.read',
      'rooms.read',
      'events.read', 'events.register',
      'view teacher_performance'
    ],
    parent_role: SCHOOL_ROLES.MUAVIN
  }
};

// Helper functions
export const getSchoolRoleDisplayName = (roleId: string): string => {
  const role = Object.values(SCHOOL_ROLE_HIERARCHY).find(r => r.id === roleId);
  return role?.display_name || roleId;
};

export const getSchoolRolePermissions = (roleId: string): string[] => {
  const role = Object.values(SCHOOL_ROLE_HIERARCHY).find(r => r.id === roleId);
  return role?.permissions || [];
};

export const getSubordinateRoles = (roleId: string): SchoolRole[] => {
  return Object.values(SCHOOL_ROLE_HIERARCHY).filter(role => role.parent_role === roleId);
};

export const canManageRole = (managerRole: string, targetRole: string): boolean => {
  const manager = Object.values(SCHOOL_ROLE_HIERARCHY).find(r => r.id === managerRole);
  const target = Object.values(SCHOOL_ROLE_HIERARCHY).find(r => r.id === targetRole);
  
  if (!manager || !target) return false;
  
  return manager.hierarchy_level < target.hierarchy_level || 
         target.parent_role === managerRole;
};

// Role-specific dashboard configurations
export interface RoleDashboardConfig {
  primary_widgets: string[];
  secondary_widgets: string[];
  quick_actions: string[];
  navigation_items: string[];
}

export const ROLE_DASHBOARD_CONFIGS: Record<SchoolRoleType, RoleDashboardConfig> = {
  [SCHOOL_ROLES.SCHOOL_ADMIN]: {
    primary_widgets: ['overview_stats', 'pending_tasks', 'recent_activities', 'notifications'],
    secondary_widgets: ['budget_overview', 'performance_metrics', 'upcoming_events'],
    quick_actions: ['create_task', 'approve_request', 'view_reports', 'manage_users'],
    navigation_items: ['dashboard', 'users', 'classes', 'schedules', 'reports', 'settings']
  },
  [SCHOOL_ROLES.MUAVIN]: {
    primary_widgets: ['schedule_overview', 'class_assignments', 'teacher_workload', 'room_utilization'],
    secondary_widgets: ['grade_summaries', 'attendance_trends', 'assessment_calendar'],
    quick_actions: ['create_schedule', 'assign_teacher', 'manage_rooms', 'view_grades'],
    navigation_items: ['dashboard', 'schedules', 'classes', 'teachers', 'rooms', 'assessments']
  },
  [SCHOOL_ROLES.UBR]: {
    primary_widgets: ['event_calendar', 'upcoming_activities', 'participant_stats', 'resource_needs'],
    secondary_widgets: ['event_history', 'budget_tracking', 'feedback_summary'],
    quick_actions: ['create_event', 'plan_activity', 'book_resources', 'send_invitations'],
    navigation_items: ['dashboard', 'events', 'activities', 'calendar', 'resources', 'reports']
  },
  [SCHOOL_ROLES.TESARRUFAT]: {
    primary_widgets: ['inventory_overview', 'maintenance_requests', 'budget_status', 'asset_conditions'],
    secondary_widgets: ['purchase_history', 'vendor_performance', 'cost_analysis'],
    quick_actions: ['add_asset', 'schedule_maintenance', 'request_purchase', 'update_inventory'],
    navigation_items: ['dashboard', 'inventory', 'maintenance', 'purchases', 'vendors', 'reports']
  },
  [SCHOOL_ROLES.PSIXOLOQ]: {
    primary_widgets: ['student_caseload', 'session_schedule', 'assessment_results', 'referral_status'],
    secondary_widgets: ['progress_tracking', 'intervention_outcomes', 'parent_communications'],
    quick_actions: ['schedule_session', 'create_assessment', 'update_case', 'contact_parent'],
    navigation_items: ['dashboard', 'students', 'sessions', 'assessments', 'reports', 'resources']
  },
  [SCHOOL_ROLES.MUELLIM]: {
    primary_widgets: ['my_classes', 'today_schedule', 'grade_book', 'attendance_summary'],
    secondary_widgets: ['upcoming_assessments', 'student_progress', 'professional_development'],
    quick_actions: ['take_attendance', 'enter_grades', 'create_assessment', 'view_schedule'],
    navigation_items: ['dashboard', 'classes', 'grades', 'attendance', 'assessments', 'schedule']
  }
};