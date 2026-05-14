import React, { useMemo, useState, useCallback } from 'react';
import { Loader2, Search, X, CheckSquare, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { ASSIGNABLE_ROLES, roleDisplayNames } from '@/components/tasks/config/taskFormFields';
import { useAssignableUsers } from '@/hooks/tasks/useAssignableUsers';
import { AssignableUser, taskService } from '@/services/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, ROLE_HIERARCHY, UserRole } from '@/constants/roles';

export interface ResponsibleUserSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  originScope?: 'region' | 'sector' | null;
  context?: 'project';
  allowedRoles?: string[];
  disabled?: boolean;
  bypassHierarchyFilter?: boolean;
}

type CachedUsers = Record<string, AssignableUser>;

// Institution group with collapsed users
interface InstGroup {
  instId: number | null;
  instName: string;
  users: AssignableUser[];
}

export function ResponsibleUserSelector({
  value,
  onChange,
  originScope = null,
  context,
  allowedRoles,
  disabled = false,
  bypassHierarchyFilter = false,
}: ResponsibleUserSelectorProps) {
  const { currentUser } = useAuth();
  const currentUserRole  = (currentUser?.role as UserRole) || USER_ROLES.MUELLIM;
  const currentUserLevel = ROLE_HIERARCHY[currentUserRole] || 99;

  const [search, setSearch]             = useState('');
  const debouncedSearch                 = useDebounce(search.trim(), 400);
  const [roleFilter, setRoleFilter]     = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__all__']));
  const [selectedCache, setSelectedCache]   = useState<CachedUsers>({});
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const activeRoles = useMemo(() => {
    const roles = allowedRoles?.length ? allowedRoles : ASSIGNABLE_ROLES;
    return Array.from(new Set(roles.map(r => r.toLowerCase()))).filter(role => {
      if (bypassHierarchyFilter) return true;
      return (ROLE_HIERARCHY[role as UserRole] || 99) >= currentUserLevel;
    });
  }, [allowedRoles, currentUserLevel, bypassHierarchyFilter]);

  const { users, total, hasMore, fetchNextPage, isFetching, isFetchingNextPage, refetch, error } =
    useAssignableUsers({
      originScope,
      role: roleFilter,
      search: debouncedSearch,
      regionId: null,
      context,
      perPage: roleFilter ? 2000 : 100,
      enabled: !disabled,
    });

  // Cache fetched users for display of selected items
  React.useEffect(() => {
    if (!users.length) return;
    setSelectedCache(prev => {
      const next = { ...prev };
      users.forEach(u => { next[u.id.toString()] = u; });
      return next;
    });
  }, [users]);

  // Group users by institution
  const groups = useMemo<InstGroup[]>(() => {
    const map = new Map<string, InstGroup>();
    users.forEach(user => {
      const key  = user.institution?.id?.toString() ?? '__none__';
      const name = user.institution?.name ?? 'Müəssisəsiz';
      if (!map.has(key)) map.set(key, { instId: user.institution?.id ?? null, instName: name, users: [] });
      map.get(key)!.users.push(user);
    });
    return Array.from(map.values()).sort((a, b) => a.instName.localeCompare(b.instName));
  }, [users]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const handleToggle = useCallback((userId: string) => {
    onChange(value.includes(userId) ? value.filter(id => id !== userId) : [...value, userId]);
  }, [onChange, value]);

  const handleClear = useCallback(() => onChange([]), [onChange]);

  const handleSelectGroup = useCallback((groupUsers: AssignableUser[]) => {
    const ids = groupUsers.map(u => u.id.toString());
    onChange(Array.from(new Set([...value, ...ids])));
  }, [onChange, value]);

  const handleSelectAllRole = useCallback(async () => {
    if (!roleFilter || isSelectingAll) return;
    setIsSelectingAll(true);
    try {
      const result = await taskService.getAssignableUsers({
        role: roleFilter, origin_scope: originScope ?? undefined, per_page: 2000, page: 1,
      });
      const allIds = result.data.map(u => u.id.toString());
      setSelectedCache(prev => {
        const next = { ...prev };
        result.data.forEach(u => { next[u.id.toString()] = u; });
        return next;
      });
      onChange(Array.from(new Set([...value, ...allIds])));
    } finally { setIsSelectingAll(false); }
  }, [roleFilter, originScope, value, onChange, isSelectingAll]);

  const selectedList = useMemo(() =>
    value.map(id => selectedCache[id] ?? { id: Number(id), name: `#${id}`, email: null, is_active: true } as AssignableUser),
    [value, selectedCache]
  );

  const CHIP_LIMIT = 4;

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-background', disabled && 'opacity-60')}>

      {/* ── Selected strip ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50 min-h-[44px]">
        <div className="flex items-center gap-1.5 shrink-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">
            {value.length > 0 ? `${value.length} seçildi` : 'Seçilməyib'}
          </span>
        </div>

        {value.length > 0 && (
          <>
            <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
              {selectedList.slice(0, CHIP_LIMIT).map(user => (
                <span key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20 max-w-[160px]">
                  <span className="truncate">{user.name}</span>
                  <button type="button" onClick={() => handleToggle(user.id.toString())}
                    className="shrink-0 text-primary/60 hover:text-primary">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {value.length > CHIP_LIMIT && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  +{value.length - CHIP_LIMIT} daha
                </span>
              )}
            </div>
            <button type="button" onClick={handleClear}
              className="shrink-0 text-[11px] text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap">
              Hamısını sil
            </button>
          </>
        )}
      </div>

      {/* ── Search + role chips ─────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, email və ya müəssisə..."
            className="pl-9 h-8 text-sm bg-muted/30 border-border/50 rounded-lg"
            disabled={disabled}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Role chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setRoleFilter(null)}
            className={cn(
              'h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
              !roleFilter
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30'
            )}>
            Hamısı
          </button>
          {activeRoles.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(prev => prev === role ? null : role)}
              className={cn(
                'h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
                roleFilter === role
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30'
              )}>
              {roleDisplayNames[role] ?? role}
            </button>
          ))}
          {roleFilter && !isFetching && users.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllRole}
              disabled={isSelectingAll}
              className="h-6 px-2.5 rounded-full text-[11px] font-semibold border border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all ml-1 flex items-center gap-1">
              {isSelectingAll
                ? <><Loader2 className="h-3 w-3 animate-spin" />Yüklənir</>
                : <><CheckSquare className="h-3 w-3" />Hamısını seç ({total || users.length})</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── User list grouped by institution ───────────────────────── */}
      <div className="max-h-[280px] overflow-y-auto">
        {isFetching && !isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yüklənir...
          </div>
        )}

        {error && !isFetching && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <p>Yükləmə xətası</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Yenidən cəhd et</Button>
          </div>
        )}

        {!error && !isFetching && users.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {search || roleFilter ? 'Uyğun istifadəçi tapılmadı' : 'İstifadəçi yoxdur'}
          </div>
        )}

        {!error && groups.map(group => {
          const groupKey  = group.instId?.toString() ?? '__none__';
          const expanded  = expandedGroups.has(groupKey);
          const allInGroupSelected = group.users.every(u => value.includes(u.id.toString()));
          const someSelected = group.users.some(u => value.includes(u.id.toString()));

          return (
            <div key={groupKey} className="border-b border-border/30 last:border-0">
              {/* Group header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                  onClick={() => toggleGroup(groupKey)}>
                  {expanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">
                      {group.instName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {group.users.length} istifadəçi
                      {someSelected && !allInGroupSelected && ` · ${group.users.filter(u => value.includes(u.id.toString())).length} seçildi`}
                    </span>
                  </div>
                </button>

                {/* Group select button */}
                {!allInGroupSelected ? (
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(group.users)}
                    disabled={disabled}
                    className="shrink-0 text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-all whitespace-nowrap">
                    Hamısını seç
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-600 px-2">
                    ✓ Hamısı seçildi
                  </span>
                )}
              </div>

              {/* Users in group */}
              {expanded && group.users.map(user => {
                const uid      = user.id.toString();
                const checked  = value.includes(uid);
                return (
                  <label
                    key={uid}
                    htmlFor={`user-${uid}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-t border-border/20',
                      checked ? 'bg-primary/5' : 'hover:bg-muted/30'
                    )}>
                    <Checkbox
                      id={`user-${uid}`}
                      checked={checked}
                      onCheckedChange={() => handleToggle(uid)}
                      disabled={disabled}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      {(user.role_display || user.role) && (
                        <p className="text-[11px] text-muted-foreground">
                          {user.role_display || (user.role ? (roleDisplayNames[user.role.toLowerCase()] ?? user.role) : '')}
                        </p>
                      )}
                    </div>
                    {checked && <span className="shrink-0 text-[10px] text-primary font-semibold">✓</span>}
                  </label>
                );
              })}
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && !isFetching && (
          <div className="px-3 py-2 border-t border-border/30">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-muted/40 transition-all flex items-center justify-center gap-1.5">
              {isFetchingNextPage
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Yüklənir...</>
                : `Daha çox yüklə (${users.length} / ${total})`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
