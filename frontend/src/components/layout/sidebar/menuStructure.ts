import { 
  HomeIcon, 
  UsersIcon, 
  FileTextIcon, 
  BarChart3Icon,
  SettingsIcon,
  BellIcon,
  SchoolIcon,
  ClipboardListIcon,
  FolderIcon,
  BuildingIcon,
  MapPinIcon,
  GraduationCapIcon,
  ShieldIcon,
  DatabaseIcon,
  MonitorIcon,
  ClipboardIcon,
  DownloadIcon,
  BabyIcon,
  LinkIcon,
  CalendarIcon,
  Clock,
  BookOpen,
  CheckSquare
} from "lucide-react";
import { MenuGroup, MenuItem } from "./types";

export const getSuperAdminMenuStructure = (): MenuGroup[] => [
  {
    groupLabel: "İdarəetmə",
    items: [
      { icon: HomeIcon, label: "Ana səhifə", path: "/" },
      { icon: BellIcon, label: "Bildirişlər", path: "/notifications" },
      { icon: UsersIcon, label: "İstifadəçilər", path: "/users" },
      { icon: GraduationCapIcon, label: "Şagirdlər", path: "/students" },
      { icon: ShieldIcon, label: "Rollar", path: "/roles" },
      { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
    ]
  },
  {
    groupLabel: "Struktur", 
    items: [
      { icon: BuildingIcon, label: "Departmentlər", path: "/departments" },
      { icon: SchoolIcon, label: "Müəssisələr", path: "/institutions" },
      { icon: BabyIcon, label: "Məktəbəqədər müəssisələr", path: "/preschools" },
      { icon: MapPinIcon, label: "Regionlar", path: "/regions" },
      { icon: UsersIcon, label: "Sektorlar", path: "/sectors" },
      { icon: DatabaseIcon, label: "İerarxiya İdarəetməsi", path: "/hierarchy" },
      { icon: SettingsIcon, label: "Müəssisə Növləri", path: "/institution-types-management" },
      { icon: BookOpen, label: "Fənnlər", path: "/subjects" },
    ]
  },
  {
    groupLabel: "Sorğular",
    items: [
      { 
        icon: ClipboardListIcon, 
        label: "Sorğu İdarəetməsi", 
        hasSubmenu: true,
        key: "surveys",
        submenu: [
          { label: "Sorğular", path: "/surveys" },
          { label: "Təsdiq Paneli", path: "/approvals" },
          { label: "Sorğu nəticələri", path: "/survey-results" },
          { label: "Arxiv", path: "/survey-archive" },
        ]
      },
      {
        icon: GraduationCapIcon,
        label: "Məktəb İdarəetməsi",
        hasSubmenu: true,
        key: "school",
        submenu: [
          { label: "Müəllimlər", path: "/school/teachers" },
          { label: "Siniflər", path: "/school/classes" },
          { label: "Davamiyyət Qeydiyyatı", path: "/school/attendance" },
          { label: "Davamiyyət Hesabatları", path: "/school/attendance/reports" },
          { label: "Qiymətləndirmələr", path: "/school/assessments" },
          { label: "Qiymət Kitabı", path: "/school/gradebook" },
          { label: "Məktəb Sorğuları", path: "/school/surveys" },
          { label: "Məktəb Tapşırıqları", path: "/school/tasks" },
        ]
      }
    ]
  },
  {
    groupLabel: "Cədvəl İdarəetməsi",
    items: [
      {
        icon: CalendarIcon,
        label: "Dərs Cədvəlləri",
        hasSubmenu: true,
        key: "schedules",
        submenu: [
          { label: "Məktəb Cədvəl İdarəetməsi", path: "/school/schedule-management" },
          { label: "Məktəb Cədvəlləri", path: "/school/schedules" },
          { label: "Regional Cədvəl Nəzarəti", path: "/regionadmin/schedules" },
          { label: "Müəllim Cədvəli", path: "/teacher/schedule" },
          { label: "Dərs Yükü", path: "/school/workload" },
        ]
      }
    ]
  },
  {
    groupLabel: "Regional İdarəetmə",
    items: [
      {
        icon: MapPinIcon,
        label: "Regional İdarəetmə",
        hasSubmenu: true,
        key: "regionadmin",
        submenu: [
          { label: "Regional İstifadəçilər", path: "/regionadmin/users/operators" },
          { label: "Sektor Adminləri", path: "/regionadmin/users/sektoradmins" },
          { label: "Məktəb Adminləri", path: "/regionadmin/users/schooladmins" },
          { label: "Müəllimlər", path: "/regionadmin/users/teachers" },
          { label: "Regional Sektorlar", path: "/regionadmin/sectors" },
        ]
      }
    ]
  },
  {
    groupLabel: "Qiymətləndirmə",
    items: [
      { 
        icon: BarChart3Icon, 
        label: "Qiymətləndirmə İdarəetməsi", 
        hasSubmenu: true,
        key: "assessments",
        submenu: [
          { label: "Qiymətləndirmə Növləri", path: "/assessments/types" },
          { label: "Məlumat Daxiletməsi", path: "/assessments/entry" },
          { label: "Qiymətləndirmə Nəticələri", path: "/assessments/results" },
        ]
      }
    ]
  },
  {
    groupLabel: "Məzmun",
    items: [
      { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
      { icon: LinkIcon, label: "Linklər", path: "/links" },
    ]
  },
  {
    groupLabel: "Hesabatlar",
    items: [
      { icon: DownloadIcon, label: "Hesabatlar", path: "/reports" },
      { icon: BarChart3Icon, label: "Sistem Statistikası", path: "/analytics" },
    ]
  },
  {
    groupLabel: "Sistem",
    items: [
      { icon: SettingsIcon, label: "Sistem Parametrləri", path: "/settings" },
      { icon: ClipboardIcon, label: "Audit Logları", path: "/audit-logs" },
      { icon: MonitorIcon, label: "Performans Monitorinqi", path: "/performance" },
    ]
  }
];

export const getOtherRoleMenuStructure = (userRole: string): MenuItem[] => {
  const baseItems: MenuItem[] = [
    { icon: HomeIcon, label: "Ana səhifə", path: "/" },
    { icon: BellIcon, label: "Bildirişlər", path: "/notifications" },
  ];

  const roleSpecificItems: Record<string, MenuItem[]> = {
    regionadmin: [
      { icon: GraduationCapIcon, label: "Şagirdlər", path: "/students" },
      { icon: BookOpen, label: "Fənnlər", path: "/subjects" },
      { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
      { icon: CheckSquare, label: "Təsdiqlər", path: "/approvals" },
      { icon: BarChart3Icon, label: "Sorğu Nəticələri", path: "/survey-results" },
      { icon: CalendarIcon, label: "Cədvəl Nəzarəti", path: "/regionadmin/schedules" },
      { icon: UsersIcon, label: "Sektorlar", path: "/sectors" },
      { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
      { icon: BarChart3Icon, label: "Hesabatlar", path: "/reports" },
    ],
    regionoperator: [
      { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
      { icon: FolderIcon, label: "Sənədlər", path: "/documents" },
      { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
    ],
    sektoradmin: [
      { icon: GraduationCapIcon, label: "Şagirdlər", path: "/students" },
      { icon: SchoolIcon, label: "Təhsil müəssisələri", path: "/institutions" },
      { icon: ClipboardListIcon, label: "Sorğular", path: "/surveys" },
      { icon: CheckSquare, label: "Təsdiqlər", path: "/approvals" },
      { icon: FileTextIcon, label: "Tapşırıqlar", path: "/tasks" },
      { icon: BarChart3Icon, label: "Sektor hesabatları", path: "/reports" },
    ],
    məktəbadmin: [
      { icon: GraduationCapIcon, label: "Şagirdlər", path: "/students" },
      { icon: UsersIcon, label: "Müəllimlər", path: "/school/teachers" },
      { icon: SchoolIcon, label: "Siniflər", path: "/school/classes" },
      { icon: ClipboardListIcon, label: "Sorğular", path: "/school/surveys" },
      { icon: CheckSquare, label: "Təsdiqlər", path: "/approvals" },
      { icon: FileTextIcon, label: "Tapşırıqlar", path: "/school/tasks" },
      { icon: CalendarIcon, label: "Cədvəl İdarəetməsi", path: "/school/schedule-management" },
      { icon: Clock, label: "Davamiyyət", path: "/school/attendance" },
      { icon: BarChart3Icon, label: "Qiymətləndirmələr", path: "/school/assessments" },
      { icon: BookOpen, label: "Qiymət Kitabı", path: "/school/gradebook" },
    ],
    müəllim: [
      { icon: CalendarIcon, label: "Mənim Cədvəlim", path: "/teacher/schedule" },
      { icon: GraduationCapIcon, label: "Şagirdlər", path: "/students" },
      { icon: Clock, label: "Davamiyyət", path: "/school/attendance" },
      { icon: BarChart3Icon, label: "Qiymətləndirmələr", path: "/school/assessments" },
      { icon: BookOpen, label: "Qiymət Kitabı", path: "/school/gradebook" },
      { icon: ClipboardListIcon, label: "Sorğular", path: "/school/surveys" },
      { icon: FileTextIcon, label: "Tapşırıqlar", path: "/school/tasks" },
    ]
  };

  return [...baseItems, ...(roleSpecificItems[userRole] || [])];
};