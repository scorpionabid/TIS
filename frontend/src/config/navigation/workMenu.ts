import {
  LayoutDashboard,
  Users,
  School,
  ClipboardList,
  BarChart3,
  BookOpen,
  Link,
  FileText,
  Building2,
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
  Archive,
  Folder,
  Library,
  Star,
  Table2,
} from 'lucide-react';
import { USER_ROLES } from '@/constants/roles';
import {
  ALL_ADMINS,
  ALL_USERS,
  REGION_AND_ABOVE,
  REGION_ROLES,
  REGION_ADMIN_ROLES,
  SCHOOL_ADMIN_ROLES,
} from './roleSets';
import { MenuGroup } from './types';

export const workMenuGroups: MenuGroup[] = [
  // ─── Ana Səhifə ───────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Ana Səhifə',
    panel: 'work',
    roles: ALL_ADMINS,
    items: [
      {
        id: 'dashboard-home',
        label: 'İdarə Paneli',
        path: '/',
        icon: LayoutDashboard,
        roles: ALL_ADMINS,
      },
    ],
  },

  // ─── Akademik İzləmə ──────────────────────────────────────────────────────
  {
    id: 'academic-tracking',
    label: 'Akademik İzləmə',
    panel: 'work',
    roles: ALL_ADMINS,
    items: [
      {
        id: 'attendance',
        label: 'Davamiyyət',
        icon: UserCheck,
        path: '/attendance',
        badgeKey: 'attendance',
        roles: ALL_ADMINS,
      },
      {
        id: 'assessments',
        label: 'Qiymətləndirmə',
        icon: Calculator,
        path: '/grade-books',
        roles: ALL_USERS,
      },
    ],
  },

  // ─── Tədris Planı ─────────────────────────────────────────────────────────
  {
    id: 'curriculum-management',
    label: 'Tədris Planı',
    panel: 'work',
    roles: ALL_ADMINS,
    items: [
      {
        id: 'curriculum-dashboard',
        label: 'Dərs yükü və Vakansiya',
        path: '/curriculum/dashboard',
        icon: LayoutDashboard,
        roles: [
          USER_ROLES.SUPERADMIN,
          USER_ROLES.REGIONADMIN,
          USER_ROLES.SEKTORADMIN,
          USER_ROLES.REGIONOPERATOR,
        ],
        description: 'Dərs yükü və vakansiya saatlarının monitorinqi',
      },
      {
        id: 'school-curriculum-plan',
        label: 'Dərs yükü və Vakansiya',
        path: '/school/curriculum-plan',
        icon: LayoutDashboard,
        roles: SCHOOL_ADMIN_ROLES,
        description: 'Siniflər üzrə tədris saatlarının planı',
      },
    ],
  },

  // ─── Məzmun İdarəetməsi ───────────────────────────────────────────────────
  {
    id: 'content',
    label: 'Məzmun İdarəetməsi',
    panel: 'work',
    roles: ALL_ADMINS,
    items: [
      {
        id: 'tasks',
        label: 'Tapşırıqlar',
        path: '/tasks',
        icon: ClipboardCheck,
        badgeKey: 'tasks',
        roles: ALL_ADMINS,
      },
      {
        id: 'projects',
        label: 'Layihələr',
        path: '/projects',
        icon: Briefcase,
        roles: ALL_USERS,
      },
      {
        id: 'report-tables',
        label: 'Cədvəllər',
        icon: Table2,
        path: '/report-tables',
        badgeKey: 'report_tables',
        roles: REGION_AND_ABOVE,
        permissions: ['report_tables.read'],
      },
      {
        id: 'report-table-entry',
        label: 'Cədvəllər',
        icon: Table2,
        path: '/report-table-entry',
        badgeKey: 'report_tables',
        roles: [USER_ROLES.SCHOOLADMIN],
        permissions: ['report_table_responses.write'],
      },
      {
        id: 'resources',
        label: 'Resurslar',
        icon: Archive,
        roles: REGION_AND_ABOVE,
        children: [
          {
            id: 'link-database',
            label: 'Link Bazası',
            path: '/link-database',
            icon: Library,
            roles: REGION_ROLES,
            description: 'Departament və sektor üzrə linklər',
            permissions: ['links.read'],
          },
          {
            id: 'links',
            label: 'Linklər',
            path: '/links',
            icon: Link,
            roles: REGION_AND_ABOVE,
            description: 'Linklərin paylaşılması',
          },
          {
            id: 'documents',
            label: 'Sənədlər',
            path: '/documents',
            icon: FileText,
            badgeKey: 'documents',
            roles: REGION_AND_ABOVE,
            description: 'Sənədlərin paylaşılması',
          },
          {
            id: 'folders',
            label: 'Folderlər',
            path: '/folders',
            icon: Folder,
            badgeKey: 'documents',
            roles: REGION_AND_ABOVE,
            description: 'Folderlərin paylaşılması',
          },
        ],
      },
      {
        id: 'my-resources',
        label: 'Mənim Resurslarım',
        path: '/my-resources',
        icon: Folder,
        badgeKey: 'documents',
        roles: [USER_ROLES.SEKTORADMIN, USER_ROLES.SCHOOLADMIN, USER_ROLES.MUELLIM],
        description: 'Sizə təyin edilmiş resurslar və paylaşılan folderlər',
      },
      {
        id: 'surveys',
        label: 'Sorğular',
        icon: ClipboardList,
        roles: REGION_AND_ABOVE,
        children: [
          {
            id: 'survey-list',
            label: 'Sorğu Siyahısı',
            path: '/surveys',
            badgeKey: 'surveys',
            roles: REGION_AND_ABOVE,
          },
          {
            id: 'approvals',
            label: 'Təsdiq Paneli',
            path: '/approvals',
            badgeKey: 'surveys',
            roles: REGION_AND_ABOVE,
            permissions: ['approvals.read', 'survey_responses.read'],
          },
        ],
      },
      {
        id: 'my-surveys',
        label: 'Mənim Sorğularım',
        icon: ClipboardList,
        roles: ALL_USERS,
        children: [
          {
            id: 'pending-surveys',
            label: 'Gözləyən Sorğular',
            path: '/my-surveys/pending',
            badgeKey: 'surveys',
            roles: ALL_USERS,
          },
          {
            id: 'my-responses',
            label: 'Mənim Cavablarım',
            path: '/my-surveys/responses',
            roles: ALL_USERS,
          },
        ],
      },
    ],
  },

  // ─── Təhsil Reytingi ──────────────────────────────────────────────────────
  {
    id: 'education-rating',
    label: 'Təhsil Reytingi',
    panel: 'work',
    roles: ALL_ADMINS,
    items: [
      {
        id: 'education-rating-main',
        label: 'Reytinq Paneli',
        path: '/education-rating',
        icon: Star,
        roles: ALL_ADMINS,
        description: 'Təhsil işçilərinin performans qiymətləndirməsi',
        permissions: ['ratings.read'],
      },
      {
        id: 'teacher-verification',
        label: 'Müəllim Təsdiqi',
        path: '/teacher-verification',
        icon: CheckCircle,
        roles: REGION_AND_ABOVE,
        description: 'Müəllim məlumatlarının təsdiqi və yoxlanması',
      },
      {
        id: 'rating-configuration',
        label: 'Reytinq Konfiqurasiyası',
        path: '/rating-configuration',
        icon: Award,
        roles: [USER_ROLES.SUPERADMIN],
        description: 'Reytinq sistem konfiqurasiyaları',
        permissions: ['rating-configs.manage'],
      },
    ],
  },

  // ─── Cədvəl İdarəetməsi ───────────────────────────────────────────────────
  {
    id: 'schedule-management',
    label: 'Cədvəl İdarəetməsi',
    panel: 'work',
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.SCHOOLADMIN,
      USER_ROLES.MUELLIM,
    ],
    items: [
      {
        id: 'schedule-overview',
        label: 'Dərs Cədvəlləri',
        icon: Calendar,
        roles: [
          USER_ROLES.SUPERADMIN,
          USER_ROLES.REGIONADMIN,
          USER_ROLES.SEKTORADMIN,
          USER_ROLES.SCHOOLADMIN,
          USER_ROLES.MUELLIM,
        ],
        children: [
          {
            id: 'school-schedule-management',
            label: 'Məktəb Cədvəl İdarəetməsi',
            path: '/school/schedule-management',
            roles: SCHOOL_ADMIN_ROLES,
          },
          {
            id: 'mgmt-teacher-schedule',
            label: 'Müəllim Cədvəli',
            path: '/teacher/schedule',
            roles: [USER_ROLES.SUPERADMIN, USER_ROLES.MUELLIM],
          },
          {
            id: 'school-schedules',
            label: 'Məktəb Cədvəlləri',
            path: '/school/schedules',
            roles: SCHOOL_ADMIN_ROLES,
          },
          {
            id: 'regional-schedules',
            label: 'Regional Cədvəl Nəzarəti',
            path: '/regionadmin/schedules',
            roles: REGION_ADMIN_ROLES,
          },
          {
            id: 'school-workload',
            label: 'Dərs Yükü',
            path: '/school/workload',
            roles: SCHOOL_ADMIN_ROLES,
          },
        ],
      },
    ],
  },

  // ─── Müəllim Profili ──────────────────────────────────────────────────────
  {
    id: 'teacher-profile',
    label: 'Müəllim Profili',
    panel: 'work',
    roles: [USER_ROLES.MUELLIM],
    items: [
      {
        id: 'teacher-dashboard',
        label: 'Dashboard',
        path: '/teacher/dashboard',
        icon: LayoutDashboard,
        roles: [USER_ROLES.MUELLIM],
        description: 'Müəllim paneli və statistikalar',
      },
      {
        id: 'teacher-profile-info',
        label: 'Profil Məlumatları',
        path: '/teacher/profile',
        icon: BookOpen,
        roles: [USER_ROLES.MUELLIM],
        description: 'Şəxsi məlumatlar və təhsil tarixçəsi',
      },
      {
        id: 'teacher-schedule',
        label: 'Dərs Cədvəli',
        path: '/teacher/schedule',
        icon: Calendar,
        roles: [USER_ROLES.MUELLIM],
        description: 'Həftəlik dərs cədvəli',
      },
      {
        id: 'teacher-classes',
        label: 'Siniflərim',
        path: '/teacher/classes',
        icon: School,
        roles: [USER_ROLES.MUELLIM],
        description: 'Təyin edilmiş siniflər və şagirdlər',
      },
      {
        id: 'teacher-performance',
        label: 'Performans',
        path: '/teacher/performance',
        icon: TrendingUp,
        roles: [USER_ROLES.MUELLIM],
        description: 'Fəaliyyətin analizi və hesabatlar',
      },
      {
        id: 'teacher-resources',
        label: 'Resurslarım',
        path: '/teacher/resources',
        icon: Folder,
        roles: [USER_ROLES.MUELLIM],
        description: 'Dərs materialları və resurslar',
      },
    ],
  },

  // ─── Sektor İdarəetməsi ───────────────────────────────────────────────────
  {
    id: 'sector-management',
    label: 'Sektor İdarəetməsi',
    panel: 'work',
    roles: [USER_ROLES.SEKTORADMIN],
    items: [
      {
        id: 'sector-overview',
        label: 'Sektor Ümumi Görünüş',
        path: '/',
        icon: LayoutDashboard,
        roles: [USER_ROLES.SEKTORADMIN],
        description: 'Sektor statistikası və ümumi məlumatlar',
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
            roles: [USER_ROLES.SEKTORADMIN],
          },
          {
            id: 'sector-schools-classes',
            label: 'Sektor Sinifləri',
            path: '/school/classes',
            roles: [USER_ROLES.SEKTORADMIN],
          },
          {
            id: 'sector-schools-students',
            label: 'Sektor Şagirdləri',
            path: '/students',
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
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
            roles: [USER_ROLES.SEKTORADMIN],
          },
          {
            id: 'sector-teachers',
            label: 'Sektor Müəllimləri',
            path: '/school/teachers',
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
      },
      {
        id: 'sector-schedules',
        label: 'Sektor Cədvəlləri',
        icon: Calendar,
        roles: [USER_ROLES.SEKTORADMIN],
        children: [
          {
            id: 'sector-teacher-schedules',
            label: 'Müəllim Cədvəlləri',
            path: '/school/schedule-management',
            roles: [USER_ROLES.SEKTORADMIN],
          },
          {
            id: 'sector-schedule-overview',
            label: 'Cədvəl Ümumi Görünüş',
            path: '/school/schedules',
            roles: [USER_ROLES.SEKTORADMIN],
          },
          {
            id: 'sector-workload',
            label: 'İş Yükü Analizi',
            path: '/school/workload',
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
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
            path: '/school/attendance?tab=reports',
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
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
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
      },
    ],
  },
];
