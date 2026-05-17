import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Users, ChevronDown, ChevronRight, Loader2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AssignableUser, taskService } from '@/services/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/constants/roles';

// ── Sabitlər ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  regionadmin:    'RegionAdmin',
  regionoperator: 'RegionOperator',
  sektoradmin:    'SektorAdmin',
  schooladmin:    'SchoolAdmin',
};

type RoleFilterKey = keyof typeof ROLE_LABELS;

const ROLE_FILTER_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: 'regionadmin',    label: 'RegionAdmin'    },
  { key: 'regionoperator', label: 'RegionOperator' },
  { key: 'sektoradmin',    label: 'SektorAdmin'    },
  { key: 'schooladmin',    label: 'SchoolAdmin'    },
];

const CHIP_LIMIT = 5;

// ── Hierarchy tipləri ──────────────────────────────────────────────────────

interface HierarchyNode { id: number; name: string; level: number | null; }

interface SectorGroup {
  key: string; label: string;
  sectorAdmins: AssignableUser[];
  schoolAdmins: AssignableUser[];
  otherUsers:   AssignableUser[];
}

interface RegionGroup {
  key: string; label: string;
  regionAdmins:     AssignableUser[];
  regionOperators:  AssignableUser[];
  sectors:          SectorGroup[];
  otherUsers:       AssignableUser[];
}

// ── Köməkçi funksiyalar ────────────────────────────────────────────────────

const normalizeRole = (role?: string | null): string => {
  if (!role || typeof role !== 'string') return '';
  return role.trim().toLowerCase();
};

const extractHierarchyInfo = (user: AssignableUser) => {
  const path: HierarchyNode[] = Array.isArray(user.institution?.hierarchy_path)
    ? (user.institution!.hierarchy_path as HierarchyNode[])
    : [];
  const regionNode = path.find(n => n.level === 2) ??
    (user.institution?.level === 2 ? { id: user.institution.id, name: user.institution.name, level: 2 } : undefined);
  const sectorNode = path.find(n => n.level === 3) ??
    (user.institution?.level === 3 ? { id: user.institution.id, name: user.institution.name, level: 3 } : undefined);
  return { regionNode, sectorNode };
};

// ── Props ──────────────────────────────────────────────────────────────────

export interface ProjectCollaboratorSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  originScope?: 'region' | 'sector' | null;
  disabled?: boolean;
}

// ── Komponent ──────────────────────────────────────────────────────────────

export function ProjectCollaboratorSelector({
  value,
  onChange,
  originScope = null,
  disabled = false,
}: ProjectCollaboratorSelectorProps) {

  const { hasRole } = useAuth();
  const [search, setSearch]                 = useState('');
  const [roleFilter, setRoleFilter]         = useState<RoleFilterKey | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [userCache, setUserCache]           = useState<Record<string, AssignableUser>>({});
  const [collabMode, setCollabMode]         = useState(false);

  // Toggle yalnız RegionAdmin və RegionOperator üçün
  const showCollabToggle = hasRole([USER_ROLES.REGIONADMIN, USER_ROLES.REGIONOPERATOR]);
  // SuperAdmin həmişə cross_region; digər rollar üçün toggle-a bağlı
  const isCrossRegion = originScope === null || collabMode;

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['project-collaborators', roleFilter ?? 'all', isCrossRegion, originScope],
    queryFn: () => taskService.getAssignableUsers({
      context:      'project',
      cross_region: isCrossRegion || undefined,
      origin_scope: isCrossRegion ? undefined : (originScope ?? undefined),
      role:         roleFilter ?? undefined,
      per_page:     500,
      page:         1,
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !disabled,
  });

  const allUsers: AssignableUser[] = response?.data ?? [];

  // Cache-i doldur (tab/filter dəyişəndə seçilmiş adlar qalır)
  useEffect(() => {
    if (!allUsers.length) return;
    setUserCache(prev => {
      const next = { ...prev };
      allUsers.forEach(u => { next[u.id.toString()] = u; });
      return next;
    });
  }, [allUsers]);

  // Client-side search filtri
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.institution?.name ?? '').toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  // Region → Sektor hierarchy qruplaşdırması
  const hierarchyGroups = useMemo<RegionGroup[]>(() => {
    const regionMap = new Map<string, RegionGroup>();
    filteredUsers.forEach(user => {
      const { regionNode, sectorNode } = extractHierarchyInfo(user);
      const roleKey   = normalizeRole(user.role);
      const regionKey = regionNode ? `region_${regionNode.id}` : 'region_unknown';
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          key: regionKey,
          label: regionNode?.name ?? 'Region məlumatı yoxdur',
          regionAdmins: [], regionOperators: [], sectors: [], otherUsers: [],
        });
      }
      const rg = regionMap.get(regionKey)!;
      if (roleKey === 'regionadmin')    { rg.regionAdmins.push(user);    return; }
      if (roleKey === 'regionoperator') { rg.regionOperators.push(user); return; }
      if (!sectorNode) { rg.otherUsers.push(user); return; }
      const sectorKey = `sector_${sectorNode.id}`;
      let sg = rg.sectors.find(s => s.key === sectorKey);
      if (!sg) {
        sg = { key: sectorKey, label: sectorNode.name, sectorAdmins: [], schoolAdmins: [], otherUsers: [] };
        rg.sectors.push(sg);
      }
      if (roleKey === 'sektoradmin') { sg.sectorAdmins.push(user); return; }
      if (roleKey === 'schooladmin') { sg.schoolAdmins.push(user); return; }
      sg.otherUsers.push(user);
    });
    regionMap.forEach(g => g.sectors.sort((a, b) => a.label.localeCompare(b.label)));
    return Array.from(regionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredUsers]);

  // İlk region qrupunu avtomatik aç
  useEffect(() => {
    if (hierarchyGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set([hierarchyGroups[0].key]));
    }
  }, [hierarchyGroups.length]);

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

  const selectGroup = useCallback((users: AssignableUser[]) => {
    const ids = users.map(u => u.id.toString());
    onChange(Array.from(new Set([...value, ...ids])));
  }, [onChange, value]);

  const deselectGroup = useCallback((users: AssignableUser[]) => {
    const idsToRemove = new Set(users.map(u => u.id.toString()));
    onChange(value.filter(id => !idsToRemove.has(id)));
  }, [onChange, value]);

  const selectedList = useMemo(() =>
    value.map(id => userCache[id] ?? { id: Number(id), name: `#${id}`, email: null, is_active: true } as AssignableUser),
    [value, userCache]
  );

  // ── Alt komponentlər ──────────────────────────────────────────────────────

  const UserRow = ({ user }: { user: AssignableUser }) => {
    const checked   = value.includes(user.id.toString());
    const roleLabel = ROLE_LABELS[normalizeRole(user.role) as RoleFilterKey] ?? user.role ?? '';
    return (
      <label className={cn(
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-t border-border/20',
        checked ? 'bg-primary/5' : 'hover:bg-muted/30'
      )}>
        <Checkbox
          checked={checked}
          onCheckedChange={() => handleToggle(user.id.toString())}
          disabled={disabled}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.name}</p>
          {roleLabel && <p className="text-[11px] text-muted-foreground">{roleLabel}</p>}
        </div>
        {checked && <span className="text-[10px] text-primary font-bold shrink-0">✓</span>}
      </label>
    );
  };

  const GroupHeader = ({
    label, count, groupKey, allGroupUsers,
  }: {
    label: string; count: number; groupKey: string; allGroupUsers: AssignableUser[];
  }) => {
    const expanded       = expandedGroups.has(groupKey);
    const selectedInGroup = allGroupUsers.filter(u => value.includes(u.id.toString()));
    const allSelected    = allGroupUsers.length > 0 && selectedInGroup.length === allGroupUsers.length;
    const someSelected   = selectedInGroup.length > 0 && !allSelected;
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
        <button type="button"
          className="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={() => toggleGroup(groupKey)}
        >
          {expanded
            ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground truncate block">{label}</span>
            <span className="text-[10px] text-muted-foreground">{count} istifadəçi</span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {!allSelected && (
            <button type="button"
              onClick={() => selectGroup(allGroupUsers)}
              disabled={disabled}
              className="text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-all whitespace-nowrap"
            >
              Hamısını seç
            </button>
          )}
          {(allSelected || someSelected) && (
            <button type="button"
              onClick={() => deselectGroup(allGroupUsers)}
              disabled={disabled}
              className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-all whitespace-nowrap"
            >
              Seçimi ləğv et
            </button>
          )}
          {allSelected && <span className="text-[10px] font-semibold text-emerald-600 px-1">✓</span>}
        </div>
      </div>
    );
  };

  const RoleSubHeader = ({ label, users }: { label: string; users: AssignableUser[] }) => (
    <div className="px-4 py-1.5 bg-muted/10 flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label} ({users.length})
      </span>
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={() => selectGroup(users)}
          disabled={disabled}
          className="text-[10px] text-primary hover:underline"
        >
          Hamısını seç
        </button>
        <button type="button"
          onClick={() => deselectGroup(users)}
          disabled={disabled}
          className="text-[10px] text-red-600 hover:underline"
        >
          Hamısını sil
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-background', disabled && 'opacity-60')}>

      {/* ── Seçilmiş şəxslər strip-i ── */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5 border-b min-h-[44px] transition-colors',
        value.length > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50'
      )}>
        <div className="flex items-center gap-1.5 shrink-0">
          <Users className={cn('h-3.5 w-3.5', value.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
          <span className={cn('text-xs font-semibold', value.length > 0 ? 'text-primary' : 'text-muted-foreground')}>
            {value.length > 0 ? `${value.length} seçildi` : 'Seçilməyib'}
          </span>
        </div>
        {value.length > 0 && (
          <>
            <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
              {selectedList.slice(0, CHIP_LIMIT).map(user => (
                <span key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-primary text-[11px] font-medium border border-primary/20 max-w-[180px] shadow-sm"
                >
                  <span className="truncate">{user.name}</span>
                  <button type="button"
                    onClick={() => handleToggle(user.id.toString())}
                    className="shrink-0 text-primary/50 hover:text-primary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {value.length > CHIP_LIMIT && (
                <span className="text-[11px] text-primary/70 font-medium">
                  +{value.length - CHIP_LIMIT} daha
                </span>
              )}
            </div>
            <button type="button"
              onClick={() => onChange([])}
              className="shrink-0 text-[11px] text-primary/60 hover:text-destructive transition-colors whitespace-nowrap"
            >
              Hamısını sil
            </button>
          </>
        )}
      </div>

      {/* ── Əməkdaşlıq toggle (yalnız SuperAdmin olmayan rollar üçün) ── */}
      {showCollabToggle && (
        <div className={cn(
          'flex items-center justify-between px-3 py-2.5 border-b transition-colors',
          collabMode ? 'bg-blue-50/60 border-blue-200' : 'bg-muted/10 border-border/40'
        )}>
          <div className="flex items-center gap-2">
            <Globe className={cn('h-3.5 w-3.5', collabMode ? 'text-blue-600' : 'text-muted-foreground')} />
            <div>
              <p className={cn('text-xs font-semibold', collabMode ? 'text-blue-700' : 'text-foreground')}>
                Digər regionlarla əməkdaşlıq
              </p>
              <p className="text-[10px] text-muted-foreground">
                {collabMode ? 'Bütün regionların istifadəçiləri göstərilir' : 'Yalnız öz regionunuz göstərilir'}
              </p>
            </div>
          </div>
          <Switch
            checked={collabMode}
            onCheckedChange={checked => {
              setCollabMode(checked);
              setExpandedGroups(new Set());
            }}
            disabled={disabled}
          />
        </div>
      )}

      {/* ── Axtarış + rol filter chips ── */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, email, region və ya sektor..."
            className="pl-9 h-8 text-sm bg-muted/30 border-border/50 rounded-lg"
            disabled={disabled}
          />
          {search && (
            <button type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button type="button"
            onClick={() => setRoleFilter(null)}
            className={cn(
              'h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
              !roleFilter
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30'
            )}
          >
            Hamısı
          </button>
          {ROLE_FILTER_OPTIONS.map(({ key, label }) => (
            <button key={key} type="button"
              onClick={() => setRoleFilter(prev => prev === key ? null : key)}
              className={cn(
                'h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
                roleFilter === key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── İstifadəçi siyahısı ── */}
      <div className="min-h-[200px] max-h-[360px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yüklənir...
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <p>Yükləmə xətası</p>
            <button type="button"
              onClick={() => refetch()}
              className="text-xs text-primary underline"
            >
              Yenidən cəhd et
            </button>
          </div>
        )}

        {!isLoading && !isError && hierarchyGroups.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {search || roleFilter ? 'Uyğun istifadəçi tapılmadı' : 'İstifadəçi yoxdur'}
          </div>
        )}

        {!isLoading && !isError && hierarchyGroups.map(rg => {
          const rgExpanded = expandedGroups.has(rg.key);
          const rgAllUsers = [
            ...rg.regionAdmins, ...rg.regionOperators,
            ...rg.sectors.flatMap(s => [...s.sectorAdmins, ...s.schoolAdmins, ...s.otherUsers]),
            ...rg.otherUsers,
          ];

          return (
            <div key={rg.key} className="border-b border-border/30 last:border-0">
              <GroupHeader label={rg.label} count={rgAllUsers.length} groupKey={rg.key} allGroupUsers={rgAllUsers} />

              {rgExpanded && (
                <div>
                  {rg.regionAdmins.length > 0 && (
                    <div>
                      <RoleSubHeader label="Region Adminlər" users={rg.regionAdmins} />
                      {rg.regionAdmins.map(u => <UserRow key={u.id} user={u} />)}
                    </div>
                  )}

                  {rg.regionOperators.length > 0 && (
                    <div>
                      <RoleSubHeader label="Region Operatorlar" users={rg.regionOperators} />
                      {rg.regionOperators.map(u => <UserRow key={u.id} user={u} />)}
                    </div>
                  )}

                  {rg.sectors.map(sg => {
                    const sgKey      = `${rg.key}_${sg.key}`;
                    const sgExpanded = expandedGroups.has(sgKey);
                    const sgAllUsers = [...sg.sectorAdmins, ...sg.schoolAdmins, ...sg.otherUsers];
                    return (
                      <div key={sg.key} className="ml-3 border-l border-border/30">
                        <GroupHeader label={sg.label} count={sgAllUsers.length} groupKey={sgKey} allGroupUsers={sgAllUsers} />
                        {sgExpanded && (
                          <div>
                            {sg.sectorAdmins.length > 0 && (
                              <div>
                                <RoleSubHeader label="Sektor Adminlər" users={sg.sectorAdmins} />
                                {sg.sectorAdmins.map(u => <UserRow key={u.id} user={u} />)}
                              </div>
                            )}
                            {sg.schoolAdmins.length > 0 && (
                              <div>
                                <RoleSubHeader label="Məktəb Adminlər" users={sg.schoolAdmins} />
                                {sg.schoolAdmins.map(u => <UserRow key={u.id} user={u} />)}
                              </div>
                            )}
                            {sg.otherUsers.map(u => <UserRow key={u.id} user={u} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {rg.otherUsers.map(u => <UserRow key={u.id} user={u} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
