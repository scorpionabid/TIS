import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  MapPin,
  Building2,
  School,
  ClipboardList,
  BarChart3,
  Archive,
  CheckSquare,
  BookOpen,
  Link,
  TreePine,
  Bell,
  Database,
  Monitor,
  Settings,
  Clipboard,
  Baby,
  GraduationCap,
  Download,
  Award,
  Target,
  PlusCircle,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext';

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  roles?: UserRole[];
  description?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
  roles?: UserRole[];
}

// Universal navigation config for all roles
export const universalNavigationConfig: MenuGroup[] = [
  {
    id: 'dashboard',
    label: 'Ana Səhifə',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'dashboard-home',
        label: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim']
      }
    ]
  },
  {
    id: 'users-management',
    label: 'İstifadəçi İdarəetməsi',
    roles: ['superadmin', 'regionadmin'],
    items: [
      {
        id: 'notifications',
        label: 'Bildirişlər',
        path: '/notifications',
        icon: Bell,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'users',
        label: 'İstifadəçilər',
        path: '/users',
        icon: Users,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'roles',
        label: 'Rollar',
        path: '/roles',
        icon: Shield,
        roles: ['superadmin']
      },
      {
        id: 'tasks',
        label: 'Tapşırıqlar',
        path: '/tasks',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      }
    ]
  },
  {
    id: 'struktur',
    label: 'Struktur',
    roles: ['superadmin', 'regionadmin', 'sektoradmin'],
    items: [
      {
        id: 'departments',
        label: 'Departmentlər',
        path: '/departments',
        icon: Building2,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'institutions',
        label: 'Müəssisələr',
        path: '/institutions',
        icon: School,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'preschools',
        label: 'Məktəbəqədər müəssisələr',
        path: '/preschools',
        icon: Baby,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'regions',
        label: 'Regionlar',
        path: '/regions',
        icon: MapPin,
        roles: ['superadmin']
      },
      {
        id: 'sectors',
        label: 'Sektorlar',
        path: '/sectors',
        icon: Users,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'hierarchy',
        label: 'İerarxiya İdarəetməsi',
        path: '/hierarchy',
        icon: Database,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },
  {
    id: 'sorqular',
    label: 'Sorğular',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'survey-management',
        label: 'Sorğu İdarəetməsi',
        icon: ClipboardList,
        roles: ['superadmin', 'regionadmin'],
        children: [
          {
            id: 'surveys',
            label: 'Sorğular',
            path: '/surveys',
            roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
          },
          {
            id: 'survey-approval',
            label: 'Təsdiq',
            path: '/survey-approval',
            roles: ['superadmin', 'regionadmin']
          },
          {
            id: 'survey-results',
            label: 'Sorğu nəticələri',
            path: '/survey-results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
          },
          {
            id: 'survey-archive',
            label: 'Arxiv',
            path: '/survey-archive',
            roles: ['superadmin', 'regionadmin']
          }
        ]
      },
      {
        id: 'school-management',
        label: 'Məktəb İdarəetməsi',
        icon: GraduationCap,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'school-workload',
            label: 'Dərs Yükü',
            path: '/school/workload',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'school-schedules',
            label: 'Dərs Cədvəli',
            path: '/school/schedules',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'school-attendance',
            label: 'Davamiyyət',
            path: '/school/attendance',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'assessment-types',
            label: 'Qiymətləndirmə Növləri',
            path: '/assessments/types',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
          },
          {
            id: 'assessment-results',
            label: 'Qiymətləndirmə Nəticələri',
            path: '/assessments/results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
          },
          {
            id: 'assessment-entry',
            label: 'Qiymətləndirmə Daxil Etmə',
            path: '/assessments/entry',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'gradebook',
            label: 'Qiymət Dəftəri',
            path: '/school/gradebook',
            roles: ['müəllim', 'məktəbadmin']
          },
          {
            id: 'my-classes',
            label: 'Mənim Siniflərim',
            path: '/school/my-classes',
            roles: ['müəllim']
          }
        ]
      }
    ]
  },
  {
    id: 'mezmun',
    label: 'Məzmun',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'documents',
        label: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'links',
        label: 'Linklər',
        path: '/links',
        icon: Link,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      }
    ]
  },
  {
    id: 'hesabatlar',
    label: 'Hesabatlar',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        path: '/reports',
        icon: Download,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'analytics',
        label: 'Sistem Statistikası',
        path: '/analytics',
        icon: BarChart3,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      }
    ]
  },
  {
    id: 'sistem',
    label: 'Sistem',
    roles: ['superadmin'],
    items: [
      {
        id: 'settings',
        label: 'Sistem Parametrləri',
        path: '/settings',
        icon: Settings,
        roles: ['superadmin']
      },
      {
        id: 'audit-logs',
        label: 'Audit Logları',
        path: '/audit-logs',
        icon: Clipboard,
        roles: ['superadmin']
      },
      {
        id: 'performance',
        label: 'Performans Monitorinqi',
        path: '/performance',
        icon: Monitor,
        roles: ['superadmin']
      }
    ]
  }
];

export const getMenuForRole = (role: UserRole): MenuGroup[] => {
  return universalNavigationConfig
    .filter(group => !group.roles || group.roles.includes(role))
    .map(group => ({
      ...group,
      items: filterMenuItems(group.items, role)
    }))
    .filter(group => group.items.length > 0);
};

// Helper function to recursively filter menu items based on role
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
  for (const group of universalNavigationConfig) {
    for (const item of group.items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = item.children.find(child => child.path === path);
        if (found) return found;
      }
    }
  }
  return null;
};