import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Search, X, Users, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AssignableUser } from '@/services/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { resourceService } from '@/services/resources';

interface UserTargetingProps {
  form: any;
}

const EMPTY_USER_IDS: number[] = [];

const ROLE_LABELS: Record<string, string> = {
  superadmin:     'SuperAdmin',
  regionadmin:    'RegionAdmin',
  regionoperator: 'RegionOperator',
  sektoradmin:    'SektorAdmin',
  schooladmin:    'SchoolAdmin',
  teacher:        'Müəllim',
};

type RoleFilterKey = 'regionadmin' | 'regionoperator' | 'sektoradmin' | 'schooladmin';

const ROLE_FILTER_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: 'regionadmin',    label: 'RegionAdmin'    },
  { key: 'regionoperator', label: 'RegionOperator' },
  { key: 'sektoradmin',    label: 'SektorAdmin'    },
  { key: 'schooladmin',    label: 'SchoolAdmin'    },
];

const normalizeRole = (role?: string | { name?: string | null } | null) => {
  if (!role) return '';
  if (typeof role === 'string') return role.trim().toLowerCase();
  if (typeof role === 'object' && role.name) return role.name.trim().toLowerCase();
  return '';
};

interface HierarchyNode { id: number; name: string; level: number | null; }

interface SectorGroup {
  key: string; label: string;
  sectorAdmins: AssignableUser[]; schoolAdmins: AssignableUser[]; otherUsers: AssignableUser[];
}
interface RegionGroup {
  key: string; label: string;
  regionAdmins: AssignableUser[]; regionOperators: AssignableUser[];
  sectors: SectorGroup[]; otherUsers: AssignableUser[];
}

const extractHierarchyInfo = (user: AssignableUser) => {
  const path: HierarchyNode[] = Array.isArray(user.institution?.hierarchy_path)
    ? user.institution!.hierarchy_path : [];
  const regionNode = path.find(n => n.level === 2) ||
    (user.institution?.level === 2 ? { id: user.institution.id, name: user.institution.name, level: 2 } : undefined);
  const sectorNode = path.find(n => n.level === 3) ||
    (user.institution?.level === 3 ? { id: user.institution.id, name: user.institution.name, level: 3 } : undefined);
  return { regionNode, sectorNode };
};

const CHIP_LIMIT = 5;

export function UserTargeting({ form }: UserTargetingProps) {
  const { currentUser } = useAuth();
  const [search, setSearch]         = useState('');
  const [roleFilters, setRoleFilters] = useState<Set<RoleFilterKey>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const singleRoleFilter = roleFilters.size === 1 ? Array.from(roleFilters)[0] : undefined;

  const { data: assignableUsers = [], isLoading } = useQuery({
    queryKey: ['resource-target-users', currentUser?.role, singleRoleFilter ?? 'all'],
    queryFn: () => resourceService.getTargetUsers({ role: singleRoleFilter, per_page: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const watchedTargetUsers = form.watch('target_users');
  const selectedUserIds: number[] = useMemo(() =>
    Array.isArray(watchedTargetUsers)
      ? watchedTargetUsers.map((id: any) => Number(id)).filter(id => !isNaN(id))
      : EMPTY_USER_IDS,
    [watchedTargetUsers]
  );

  // Cache user objects for chip display
  const [userCache, setUserCache] = useState<Record<number, AssignableUser>>({});

  // Ana siyahı yüklənəndə cache-i doldur
  useEffect(() => {
    if (!assignableUsers.length) return;
    setUserCache(prev => {
      const next = { ...prev };
      assignableUsers.forEach(u => { next[u.id] = u; });
      return next;
    });
  }, [assignableUsers]);

  const selectedUsers = useMemo(() =>
    selectedUserIds.map(id => userCache[id] ?? { id, name: `#${id}`, email: null, is_active: true } as AssignableUser),
    [selectedUserIds, userCache]
  );

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assignableUsers.filter(user => {
      const matchesSearch = !q ||
        user.name.toLowerCase().includes(q) ||
        (user.email || '').toLowerCase().includes(q) ||
        (user.institution?.name || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (!roleFilters.size) return true;
      return roleFilters.has(normalizeRole(user.role) as RoleFilterKey);
    });
  }, [assignableUsers, roleFilters, search]);

  const hierarchyGroups = useMemo<RegionGroup[]>(() => {
    const regionMap = new Map<string, RegionGroup>();
    filteredUsers.forEach(user => {
      const { regionNode, sectorNode } = extractHierarchyInfo(user);
      const roleKey   = normalizeRole(user.role);
      const regionKey = regionNode ? `region_${regionNode.id}` : 'region_unknown';
      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          key: regionKey, label: regionNode?.name ?? 'Region məlumatı yoxdur',
          regionAdmins: [], regionOperators: [], sectors: [], otherUsers: [],
        });
      }
      const rg = regionMap.get(regionKey)!;
      if (roleKey === 'regionadmin')    { rg.regionAdmins.push(user); return; }
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

  // Auto-expand first group
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

  const handleToggle = useCallback((userId: number, checked: boolean) => {
    form.setValue('target_users',
      checked ? [...new Set([...selectedUserIds, userId])]
              : selectedUserIds.filter((id: number) => id !== userId)
    );
  }, [form, selectedUserIds]);

  const handleRemoveSelected = useCallback((userId: number) => {
    form.setValue('target_users', selectedUserIds.filter((id: number) => id !== userId));
  }, [form, selectedUserIds]);

  const handleClearAll = useCallback(() => form.setValue('target_users', []), [form]);

  const selectGroup = useCallback((users: AssignableUser[]) => {
    const ids = users.map(u => u.id);
    form.setValue('target_users', [...new Set([...selectedUserIds, ...ids])]);
  }, [form, selectedUserIds]);

  const toggleRole = (key: RoleFilterKey) => {
    setRoleFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const UserRow = ({ user }: { user: AssignableUser }) => {
    const checked  = selectedUserIds.includes(user.id);
    const roleKey  = normalizeRole(user.role);
    const roleLabel = ROLE_LABELS[roleKey] || user.role || '';
    return (
      <label className={cn(
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-t border-border/20',
        checked ? 'bg-primary/5' : 'hover:bg-muted/30'
      )}>
        <Checkbox checked={checked} onCheckedChange={v => handleToggle(user.id, v === true)} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.name}</p>
          {roleLabel && <p className="text-[11px] text-muted-foreground">{roleLabel}</p>}
        </div>
        {checked && <span className="text-[10px] text-primary font-bold shrink-0">✓</span>}
      </label>
    );
  };

  const GroupHeader = ({ label, count, groupKey, allUsers }: { label: string; count: number; groupKey: string; allUsers: AssignableUser[] }) => {
    const expanded = expandedGroups.has(groupKey);
    const allSelected = allUsers.length > 0 && allUsers.every(u => selectedUserIds.includes(u.id));
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
        <button type="button" className="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={() => toggleGroup(groupKey)}>
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          }
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground truncate block">{label}</span>
            <span className="text-[10px] text-muted-foreground">{count} istifadəçi</span>
          </div>
        </button>
        {!allSelected ? (
          <button type="button" onClick={() => selectGroup(allUsers)}
            className="shrink-0 text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-all whitespace-nowrap">
            Hamısını seç
          </button>
        ) : (
          <span className="shrink-0 text-[10px] font-semibold text-emerald-600 px-2">✓ Hamısı</span>
        )}
      </div>
    );
  };

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-background')}>

      {/* ── Selected strip ── */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b min-h-[44px] transition-colors ${
        selectedUserIds.length > 0 ? 'bg-violet-50/60 border-violet-200' : 'bg-muted/30 border-border/50'
      }`}>
        <div className="flex items-center gap-1.5 shrink-0">
          <User className={`h-3.5 w-3.5 ${selectedUserIds.length > 0 ? 'text-violet-600' : 'text-muted-foreground'}`} />
          <span className={`text-xs font-semibold ${selectedUserIds.length > 0 ? 'text-violet-700' : 'text-muted-foreground'}`}>
            {selectedUserIds.length > 0 ? `${selectedUserIds.length} istifadəçi seçilib` : 'Seçilməyib'}
          </span>
        </div>
        {selectedUserIds.length > 0 && (
          <>
            <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
              {selectedUsers.slice(0, CHIP_LIMIT).map(user => {
                const loaded = !user.name.startsWith('İstifadəçi #');
                return (
                  <span key={user.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-violet-700 text-[11px] font-medium border border-violet-200 max-w-[180px] shadow-sm">
                    <span className="truncate">{loaded ? user.name : `ID: ${user.id}`}</span>
                    <button type="button" onClick={() => handleRemoveSelected(user.id)}
                      className="shrink-0 text-violet-400 hover:text-violet-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {selectedUserIds.length > CHIP_LIMIT && (
                <span className="text-[11px] text-violet-600 font-medium">
                  +{selectedUserIds.length - CHIP_LIMIT} daha
                </span>
              )}
            </div>
            <button type="button" onClick={handleClearAll}
              className="shrink-0 text-[11px] text-violet-600/70 hover:text-red-600 transition-colors whitespace-nowrap">
              Hamısını sil
            </button>
          </>
        )}
      </div>

      {/* ── Search + role chips ── */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, email, region və ya sektor..."
            className="pl-9 h-8 text-sm bg-muted/30 border-border/50 rounded-lg"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button type="button" onClick={() => setRoleFilters(new Set())}
            className={cn('h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
              !roleFilters.size
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30')}>
            Hamısı
          </button>
          {ROLE_FILTER_OPTIONS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => toggleRole(key)}
              className={cn('h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
                roleFilters.has(key)
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hierarchy list ── */}
      <div className="min-h-[200px] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Yüklənir...
          </div>
        )}

        {!isLoading && hierarchyGroups.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search || roleFilters.size ? 'Uyğun istifadəçi tapılmadı' : 'İstifadəçi yoxdur'}
          </div>
        )}

        {!isLoading && hierarchyGroups.map(rg => {
          const rgExpanded  = expandedGroups.has(rg.key);
          const rgAllUsers  = [
            ...rg.regionAdmins, ...rg.regionOperators,
            ...rg.sectors.flatMap(s => [...s.sectorAdmins, ...s.schoolAdmins, ...s.otherUsers]),
            ...rg.otherUsers,
          ];
          const rgCount = rgAllUsers.length;

          return (
            <div key={rg.key} className="border-b border-border/30 last:border-0">
              <GroupHeader label={rg.label} count={rgCount} groupKey={rg.key} allUsers={rgAllUsers} />

              {rgExpanded && (
                <div>
                  {/* RegionAdmins */}
                  {rg.regionAdmins.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-muted/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Region Adminlər ({rg.regionAdmins.length})
                        </span>
                        <button type="button" onClick={() => selectGroup(rg.regionAdmins)}
                          className="text-[10px] text-primary hover:underline">Hamısını seç</button>
                      </div>
                      {rg.regionAdmins.map(u => <UserRow key={u.id} user={u} />)}
                    </div>
                  )}

                  {/* RegionOperators */}
                  {rg.regionOperators.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-muted/10 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Region Operatorlar ({rg.regionOperators.length})
                        </span>
                        <button type="button" onClick={() => selectGroup(rg.regionOperators)}
                          className="text-[10px] text-primary hover:underline">Hamısını seç</button>
                      </div>
                      {rg.regionOperators.map(u => <UserRow key={u.id} user={u} />)}
                    </div>
                  )}

                  {/* Sectors */}
                  {rg.sectors.map(sg => {
                    const sgKey      = `${rg.key}_${sg.key}`;
                    const sgExpanded = expandedGroups.has(sgKey);
                    const sgAllUsers = [...sg.sectorAdmins, ...sg.schoolAdmins, ...sg.otherUsers];
                    return (
                      <div key={sg.key} className="ml-3 border-l border-border/30">
                        <GroupHeader label={sg.label} count={sgAllUsers.length}
                          groupKey={sgKey} allUsers={sgAllUsers} />
                        {sgExpanded && (
                          <div>
                            {sg.sectorAdmins.length > 0 && (
                              <div>
                                <div className="px-4 py-1 bg-muted/10">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    Sektor Adminlər
                                  </span>
                                </div>
                                {sg.sectorAdmins.map(u => <UserRow key={u.id} user={u} />)}
                              </div>
                            )}
                            {sg.schoolAdmins.length > 0 && (
                              <div>
                                <div className="px-4 py-1 bg-muted/10">
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    Məktəb Adminlər
                                  </span>
                                </div>
                                {sg.schoolAdmins.map(u => <UserRow key={u.id} user={u} />)}
                              </div>
                            )}
                            {sg.otherUsers.map(u => <UserRow key={u.id} user={u} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Other users */}
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
