import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import {
  HomeIcon,
  FileTextIcon,
  BarChart3Icon,
  BuildingIcon,
  ClipboardCheckIcon
} from 'lucide-react';
import { USER_ROLES } from '@/constants/roles';

interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const mobileNavItems: MobileNavItem[] = [
  {
    id: 'dashboard',
    label: 'Ana səhifə',
    path: '/',
    icon: HomeIcon,
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.REGIONOPERATOR,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.SCHOOLADMIN,
      USER_ROLES.MUELLIM
    ]
  },
  {
    id: 'institutions',
    label: 'Müəssisələr',
    path: '/institutions',
    icon: BuildingIcon,
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.REGIONOPERATOR
    ]
  },
  {
    id: 'surveys',
    label: 'Sorğular',
    path: '/surveys',
    icon: ClipboardCheckIcon,
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.REGIONOPERATOR,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.SCHOOLADMIN,
      USER_ROLES.MUELLIM
    ]
  },
  {
    id: 'tasks',
    label: 'Tapşırıqlar',
    path: '/tasks',
    icon: FileTextIcon,
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.REGIONOPERATOR,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.SCHOOLADMIN,
      USER_ROLES.MUELLIM
    ]
  },
  {
    id: 'analytics',
    label: 'Analitika',
    path: '/analytics',
    icon: BarChart3Icon,
    roles: [
      USER_ROLES.SUPERADMIN,
      USER_ROLES.REGIONADMIN,
      USER_ROLES.REGIONOPERATOR,
      USER_ROLES.SEKTORADMIN,
      USER_ROLES.SCHOOLADMIN
    ]
  }
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isMobile } = useLayout();

  const normalizeRole = (role?: string | null) =>
    role ? role.toString().trim().toLowerCase() : undefined;

  const activeRole = normalizeRole(currentUser?.role);

  if (!isMobile) return null;

  const visibleItems = mobileNavItems
    .filter((item) =>
      activeRole
        ? item.roles.some((role) => normalizeRole(role) === activeRole)
        : false
    )
    .slice(0, 5);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (visibleItems.length === 0) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border shadow-lg backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
                          (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200",
                "min-h-[48px] min-w-[48px]", // Touch target compliance
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate max-w-[60px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
