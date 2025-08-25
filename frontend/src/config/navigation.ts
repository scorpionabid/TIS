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
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'dashboard-home',
        label: 'İdarə Paneli',
        path: '/',
        icon: LayoutDashboard,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin', 'müəllim']
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
        roles: ['superadmin', 'regionadmin', 'sektoradmin']
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

  // 🏛️ Sektor İdarəetməsi
  {
    id: 'sector-management',
    label: 'Sektor İdarəetməsi',
    roles: ['sektoradmin'],
    items: [
      {
        id: 'sector-overview',
        label: 'Sektor Ümumi Görünüş',
        path: '/',
        icon: LayoutDashboard,
        roles: ['sektoradmin'],
        description: 'Sektor statistikası və ümumi məlumatlar'
      },
      {
        id: 'sector-schools',
        label: 'Sektor Məktəbləri',
        icon: School,
        roles: ['sektoradmin'],
        children: [
          {
            id: 'sector-schools-list',
            label: 'Məktəb Siyahısı',
            path: '/institutions',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-schools-students',
            label: 'Sektor Şagirdləri',
            path: '/students',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-schools-classes',
            label: 'Sektor Sinifləri',
            path: '/school/classes',
            roles: ['sektoradmin']
          }
        ]
      },
      {
        id: 'sector-staff',
        label: 'Sektor Kadrları',
        icon: Users,
        roles: ['sektoradmin'],
        children: [
          {
            id: 'sector-users',
            label: 'Sektor İstifadəçiləri',
            path: '/users',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-teachers',
            label: 'Sektor Müəllimləri',
            path: '/school/teachers',
            roles: ['sektoradmin']
          }
        ]
      },
      {
        id: 'sector-schedules',
        label: 'Sektor Cədvəlləri',
        icon: Calendar,
        roles: ['sektoradmin'],
        children: [
          {
            id: 'sector-schedule-overview',
            label: 'Cədvəl Ümumi Görünüş',
            path: '/school/schedules',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-teacher-schedules',
            label: 'Müəllim Cədvəlləri',
            path: '/school/schedule-management',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-workload',
            label: 'İş Yükü Analizi',
            path: '/school/workload',
            roles: ['sektoradmin']
          }
        ]
      },
      {
        id: 'sector-attendance',
        label: 'Sektor Davamiyyəti',
        icon: UserCheck,
        roles: ['sektoradmin'],
        children: [
          {
            id: 'sector-attendance-reports',
            label: 'Davamiyyət Hesabatları',
            path: '/school/attendance/reports',
            roles: ['sektoradmin']
          },
          {
            id: 'sector-attendance-daily',
            label: 'Günlük Davamiyyət',
            path: '/school/attendance',
            roles: ['sektoradmin']
          }
        ]
      },
      {
        id: 'sector-assessments',
        label: 'Sektor Qiymətləndirməsi',
        icon: Calculator,
        roles: ['sektoradmin'],
        children: [
          {
            id: 'sector-assessment-reports',
            label: 'Qiymətləndirmə Hesabatları',
            path: '/assessments/results',
            roles: ['sektoradmin']
          }
        ]
      }
    ]
  },

  // 🎓 Məktəb İdarəetməsi (Sadələşdirilmiş)
  {
    id: 'school-management',
    label: 'Məktəb İdarəsi',
    roles: ['superadmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'students',
        label: 'Şagirdlər',
        icon: Users,
        roles: ['superadmin', 'schooladmin'],
        children: [
          {
            id: 'school-students',
            label: 'Şagird Siyahısı',
            path: '/students',
            roles: ['superadmin', 'schooladmin']
          },
          {
            id: 'student-enrollment',
            label: 'Yeni Qeydiyyat',
            path: '/students',
            roles: ['superadmin', 'schooladmin']
          }
        ]
      },
      {
        id: 'teachers',
        label: 'Müəllimlər',
        icon: GraduationCap,
        roles: ['superadmin', 'schooladmin'],
        children: [
          {
            id: 'school-teachers',
            label: 'Müəllim Siyahısı',
            path: '/school/teachers',
            roles: ['superadmin', 'schooladmin']
          },
          {
            id: 'teacher-performance',
            label: 'Performans Qiymətləndirməsi',
            path: '/school/teachers/performance',
            roles: ['superadmin', 'schooladmin']
          }
        ]
      },
      {
        id: 'classes',
        label: 'Siniflər',
        icon: Building2,
        roles: ['superadmin', 'schooladmin'],
        children: [
          {
            id: 'school-classes',
            label: 'Sinif Siyahısı',
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
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'attendance',
        label: 'Davamiyyət',
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
        id: 'assessments',
        label: 'Qiymətləndirmə',
        icon: Calculator,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
        children: [
          {
            id: 'assessment-types',
            label: 'Qiymətləndirmə Növləri',
            path: '/assessments/types',
            roles: ['superadmin', 'regionadmin']
          },
          {
            id: 'assessment-entry',
            label: 'Qiymət Daxil Etmə',
            path: '/assessments/entry',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim']
          },
          {
            id: 'gradebook',
            label: 'Qiymət Dəftəri',
            path: '/school/gradebook',
            roles: ['superadmin', 'schooladmin', 'müəllim']
          },
          {
            id: 'assessment-results',
            label: 'Nəticələr və Analiз',
            path: '/assessments/results',
            roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']
          }
        ]
      }
    ]
  },

  // 📅 Cədvəl İdarəetməsi
  {
    id: 'schedule-management',
    label: 'Cədvəl İdarəetməsi',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
    items: [
      {
        id: 'schedule-overview',
        label: 'Dərs Cədvəlləri',
        icon: Calendar,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'],
        children: [
          {
            id: 'school-schedule-management',
            label: 'Məktəb Cədvəl İdarəetməsi',
            path: '/school/schedule-management',
            roles: ['superadmin', 'schooladmin']
          },
          {
            id: 'school-schedules',
            label: 'Məktəb Cədvəlləri',
            path: '/school/schedules',
            roles: ['superadmin', 'schooladmin']
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
            roles: ['superadmin', 'schooladmin']
          }
        ]
      }
    ]
  },

  // 📁 Məzmun İdarəetməsi
  {
    id: 'content',
    label: 'Məzmun İdarəetməsi',
    roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'],
    items: [
      {
        id: 'tasks',
        label: 'Tapşırıqlar',
        path: '/tasks',
        icon: ClipboardCheck,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
      },
      {
        id: 'school-tasks',
        label: 'Məktəb Tapşırıqları',
        path: '/school/tasks',
        icon: CheckSquare,
        roles: ['superadmin', 'schooladmin']
      },
      {
        id: 'surveys',
        label: 'Sorğular',
        icon: ClipboardList,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin'],
        children: [
          {
            id: 'survey-list',
            label: 'Sorğu Siyahısı',
            path: '/surveys',
            roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
          },
          {
            id: 'approvals',
            label: 'Təsdiq Paneli',
            path: '/approvals',
            roles: ['superadmin', 'regionadmin', 'sektoradmin']
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
            roles: ['superadmin', 'schooladmin']
          }
        ]
      },
      {
        id: 'documents',
        label: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
      },
      {
        id: 'links',
        label: 'Faydalı Linklər',
        path: '/links',
        icon: Link,
        roles: ['superadmin', 'regionadmin', 'regionoperator', 'sektoradmin', 'schooladmin']
      }
    ]
  },

  // 📈 Hesabat və Analitika
  {
    id: 'analytics',
    label: 'Hesabat və Analitika',
    roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        path: '/reports',
        icon: FileText,
        roles: ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin']
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