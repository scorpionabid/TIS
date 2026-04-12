import React from 'react';
import { List } from 'react-window';
import type { RowComponentProps } from 'react-window';
import { Loader2, Search, X, MapPin, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ASSIGNABLE_ROLES,
  roleDisplayNames,
} from '@/components/tasks/config/taskFormFields';
import { useAssignableUsers } from '@/hooks/tasks/useAssignableUsers';
import { AssignableUser } from '@/services/tasks';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type OriginScope = 'region' | 'sector' | null;

export interface ResponsibleUserSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  originScope?: OriginScope;
  allowedRoles?: string[];
  disabled?: boolean;
}

type CachedUsers = Record<string, AssignableUser>;

const ROW_HEIGHT = 64;
const LIST_HEIGHT = 320;

import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, ROLE_HIERARCHY, UserRole } from '@/constants/roles';

export function ResponsibleUserSelector({
  value,
  onChange,
  originScope = null,
  allowedRoles,
  disabled = false,
}: ResponsibleUserSelectorProps) {
  const { currentUser } = useAuth();
  const currentUserRole = (currentUser?.role as UserRole) || USER_ROLES.MUELLIM;
  const currentUserLevel = ROLE_HIERARCHY[currentUserRole] || 99;

  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);
  const [roleFilter, setRoleFilter] = React.useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = React.useState<number | null>(null);
  const [selectedCache, setSelectedCache] = React.useState<CachedUsers>({});

  const activeRoles = React.useMemo(() => {
    const roles = allowedRoles?.length ? allowedRoles : ASSIGNABLE_ROLES;

    return Array.from(new Set(roles.map((role) => role.toLowerCase())))
      .filter(role => {
        const targetLevel = ROLE_HIERARCHY[role as UserRole] || 99;
        return targetLevel >= currentUserLevel;
      });
  }, [allowedRoles, currentUserLevel]);

  // Fetch regions (level=2 institutions) for the region picker
  const { data: regionsData } = useQuery({
    queryKey: ['institutions-regions'],
    queryFn: () => institutionService.getAll({ level: 2, per_page: 200 } as any),
    staleTime: 1000 * 60 * 10,
    enabled: !disabled,
  });

  const regions = React.useMemo(() => {
    if (!regionsData) return [];
    // Handle various response shapes from institutionService
    const raw = (regionsData as any)?.data?.data ?? (regionsData as any)?.data ?? regionsData;
    return Array.isArray(raw) ? raw : [];
  }, [regionsData]);

  const perPage = selectedRegionId ? 200 : 50;

  const {
    users,
    total,
    hasMore,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
    refetch,
    error,
  } = useAssignableUsers({
    originScope,
    role: roleFilter,
    search: debouncedSearch,
    regionId: selectedRegionId,
    perPage,
    enabled: !disabled,
  });

  React.useEffect(() => {
    if (!users.length) {
      return;
    }

    setSelectedCache((prev) => {
      const next = { ...prev };
      users.forEach((user) => {
        next[user.id.toString()] = user;
      });
      return next;
    });
  }, [users]);

  const handleToggleUser = React.useCallback((userId: string) => {
    onChange(
      value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId],
    );
  }, [onChange, value]);

  const handleClearSelection = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleSelectAllVisible = React.useCallback(() => {
    const allIds = users.map((u) => u.id.toString());
    const merged = Array.from(new Set([...value, ...allIds]));
    onChange(merged);
  }, [users, value, onChange]);

  const displayedUsers = React.useMemo(
    () => (Array.isArray(users) ? users : []),
    [users],
  );

  const selectedUsersList = React.useMemo(() => {
    if (!value.length) {
      return [];
    }

    return value.map((id) => {
      const cached = selectedCache[id];
      if (cached) {
        return cached;
      }

      return {
        id: Number(id),
        name: `ID #${id}`,
        email: null,
        is_active: true,
      } as AssignableUser;
    });
  }, [selectedCache, value]);

  const RowComponent = React.useCallback(({ index, style, ariaAttributes }: RowComponentProps) => {
    const user = displayedUsers[index];
    if (!user) {
      return null;
    }

    const userId = user.id.toString();
    const isChecked = value.includes(userId);

    return (
      <div
        style={style}
        key={userId}
        {...ariaAttributes}
        className="border-b border-border/40 bg-background"
      >
        <label
          htmlFor={`responsible-${userId}`}
          className={cn(
            'flex h-full cursor-pointer items-center gap-3 px-3 py-1 transition hover:bg-muted',
            isChecked && 'bg-muted/70',
          )}
        >
          <Checkbox
            id={`responsible-${userId}`}
            checked={isChecked}
            onCheckedChange={() => handleToggleUser(userId)}
            disabled={disabled}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">{user.name}</span>
            {user.institution?.name && (
              <span className="text-[11px] text-muted-foreground">{user.institution.name}</span>
            )}
          </div>
        </label>
      </div>
    );
  }, [displayedUsers, disabled, handleToggleUser, value]);

  return (
    <div className={cn('space-y-4 rounded-lg border border-dashed border-border/60 p-4', disabled && 'opacity-60')}>
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Axtar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ad, soyad və ya email ilə axtar"
              className="pl-9"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Region filter */}
        {regions.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Region üzrə filtr
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedRegionId?.toString() ?? 'all'}
                onValueChange={(v) => setSelectedRegionId(v === 'all' ? null : Number(v))}
                disabled={disabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Bütün regionlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün regionlar</SelectItem>
                  {regions.map((r: any) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRegionId && !isFetching && displayedUsers.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={handleSelectAllVisible}
                  disabled={disabled}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Hamısını seç ({displayedUsers.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Role filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Rol filtrləri</span>
            {roleFilter && (
              <Button variant="ghost" size="sm" onClick={() => setRoleFilter(null)}>
                Filtri sil
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeRoles.map((role) => (
              <Button
                key={role}
                size="sm"
                type="button"
                variant={roleFilter === role ? 'default' : 'outline'}
                onClick={() => setRoleFilter((current) => current === role ? null : role)}
                disabled={disabled}
                className="text-xs"
              >
                {roleDisplayNames[role] ?? role}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected users */}
      {value.length > 0 && (
        <div className="space-y-2 rounded-md border border-border/60 p-3 bg-muted/40">
          <div className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>Seçilmiş məsul şəxslər ({value.length})</span>
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Hamısını təmizlə
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedUsersList.slice(0, 6).map((user) => (
              <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                {user.name}
                <button
                  type="button"
                  aria-label="Seçimi sil"
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() => handleToggleUser(user.id.toString())}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {value.length > 6 && (
              <Badge variant="outline">+{value.length - 6} nəfər</Badge>
            )}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="rounded-md border border-border/60">
        {error && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <p>Məsul istifadəçiləri yükləmək mümkün olmadı.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Yenidən cəhd et
            </Button>
          </div>
        )}

        {!error && displayedUsers.length === 0 && !isFetching && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <p>Uyğun istifadəçi tapılmadı.</p>
            {debouncedSearch && <p className="text-xs">Axtarış kriteriyalarını dəyişin.</p>}
          </div>
        )}

        {!error && displayedUsers.length > 0 && (
          <div>
            <List
              rowComponent={RowComponent}
              rowCount={displayedUsers.length}
              rowHeight={ROW_HEIGHT}
              rowProps={{}}
              style={{ height: LIST_HEIGHT, width: '100%' }}
            />

            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
              <span>
                {displayedUsers.length} / {total || displayedUsers.length} nəfər göstərilir
              </span>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Daha çox yüklə
                </Button>
              )}
            </div>
          </div>
        )}

        {isFetching && !isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 border-t border-border/60 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            İstifadəçilər yüklənir...
          </div>
        )}
      </div>
    </div>
  );
}
