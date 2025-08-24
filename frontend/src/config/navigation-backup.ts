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
  LucideIcon,
  UserCheck,
  Calendar,
  Calculator,
  UserPlus,
  Briefcase,
  ClipboardCheck
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
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'dashboard-home',
        label: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin', 'müəllim']
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
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
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
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'school-management',
        label: 'Məktəb İdarəetməsi',
        icon: School,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
        children: [
          {
            id: 'student-management',
            label: 'Şagird İdarəetməsi',
            icon: Users,
            roles: ['superadmin', 'schooladmin'],
            children: [
              {
                id: 'school-students',
                label: 'Şagirdlər',
                path: '/school/students',
                roles: ['superadmin', 'schooladmin']
              },
              {
                id: 'student-enrollment',
                label: 'Qeydiyyat',
                path: '/school/students/enrollment',
                roles: ['superadmin', 'schooladmin']
              }
            ]
          },
          {
            id: 'teacher-management',
            label: 'Müəllim İdarəetməsi',
            icon: GraduationCap,
            roles: ['superadmin', 'schooladmin'],
            children: [
              {
                id: 'school-teachers',
                label: 'Müəllimlər',
                path: '/school/teachers',
                roles: ['superadmin', 'schooladmin']
              },
              {
                id: 'teacher-performance',
                label: 'Performans',
                path: '/school/teachers/performance',
                roles: ['superadmin', 'schooladmin']
              }
            ]
          },
          {
            id: 'class-management',
            label: 'Sinif İdarəetməsi',
            icon: Building2,
            roles: ['superadmin', 'schooladmin'],
            children: [
              {
                id: 'school-classes',
                label: 'Siniflər',
                path: '/school/classes',
                roles: ['superadmin', 'schooladmin']
              },
              {
                id: 'class-schedules',
                label: 'Dərs Cədvəlləri',
                path: '/school/classes/schedules',
                roles: ['superadmin', 'schooladmin']
              }
            ]
          },
          {
            id: 'attendance-management',
            label: 'Davamiyyət İdarəetməsi',
            icon: UserCheck,
            roles: ['superadmin', 'regionadmin', 'schooladmin', 'müəllim'],
            children: [
              {
                id: 'attendance-record',
                label: 'Davamiyyət Qeydiyyatı',
                path: '/school/attendance',
                roles: ['superadmin', 'regionadmin', 'schooladmin', 'müəllim']
              },
              {
                id: 'attendance-reports',
                label: 'Davamiyyət Hesabatları',
                path: '/school/attendance/reports',
                roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']
              }
            ]
          },
          {
            id: 'assessment-management',
            label: 'Qiymətləndirmə İdarəetməsi',
            icon: Calculator,
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
            children: [
              {
                id: 'assessment-types',
                label: 'Qiymətləndirmə Növləri',
                path: '/assessments/types',
                roles: ['superadmin', 'regionadmin', 'sektoradmin']
              },
              {
                id: 'assessment-entry',
                label: 'Qiymətləndirmə Daxil Etmə',
                path: '/assessments/entry',
                roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim']
              },
              {
                id: 'assessments',
                label: 'Qiymətləndirmələr',
                path: '/school/assessments',
                roles: ['superadmin', 'schooladmin', 'müəllim']
              },
              {
                id: 'gradebook',
                label: 'Qiymət Dəftəri',
                path: '/school/gradebook',
                roles: ['superadmin', 'schooladmin', 'müəllim']
              },
              {
                id: 'assessment-results',
                label: 'Qiymətləndirmə Nəticələri',
                path: '/assessments/results',
                roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']
              },
              {
                id: 'assessment-reports',
                label: 'Qiymətləndirmə Hesabatları',
                path: '/school/assessments/reports',
                roles: ['superadmin', 'schooladmin']
              }
            ]
          },
          {
            id: 'my-classes',
            label: 'Mənim Siniflərim',
            path: '/school/my-classes',
            roles: ['superadmin', 'müəllim']
          }
        ]
      }
    ]
  },
  {
    id: 'mezmun',
    label: 'Məzmun',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'],
    items: [
      {
        id: 'documents',
        label: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
      },
      {
        id: 'links',
        label: 'Linklər',
        path: '/links',
        icon: Link,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
      },
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
            roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
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
        id: 'school-surveys',
        label: 'Məktəb Sorğuları',
        path: '/school/surveys',
        icon: ClipboardList,
        roles: ['superadmin', 'schooladmin']
      },
      {
        id: 'school-tasks',
        label: 'Tapşırıqlar',
        path: '/school/tasks',
        icon: ClipboardCheck,
        roles: ['superadmin', 'schooladmin']
      }
    ]
  },
  {
    id: 'hesabatlar',
    label: 'Hesabatlar',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        path: '/reports',
        icon: Download,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']
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