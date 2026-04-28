import {
  LayoutDashboard,
  Users,
  School,
  ClipboardList,
  BookOpen,
  Link,
  FileText,
  GraduationCap,
  UserCheck,
  Calculator,
  Briefcase,
  ClipboardCheck,
  Award,
  Calendar,
  Clock,
  TrendingUp,
  Archive,
  Folder,
  Library,
  Star,
  Table2,
  CheckCircle,
  ExternalLink,
  MapPin,
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
        roles: [
          USER_ROLES.SUPERADMIN,
          USER_ROLES.REGIONADMIN,
          USER_ROLES.REGIONOPERATOR,
          USER_ROLES.SEKTORADMIN,
          USER_ROLES.SCHOOLADMIN,
        ],
      },
      {
        id: 'teacher-dashboard',
        label: 'İdarə Paneli',
        path: '/teacher/dashboard',
        icon: LayoutDashboard,
        roles: [USER_ROLES.MUELLIM],
      },
    ],
  },

  // ─── İdarəetmə ────────────────────────────────────────────────────────────
  {
    id: 'management',
    label: 'İdarəetmə',
    panel: 'work',
    roles: ALL_USERS,
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
        id: 'link-database',
        label: 'Keçidlər',
        path: '/link-database',
        icon: ExternalLink,
        roles: REGION_AND_ABOVE,
        permissions: ['links.read'],
        description: 'Faydalı resurslara sürətli keçidlər paneli',
      },
      {
        id: 'my-resources',
        label: 'Resurslar',
        path: '/my-resources',
        icon: Folder,
        roles: ALL_USERS,
      },
      {
        id: 'surveys-root',
        label: 'Sorğular',
        icon: ClipboardList,
        path: '/surveys',
        roles: ALL_USERS,
      },
    ],
  },

  // ─── Akademik İzləmə ──────────────────────────────────────────────────────
  {
    id: 'academic',
    label: 'Akademik İzləmə',
    panel: 'work',
    roles: ALL_USERS,
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
      {
        id: 'teacher-classes',
        label: 'Siniflərim',
        path: '/teacher/classes',
        icon: School,
        roles: [USER_ROLES.MUELLIM],
      },
    ],
  },

  // ─── Tədris Planı ─────────────────────────────────────────────────────────
  {
    id: 'curriculum',
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
      },
      {
        id: 'school-curriculum-plan',
        label: 'Dərs yükü və Vakansiya',
        path: '/school/curriculum-plan',
        icon: LayoutDashboard,
        roles: SCHOOL_ADMIN_ROLES,
      },
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
            label: 'Məktəb Cədvəlləri',
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
            label: 'Cədvəl İcmalı',
            path: '/school/schedules',
            roles: SCHOOL_ADMIN_ROLES,
          },
          {
            id: 'regional-schedules',
            label: 'Regional Nəzarət',
            path: '/regionadmin/schedules',
            roles: REGION_ADMIN_ROLES,
          },
          {
            id: 'school-workload',
            label: 'Dərs Yükü',
            path: '/school/workload',
            roles: SCHOOL_ADMIN_ROLES,
          },
          {
            id: 'sector-workload',
            label: 'Sektor İş Yükü',
            path: '/school/workload',
            roles: [USER_ROLES.SEKTORADMIN],
          },
        ],
      },
    ],
  },

  // ─── Təhsil Reytingi ──────────────────────────────────────────────────────
  {
    id: 'rating',
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
        permissions: ['ratings.read'],
      },
      {
        id: 'teacher-verification',
        label: 'Müəllim Təsdiqi',
        path: '/teacher-verification',
        icon: CheckCircle,
        roles: REGION_AND_ABOVE,
      },
      {
        id: 'rating-configuration',
        label: 'Konfiqurasiya',
        path: '/rating-configuration',
        icon: Award,
        roles: [USER_ROLES.SUPERADMIN],
        permissions: ['rating-configs.manage'],
      },
      {
        id: 'teacher-performance',
        label: 'Performans İzləmə',
        path: '/teacher/performance',
        icon: TrendingUp,
        roles: [USER_ROLES.MUELLIM],
      },
    ],
  },
];
