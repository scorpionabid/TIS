import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  BarChart3,
  Settings,
  FileText,
  CheckSquare,
  ClipboardList,
  Building2,
  MapPin,
  Shield,
  Bell,
  Archive,
  Target,
  Award,
  UserCheck,
  Calendar,
  PieChart,
  TrendingUp,
  Database,
  Monitor,
  Download,
  Link,
  Baby,
  GraduationCap,
  Clipboard,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

export interface MenuItem {
  id: string;
  label: string;
  shortLabel?: string; // Kısa label mobil üçün
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  roles?: UserRole[];
  description?: string;
  badge?: string; // Yeni badge üçün
  isNew?: boolean; // Yeni xüsusiyyət göstərmək üçün
}

export interface MenuGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: MenuItem[];
  roles?: UserRole[];
  collapsed?: boolean; // Collapse edilə bilən
}

// Improved navigation with better UX and logical grouping
export const improvedNavigationConfig: MenuGroup[] = [
  // 📊 Dashboard - Hər kəs üçün
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'dashboard-home',
        label: 'Ana Səhifə',
        shortLabel: 'Ana Səhifə',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim']
      },
      {
        id: 'notifications',
        label: 'Bildirişlər',
        shortLabel: 'Bildirişlər',
        path: '/notifications',
        icon: Bell,
        badge: 'new',
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim']
      }
    ]
  },

  // 👥 İstifadəçilər və Roller
  {
    id: 'users',
    label: 'İstifadəçilər',
    icon: Users,
    roles: ['superadmin', 'regionadmin'],
    items: [
      {
        id: 'users-list',
        label: 'İstifadəçi Siyahısı',
        shortLabel: 'İstifadəçilər',
        path: '/users',
        icon: Users,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'roles',
        label: 'Rol İdarəetməsi',
        shortLabel: 'Rollar',
        path: '/roles',
        icon: Shield,
        roles: ['superadmin']
      },
      {
        id: 'permissions',
        label: 'İcazələr',
        shortLabel: 'İcazələr',
        path: '/permissions',
        icon: UserCheck,
        roles: ['superadmin']
      }
    ]
  },

  // 🏢 Struktur və Müəssisələr
  {
    id: 'structure',
    label: 'Struktur',
    icon: Building2,
    roles: ['superadmin', 'regionadmin', 'sektoradmin'],
    items: [
      {
        id: 'institutions',
        label: 'Məktəblər',
        shortLabel: 'Məktəblər',
        path: '/institutions',
        icon: School,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'preschools',
        label: 'Uşaq Bağçaları',
        shortLabel: 'Bağçalar',
        path: '/preschools',
        icon: Baby,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'departments',
        label: 'Departmentlər',
        shortLabel: 'Departmentlər',
        path: '/departments',
        icon: Building2,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'regions',
        label: 'Regionlar',
        shortLabel: 'Regionlar',
        path: '/regions',
        icon: MapPin,
        roles: ['superadmin']
      },
      {
        id: 'sectors',
        label: 'Sektorlar',
        shortLabel: 'Sektorlar',
        path: '/sectors',
        icon: Target,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // 📚 Məktəb İdarəetməsi
  {
    id: 'school',
    label: 'Məktəb',
    icon: GraduationCap,
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'attendance',
        label: 'Davamiyyət',
        shortLabel: 'Davamiyyət',
        icon: CheckSquare,
        roles: ['superadmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'attendance-register',
            label: 'Qeydiyyat',
            path: '/school/attendance/registration',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'attendance-reports',
            label: 'Hesabat',
            path: '/school/attendance/report',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'attendance-overview',
            label: 'İcmal',
            path: '/school/attendance',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          }
        ]
      },
      {
        id: 'assessments',
        label: 'Qiymətləndirmə',
        shortLabel: 'Qiymətləndirmə',
        icon: Award,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'assessment-types',
            label: 'Növlər',
            path: '/assessments/types',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
          },
          {
            id: 'assessment-entry',
            label: 'Daxil Etmə',
            path: '/assessments/entry',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'assessment-results',
            label: 'Nəticələr',
            path: '/assessments/results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'schedules',
        label: 'Dərs Cədvəli',
        shortLabel: 'Cədvəl',
        path: '/school/schedules',
        icon: Calendar,
        roles: ['superadmin', 'məktəbadmin', 'müəllim']
      },
      {
        id: 'workload',
        label: 'Dərs Yükü',
        shortLabel: 'Yük',
        path: '/school/workload',
        icon: BookOpen,
        roles: ['superadmin', 'məktəbadmin', 'müəllim']
      },
      {
        id: 'gradebook',
        label: 'Qiymət Dəftəri',
        shortLabel: 'Qiymətlər',
        path: '/school/gradebook',
        icon: Clipboard,
        roles: ['müəllim', 'məktəbadmin']
      },
      {
        id: 'my-classes',
        label: 'Mənim Siniflərim',
        shortLabel: 'Siniflərim',
        path: '/school/my-classes',
        icon: Users,
        roles: ['müəllim']
      }
    ]
  },

  // 📋 Sorğular
  {
    id: 'surveys',
    label: 'Sorğular',
    icon: ClipboardList,
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'surveys-list',
        label: 'Sorğu Siyahısı',
        shortLabel: 'Siyahı',
        path: '/surveys',
        icon: ClipboardList,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'survey-create',
        label: 'Yeni Sorğu',
        shortLabel: 'Yeni',
        path: '/surveys/create',
        icon: ClipboardList,
        isNew: true,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'survey-approval',
        label: 'Təsdiq',
        shortLabel: 'Təsdiq',
        path: '/survey-approval',
        icon: CheckSquare,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'survey-results',
        label: 'Nəticələr',
        shortLabel: 'Nəticələr',
        path: '/survey-results',
        icon: BarChart3,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'survey-archive',
        label: 'Arxiv',
        shortLabel: 'Arxiv',
        path: '/survey-archive',
        icon: Archive,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // 📋 Tapşırıqlar
  {
    id: 'tasks',
    label: 'Tapşırıqlar',
    icon: FileText,
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'tasks-list',
        label: 'Bütün Tapşırıqlar',
        shortLabel: 'Hamısı',
        path: '/tasks',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'tasks-my',
        label: 'Mənim Tapşırıqlarım',
        shortLabel: 'Mənim',
        path: '/tasks/my',
        icon: UserCheck,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'tasks-create',
        label: 'Yeni Tapşırıq',
        shortLabel: 'Yeni',
        path: '/tasks/create',
        icon: FileText,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // 📄 Sənədlər
  {
    id: 'content',
    label: 'Sənədlər',
    icon: FileText,
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'documents',
        label: 'Sənəd Kitabxanası',
        shortLabel: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'links',
        label: 'Faydalı Linklər',
        shortLabel: 'Linklər',
        path: '/links',
        icon: Link,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      }
    ]
  },

  // 📊 Hesabatlar və Analitika
  {
    id: 'analytics',
    label: 'Analitika',
    icon: TrendingUp,
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        shortLabel: 'Hesabatlar',
        path: '/reports',
        icon: Download,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'statistics',
        label: 'Statistika',
        shortLabel: 'Statistika',
        path: '/analytics',
        icon: PieChart,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'performance',
        label: 'Performans',
        shortLabel: 'Performans',
        path: '/performance',
        icon: TrendingUp,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // ⚙️ Sistem
  {
    id: 'system',
    label: 'Sistem',
    icon: Settings,
    roles: ['superadmin'],
    collapsed: true, // Default collapse edilmiş
    items: [
      {
        id: 'settings',
        label: 'Parametrlər',
        shortLabel: 'Parametrlər',
        path: '/settings',
        icon: Settings,
        roles: ['superadmin']
      },
      {
        id: 'hierarchy-management',
        label: 'İerarxiya',
        shortLabel: 'İerarxiya',
        path: '/hierarchy',
        icon: Database,
        roles: ['superadmin']
      },
      {
        id: 'audit-logs',
        label: 'Audit Log',
        shortLabel: 'Audit',
        path: '/audit-logs',
        icon: Clipboard,
        roles: ['superadmin']
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        shortLabel: 'Monitor',
        path: '/monitoring',
        icon: Monitor,
        roles: ['superadmin']
      }
    ]
  }
];

// Helper functions
export const getMenuForRole = (role: UserRole): MenuGroup[] => {
  return improvedNavigationConfig
    .filter(group => !group.roles || group.roles.includes(role))
    .map(group => ({
      ...group,
      items: filterMenuItems(group.items, role)
    }))
    .filter(group => group.items.length > 0);
};

function filterMenuItems(items: MenuItem[], role: UserRole): MenuItem[] {
  return items
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => ({
      ...item,
      children: item.children ? filterMenuItems(item.children, role) : undefined
    }))
    .filter(item => !item.children || item.children.length > 0);
}

export const findMenuItem = (path: string): MenuItem | null => {
  for (const group of improvedNavigationConfig) {
    for (const item of group.items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findMenuItemRecursive(item.children, path);
        if (found) return found;
      }
    }
  }
  return null;
};

function findMenuItemRecursive(items: MenuItem[], path: string): MenuItem | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findMenuItemRecursive(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Group priority for ordering
export const GROUP_PRIORITY = {
  dashboard: 1,
  users: 2,
  structure: 3,
  school: 4,
  surveys: 5,
  tasks: 6,
  content: 7,
  analytics: 8,
  system: 9
};

export default improvedNavigationConfig;