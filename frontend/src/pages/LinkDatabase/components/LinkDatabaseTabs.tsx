import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Building2, ChevronRight } from 'lucide-react';
import type { Department } from '../types/linkDatabase.types';

interface LinkDatabaseTabsProps {
  departments: Department[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'horizontal' | 'vertical';
}

interface DeptGroup {
  institutionId: number;
  institutionName: string;
  institutionShortName: string;
  departments: Department[];
}

/** "Tədrisin Keyfiyyəti sektoru" → "Tədrisin Keyfiyyəti" */
function cleanDeptName(name: string): string {
  return name
    .replace(/\s+sektoru\s*$/i, '')
    .replace(/\s+sektoru\s*$/i, '') // ikiqat suffix üçün
    .trim();
}


export function LinkDatabaseTabs({
  departments,
  activeTab,
  onTabChange,
  variant = 'horizontal',
}: LinkDatabaseTabsProps) {

  const groups = useMemo<DeptGroup[]>(() => {
    const map = new Map<number, DeptGroup>();
    for (const dept of departments) {
      const instId = dept.institution_id;
      if (!map.has(instId)) {
        map.set(instId, {
          institutionId: instId,
          institutionName: dept.institution_name || '',
          institutionShortName: dept.institution_short_name || '',
          departments: [],
        });
      }
      map.get(instId)!.departments.push(dept);
    }
    return Array.from(map.values());
  }, [departments]);

  const multiGroup = groups.length > 1;

  if (variant === 'vertical') {
    return (
      <div className="flex flex-col w-full py-2 space-y-1 px-2">
        {departments.map((dept) => {
          const isActive = activeTab === dept.id.toString();
          return (
            <button
              key={dept.id}
              onClick={() => onTabChange(dept.id.toString())}
              className={cn(
                'group w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'p-2 rounded-lg transition-colors shrink-0',
                  isActive ? 'bg-primary-foreground/10' : 'bg-muted group-hover:bg-muted/80'
                )}>
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="truncate text-left font-bold tracking-tight">
                  {cleanDeptName(dept.name)}
                </span>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
            </button>
          );
        })}
      </div>
    );
  }

  // Horizontal fallback
  return (
    <div className="py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-3 min-w-max px-1">
        {departments.map((dept) => {
          const isActive = activeTab === dept.id.toString();
          return (
            <button
              key={dept.id}
              onClick={() => onTabChange(dept.id.toString())}
              className={cn(
                'group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border shadow-sm',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                  : 'bg-white/40 dark:bg-muted/10 text-muted-foreground border-border/40 hover:border-primary/30 hover:text-primary hover:bg-primary/5'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-colors',
                isActive ? 'bg-white/20' : 'bg-muted group-hover:bg-primary/10'
              )}>
                <Building2 className="h-4 w-4" />
              </div>
              <span>{cleanDeptName(dept.name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
