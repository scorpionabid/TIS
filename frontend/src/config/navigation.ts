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
  CheckSquare,
  BookOpen,
  Link,
  Bell,
  Database,
  Monitor,
  Settings,
  Clipboard,
  Baby,
  GraduationCap,
  UserCheck,
  Calculator,
  Briefcase,
  ClipboardCheck,
  Target,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  LucideIcon,
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

// Improved navigation structure - cleaner and more logical
export const improvedNavigationConfig: MenuGroup[] = [
  // 🏠 Ana Səhifə
  {
    id: 'dashboard',
    label: 'Ana Səhifə',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'dashboard-home',
        label: 'İdarə Paneli',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin', 'müəllim']
      }
    ]
  },

  // 🏢 Sistem İdarəetməsi və Struktur
  {
    id: 'system-structure',
    label: 'Sistem İdarəetməsi',
    roles: ['superadmin', 'regionadmin', 'sektoradmin'],
    items: [
      {
        id: 'users',
        label: 'İstifadəçilər',
        path: '/users',
        icon: Users,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'roles',
        label: 'Rollar və İcazələr',
        path: '/roles',
        icon: Shield,
        roles: ['superadmin']
      },
      {
        id: 'departments',
        label: 'Departmentlər',
        path: '/departments',
        icon: Building2,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
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
        icon: Target,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'institutions',
        label: 'Ümumi Təhsil',
        path: '/institutions',
        icon: School,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      },
      {
        id: 'preschools',
        label: 'Məktəbəqədər',
        path: '/preschools',
        icon: Baby,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'hierarchy',
        label: 'İerarxiya İdarəsi',
        path: '/hierarchy',
        icon: Database,
        roles: ['superadmin', 'regionadmin']
      },
      {
        id: 'subjects',
        label: 'Fənnlər',
        path: '/subjects',
        icon: BookOpen,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // 🎓 Məktəb İdarəetməsi (Sadələşdirilmiş)
  {
    id: 'school-management',
    label: 'Məktəb İdarəsi',
    roles: ['superadmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'students',
        label: 'Şagirdlər',
        icon: Users,
        roles: ['superadmin', 'məktəbadmin'],
        children: [
          {
            id: 'school-students',
            label: 'Şagird Siyahısı',
            path: '/school/students',
            roles: ['superadmin', 'məktəbadmin']
          },
          {
            id: 'student-enrollment',
            label: 'Yeni Qeydiyyat',
            path: '/school/students/enrollment',
            roles: ['superadmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'teachers',
        label: 'Müəllimlər',
        icon: GraduationCap,
        roles: ['superadmin', 'məktəbadmin'],
        children: [
          {
            id: 'school-teachers',
            label: 'Müəllim Siyahısı',
            path: '/school/teachers',
            roles: ['superadmin', 'məktəbadmin']
          },
          {
            id: 'teacher-performance',
            label: 'Performans Qiymətləndirməsi',
            path: '/school/teachers/performance',
            roles: ['superadmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'classes',
        label: 'Siniflər',
        icon: Building2,
        roles: ['superadmin', 'məktəbadmin'],
        children: [
          {
            id: 'school-classes',
            label: 'Sinif Siyahısı',
            path: '/school/classes',
            roles: ['superadmin', 'məktəbadmin']
          },
          {
            id: 'class-schedules',
            label: 'Dərs Cədvəlləri',
            path: '/school/classes/schedules',
            roles: ['superadmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'my-classes',
        label: 'Mənim Siniflərim',
        path: '/school/my-classes',
        icon: BookOpen,
        roles: ['müəllim']
      }
    ]
  },

  // 📊 Qiymətləndirmə və Davamiyyət
  {
    id: 'academic-tracking',
    label: 'Akademik İzləmə',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'attendance',
        label: 'Davamiyyət',
        icon: UserCheck,
        roles: ['superadmin', 'regionadmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'attendance-record',
            label: 'Davamiyyət Qeydiyyatı',
            path: '/school/attendance',
            roles: ['superadmin', 'regionadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'attendance-reports',
            label: 'Davamiyyət Hesabatları',
            path: '/school/attendance/reports',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'assessments',
        label: 'Qiymətləndirmə',
        icon: Calculator,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'assessment-types',
            label: 'Qiymətləndirmə Növləri',
            path: '/assessments/types',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
          },
          {
            id: 'assessment-entry',
            label: 'Qiymət Daxil Etmə',
            path: '/assessments/entry',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'gradebook',
            label: 'Qiymət Dəftəri',
            path: '/school/gradebook',
            roles: ['superadmin', 'məktəbadmin', 'müəllim']
          },
          {
            id: 'assessment-results',
            label: 'Nəticələr və Analiз',
            path: '/assessments/results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
          }
        ]
      }
    ]
  },

  // 📅 Cədvəl İdarəetməsi
  {
    id: 'schedule-management',
    label: 'Cədvəl İdarəetməsi',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
    items: [
      {
        id: 'schedule-overview',
        label: 'Dərs Cədvəlləri',
        icon: Calendar,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin', 'müəllim'],
        children: [
          {
            id: 'school-schedule-management',
            label: 'Məktəb Cədvəl İdarəetməsi',
            path: '/school/schedule-management',
            roles: ['superadmin', 'məktəbadmin']
          },
          {
            id: 'school-schedules',
            label: 'Məktəb Cədvəlləri',
            path: '/school/schedules',
            roles: ['superadmin', 'məktəbadmin']
          },
          {
            id: 'regional-schedules',
            label: 'Regional Cədvəl Nəzarəti',
            path: '/regionadmin/schedules',
            roles: ['superadmin', 'regionadmin']
          },
          {
            id: 'teacher-schedule',
            label: 'Müəllim Cədvəli',
            path: '/teacher/schedule',
            roles: ['superadmin', 'müəllim']
          },
          {
            id: 'school-workload',
            label: 'Dərs Yükü',
            path: '/school/workload',
            roles: ['superadmin', 'məktəbadmin']
          }
        ]
      }
    ]
  },

  // 📁 Məzmun İdarəetməsi
  {
    id: 'content',
    label: 'Məzmun İdarəetməsi',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'tasks',
        label: 'Tapşırıqlar',
        path: '/tasks',
        icon: ClipboardCheck,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'school-tasks',
        label: 'Məktəb Tapşırıqları',
        path: '/school/tasks',
        icon: CheckSquare,
        roles: ['superadmin', 'məktəbadmin']
      },
      {
        id: 'surveys',
        label: 'Sorğular',
        icon: ClipboardList,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin'],
        children: [
          {
            id: 'survey-list',
            label: 'Sorğu Siyahısı',
            path: '/surveys',
            roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
          },
          {
            id: 'approvals',
            label: 'Təsdiq Paneli',
            path: '/approvals',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
          },
          {
            id: 'survey-results',
            label: 'Sorğu Nəticələri',
            path: '/survey-results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
          },
          {
            id: 'school-surveys',
            label: 'Məktəb Sorğuları',
            path: '/school/surveys',
            roles: ['superadmin', 'məktəbadmin']
          }
        ]
      },
      {
        id: 'documents',
        label: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'links',
        label: 'Faydalı Linklər',
        path: '/links',
        icon: Link,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'məktəbadmin']
      }
    ]
  },

  // 📈 Hesabat və Analitika
  {
    id: 'analytics',
    label: 'Hesabat və Analitika',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin'],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        path: '/reports',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'məktəbadmin']
      },
      {
        id: 'analytics',
        label: 'Sistem Analitikası',
        path: '/analytics',
        icon: BarChart3,
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
      }
    ]
  },

  // 🔔 Bildirişlər
  {
    id: 'notifications',
    label: 'Bildirişlər',
    roles: ['superadmin', 'regionadmin'],
    items: [
      {
        id: 'notifications',
        label: 'Bildirişlər',
        path: '/notifications',
        icon: Bell,
        roles: ['superadmin', 'regionadmin']
      }
    ]
  },

  // ⚙️ Sistem Tənzimləmələri
  {
    id: 'system-settings',
    label: 'Sistem Tənzimləmələri',
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

// Main navigation config export
export const universalNavigationConfig = improvedNavigationConfig;

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
        const found = findChildMenuItem(item.children, path);
        if (found) return found;
      }
    }
  }
  return null;
};

function findChildMenuItem(items: MenuItem[], path: string): MenuItem | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findChildMenuItem(item.children, path);
      if (found) return found;
    }
  }
  return null;
}