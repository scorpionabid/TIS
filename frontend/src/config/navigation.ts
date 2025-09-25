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
  TrendingUp,
  LucideIcon,
} from 'lucide-react';
import { UserRole, USER_ROLES } from '@/constants/roles';

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
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
    items: [
      {
        id: 'dashboard-home',
        label: 'İdarə Paneli',
        path: '/',
        icon: LayoutDashboard,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
      }
    ]
  },

  // 🏢 Sistem İdarəetməsi və Struktur
  {
    id: 'system-structure',
    label: 'Sistem İdarəetməsi',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN],
    items: [
      {
        id: 'users',
        label: 'İstifadəçilər',
        path: '/users',
        icon: Users,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]
      },
      {
        id: 'roles',
        label: 'Rollar və İcazələr',
        path: '/roles',
        icon: Shield,
        roles: [USER_ROLES.SUPERADMIN]
      },
      {
        id: 'departments',
        label: 'Departmentlər',
        path: '/departments',
        icon: Building2,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]
      },
      {
        id: 'regions',
        label: 'Regionlar',
        path: '/regions',
        icon: MapPin,
        roles: [USER_ROLES.SUPERADMIN]
      },
      {
        id: 'sectors',
        label: 'Sektorlar',
        path: '/sectors',
        icon: Target,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
      },
      {
        id: 'institutions',
        label: 'Ümumi Təhsil',
        path: '/institutions',
        icon: School,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]
      },
      {
        id: 'preschools',
        label: 'Məktəbəqədər',
        path: '/preschools',
        icon: Baby,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
      },
      {
        id: 'hierarchy',
        label: 'İerarxiya İdarəsi',
        path: '/hierarchy',
        icon: Database,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
      },
      {
        id: 'subjects',
        label: 'Fənnlər',
        path: '/subjects',
        icon: BookOpen,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
      },
      {
        id: 'academic-year-management',
        label: 'Təhsil İlləri',
        path: '/academic-year-management',
        icon: Calendar,
        roles: [USER_ROLES.SUPERADMIN],
        description: 'Təhsil illərinin idarə edilməsi və tənzimlənməsi'
      }
    ]
  },

  // 🏛️ Sektor İdarəetməsi
  {
    id: 'sector-management',
    label: 'Sektor İdarəetməsi',
    roles: [USER_ROLES.SEKTORADMIN],
    items: [
      {
        id: 'sector-overview',
        label: 'Sektor Ümumi Görünüş',
        path: '/',
        icon: LayoutDashboard,
        roles: [USER_ROLES.SEKTORADMIN],
        description: 'Sektor statistikası və ümumi məlumatlar'
      },
      {
        id: 'sector-schools',
        label: 'Sektor Məktəbləri',
        icon: School,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-schools-list',
            label: 'Məktəb Siyahısı',
            path: '/institutions',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-schools-students',
            label: 'Sektor Şagirdləri',
            path: '/students',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-schools-classes',
            label: 'Sektor Sinifləri',
            path: '/school/classes',
            roles: [USER_ROLES.SEKTORADMIN]
          }
        ]
      },
      {
        id: 'sector-staff',
        label: 'Sektor Kadrları',
        icon: Users,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-users',
            label: 'Sektor İstifadəçiləri',
            path: '/users',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-teachers',
            label: 'Sektor Müəllimləri',
            path: '/school/teachers',
            roles: [USER_ROLES.SEKTORADMIN]
          }
        ]
      },
      {
        id: 'sector-schedules',
        label: 'Sektor Cədvəlləri',
        icon: Calendar,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-schedule-overview',
            label: 'Cədvəl Ümumi Görünüş',
            path: '/school/schedules',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-teacher-schedules',
            label: 'Müəllim Cədvəlləri',
            path: '/school/schedule-management',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-workload',
            label: 'İş Yükü Analizi',
            path: '/school/workload',
            roles: [USER_ROLES.SEKTORADMIN]
          }
        ]
      },
      {
        id: 'sector-attendance',
        label: 'Sektor Davamiyyəti',
        icon: UserCheck,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-attendance-reports',
            label: 'Davamiyyət Hesabatları',
            path: '/school/attendance/reports',
            roles: [USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'sector-attendance-daily',
            label: 'Günlük Davamiyyət',
            path: '/school/attendance',
            roles: [USER_ROLES.SEKTORADMIN]
          }
        ]
      },
      {
        id: 'sector-assessments',
        label: 'Sektor Qiymətləndirməsi',
        icon: Calculator,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-assessment-reports',
            label: 'Qiymətləndirmə Hesabatları',
            path: '/assessments/results',
            roles: [USER_ROLES.SEKTORADMIN]
          }
        ]
      }
    ]
  },

  // 🎓 Məktəb İdarəetməsi (Sadələşdirilmiş)
  {
    id: 'school-management',
    label: 'Məktəb İdarəsi',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
    items: [
      {
        id: 'my-classes',
        label: 'Mənim Siniflərim',
        path: '/teacher/my-classes',
        icon: School,
        roles: [USER_ROLES.MUELLIM],
        description: 'Müəllimin təyin edildiyi siniflər'
      },
      {
        id: 'students',
        label: 'Şagirdlər',
        icon: Users,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN],
        children: [
          {
            id: 'school-students',
            label: 'Şagird Siyahısı',
            path: '/students',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          },
          {
            id: 'student-enrollment',
            label: 'Yeni Qeydiyyat',
            path: '/students',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          }
        ]
      },
      {
        id: 'teachers',
        label: 'Müəllimlər',
        icon: GraduationCap,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN],
        children: [
          {
            id: 'school-teachers',
            label: 'Müəllim Siyahısı',
            path: '/school/teachers',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          },
        ]
      },
      {
        id: 'classes',
        label: 'Siniflər',
        icon: Building2,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN],
        children: [
          {
            id: 'school-classes',
            label: 'Sinif Siyahısı',
            path: '/school/classes',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          },
        ]
      },
    ]
  },

  // 📊 Qiymətləndirmə və Davamiyyət
  {
    id: 'academic-tracking',
    label: 'Akademik İzləmə',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
    items: [
      {
        id: 'attendance',
        label: 'Davamiyyət',
        icon: UserCheck,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
        children: [
          {
            id: 'attendance-record',
            label: 'Davamiyyət Qeydiyyatı',
            path: '/school/attendance',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
          },
          {
            id: 'attendance-bulk',
            label: 'Toplu Davamiyyət Qeydiyyatı',
            path: '/school/attendance/bulk',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SCHOOLADMIN],
            description: 'Siniflərdə toplu şəkildə davamiyyət qeyd edin'
          },
          {
            id: 'attendance-reports',
            label: 'Davamiyyət Hesabatları',
            path: '/school/attendance/reports',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
          }
        ]
      },
      {
        id: 'assessments',
        label: 'Qiymətləndirmə',
        icon: Calculator,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
        children: [
          {
            id: 'school-assessments-hub',
            label: 'Məktəb Qiymətləndirmə Hub-ı',
            path: '/school/assessments',
            icon: TrendingUp,
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
            description: 'Vahid qiymətləndirmə sistemi - KSQ, BSQ və adi qiymətləndirmələr'
          },
          {
            id: 'assessment-types',
            label: 'Qiymətləndirmə Növləri',
            path: '/assessments/types',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
          },
          {
            id: 'assessment-entry',
            label: 'Qiymət Daxil Etmə',
            path: '/assessments/entry',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
          },
          {
            id: 'gradebook',
            label: 'Qiymət Dəftəri',
            path: '/school/gradebook',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
          },
          {
            id: 'assessment-results',
            label: 'Nəticələr və Analiz',
            path: '/assessments/results',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
          }
        ]
      }
    ]
  },

  // 📅 Cədvəl İdarəetməsi
  {
    id: 'schedule-management',
    label: 'Cədvəl İdarəetməsi',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
    items: [
      {
        id: 'schedule-overview',
        label: 'Dərs Cədvəlləri',
        icon: Calendar,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
        children: [
          {
            id: 'school-schedule-management',
            label: 'Məktəb Cədvəl İdarəetməsi',
            path: '/school/schedule-management',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          },
          {
            id: 'school-schedules',
            label: 'Məktəb Cədvəlləri',
            path: '/school/schedules',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          },
          {
            id: 'regional-schedules',
            label: 'Regional Cədvəl Nəzarəti',
            path: '/regionadmin/schedules',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
          },
          {
            id: 'teacher-schedule',
            label: 'Müəllim Cədvəli',
            path: '/teacher/schedule',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.MUELLIM]
          },
          {
            id: 'school-workload',
            label: 'Dərs Yükü',
            path: '/school/workload',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
          }
        ]
      }
    ]
  },

  // 📁 Məzmun İdarəetməsi
  {
    id: 'content',
    label: 'Məzmun İdarəetməsi',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN],
    items: [
      {
        id: 'tasks',
        label: 'Tapşırıqlar',
        path: '/tasks',
        icon: ClipboardCheck,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
      },
      {
        id: 'school-tasks',
        label: 'Məktəb Tapşırıqları',
        path: '/school/tasks',
        icon: CheckSquare,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.SCHOOLADMIN]
      },
      {
        id: 'surveys',
        label: 'Sorğular',
        icon: ClipboardList,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'survey-list',
            label: 'Sorğu Siyahısı',
            path: '/surveys',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN]
          },
          {
            id: 'approvals',
            label: 'Təsdiq Paneli',
            path: '/approvals',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]
          },
        ]
      },
      {
        id: 'my-surveys',
        label: 'Mənim Sorğularım',
        icon: ClipboardList,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
        children: [
          {
            id: 'pending-surveys',
            label: 'Gözləyən Sorğular',
            path: '/my-surveys/pending',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
          },
          {
            id: 'my-responses',
            label: 'Mənim Cavablarım',
            path: '/my-surveys/responses',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM]
          }
        ]
      },
      {
        id: 'documents',
        label: 'Sənədlər',
        path: '/documents',
        icon: FileText,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
      },
      {
        id: 'links',
        label: 'Faydalı Linklər',
        path: '/links',
        icon: Link,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
      }
    ]
  },

  // 📈 Hesabat və Analitika
  {
    id: 'analytics',
    label: 'Hesabat və Analitika',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN],
    items: [
      {
        id: 'reports',
        label: 'Hesabatlar',
        path: '/reports',
        icon: FileText,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN]
      },
      {
        id: 'analytics',
        label: 'Sistem Analitikası',
        path: '/analytics',
        icon: BarChart3,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN, USER_ROLES.SEKTORADMIN]
      }
    ]
  },

  // 🔔 Bildirişlər
  {
    id: 'notifications',
    label: 'Bildirişlər',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN],
    items: [
      {
        id: 'notifications',
        label: 'Bildirişlər',
        path: '/notifications',
        icon: Bell,
        roles: [USER_ROLES.SUPERADMIN, USER_ROLES.REGIONADMIN]
      }
    ]
  },

  // ⚙️ Sistem Tənzimləmələri
  {
    id: 'system-settings',
    label: 'Sistem Tənzimləmələri',
    roles: [USER_ROLES.SUPERADMIN],
    items: [
      {
        id: 'settings',
        label: 'Sistem Parametrləri',
        path: '/settings',
        icon: Settings,
        roles: [USER_ROLES.SUPERADMIN]
      },
      {
        id: 'audit-logs',
        label: 'Audit Logları',
        path: '/audit-logs',
        icon: Clipboard,
        roles: [USER_ROLES.SUPERADMIN]
      },
      {
        id: 'performance',
        label: 'Performans Monitorinqi',
        path: '/performance',
        icon: Monitor,
        roles: [USER_ROLES.SUPERADMIN]
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