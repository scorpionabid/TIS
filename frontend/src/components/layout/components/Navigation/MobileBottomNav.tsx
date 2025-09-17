import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import {
  HomeIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
  SettingsIcon,
  BuildingIcon,
  GraduationCapIcon,
  ClipboardCheckIcon
} from 'lucide-react';

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
    roles: ['superadmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin', 'teacher']
  },
  {
    id: 'institutions',
    label: 'Müəssisələr',
    path: '/institutions',
    icon: BuildingIcon,
    roles: ['superadmin', 'RegionAdmin']
  },
  {
    id: 'surveys',
    label: 'Sorğular',
    path: '/surveys',
    icon: ClipboardCheckIcon,
    roles: ['superadmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin', 'teacher']
  },
  {
    id: 'tasks',
    label: 'Tapşırıqlar',
    path: '/tasks',
    icon: FileTextIcon,
    roles: ['superadmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin', 'teacher']
  },
  {
    id: 'analytics',
    label: 'Analitika',
    path: '/analytics',
    icon: BarChart3Icon,
    roles: ['superadmin', 'RegionAdmin', 'SektorAdmin', 'SchoolAdmin']
  }
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isMobile } = useLayout();

  // Only show on mobile
  if (!isMobile) return null;

  // Filter nav items based on user role
  const visibleItems = mobileNavItems.filter(item =>
    currentUser && item.roles.includes(currentUser.role)
  ).slice(0, 5); // Limit to 5 items for mobile

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
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