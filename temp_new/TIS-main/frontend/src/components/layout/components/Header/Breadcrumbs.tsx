import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';

export const Breadcrumbs: React.FC = () => {
  const { breadcrumbs } = useNavigation();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground overflow-hidden">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center space-x-1 flex-shrink-0">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors flex items-center"
            >
              {index === 0 ? <Home className="h-3 w-3" /> : <span className="truncate">{crumb.label}</span>}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};