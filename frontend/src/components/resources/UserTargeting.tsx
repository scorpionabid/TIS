import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Search, X, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AssignableUser } from '@/services/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { resourceService } from '@/services/resources';

interface UserTargetingProps {
  form: any;
}

const EMPTY_USER_IDS: number[] = [];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'SuperAdmin',
  regionadmin: 'RegionAdmin',
  regionoperator: 'RegionOperator',
  sektoradmin: 'SektorAdmin',
  sektoroperator: 'SektorOperator',
  schooladmin: 'SchoolAdmin',
  teacher: 'Müəllim',
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-purple-100 text-purple-800',
  regionadmin: 'bg-blue-100 text-blue-800',
  regionoperator: 'bg-sky-100 text-sky-800',
  sektoradmin: 'bg-green-100 text-green-800',
  sektoroperator: 'bg-emerald-100 text-emerald-800',
  schooladmin: 'bg-amber-100 text-amber-800',
  teacher: 'bg-orange-100 text-orange-800',
};

const normalizeRole = (role?: string | { name?: string | null } | null) => {
  if (!role) return '';
  if (typeof role === 'string') {
    return role.trim().toLowerCase();
  }
  if (typeof role === 'object' && role.name) {
    return role.name.trim().toLowerCase();
  }
  return '';
};

type RoleFilterKey = 'regionadmin' | 'regionoperator' | 'sektoradmin' | 'schooladmin';

const ROLE_FILTER_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: 'regionadmin', label: 'RegionAdmin' },
  { key: 'regionoperator', label: 'RegionOperator' },
  { key: 'sektoradmin', label: 'SektorAdmin' },
  { key: 'schooladmin', label: 'SchoolAdmin' },
];

interface HierarchyNode {
  id: number;
  name: string;
  level: number | null;
}

interface RegionGroup {
  key: string;
  label: string;
  regionAdmins: AssignableUser[];
  regionOperators: AssignableUser[];
  sectors: SectorGroup[];
  otherUsers: AssignableUser[];
}

interface SectorGroup {
  key: string;
  label: string;
  sectorAdmins: AssignableUser[];
  schoolAdmins: AssignableUser[];
  otherUsers: AssignableUser[];
}

const extractHierarchyInfo = (user: AssignableUser) => {
  const path: HierarchyNode[] = Array.isArray(user.institution?.hierarchy_path)
    ? user.institution!.hierarchy_path
    : [];
  const regionNode = path.find((node) => node.level === 2) || (user.institution?.level === 2 ? {
    id: user.institution.id,
    name: user.institution.name,
    level: 2,
  } : undefined);
  const sectorNode = path.find((node) => node.level === 3) || (user.institution?.level === 3 ? {
    id: user.institution.id,
    name: user.institution.name,
    level: 3,
  } : undefined);
  const institutionNode = path[path.length - 1] || (user.institution
    ? {
        id: user.institution.id,
        name: user.institution.name,
        level: user.institution.level ?? null,
      }
    : undefined);
  return { regionNode, sectorNode, institutionNode };
};

export function UserTargeting({ form }: UserTargetingProps) {
  const { currentUser } = useAuth();
  const [userSearch, setUserSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [roleFilters, setRoleFilters] = useState<Set<RoleFilterKey>>(new Set());
  const roleFilterArray = useMemo(() => Array.from(roleFilters), [roleFilters]);
  const singleRoleFilter = roleFilterArray.length === 1 ? roleFilterArray[0] : undefined;

  const { data: assignableUsers = [], isLoading, error: userLoadError } = useQuery({
    queryKey: ['resource-target-users', currentUser?.role, singleRoleFilter ?? 'all'],
    queryFn: () => resourceService.getTargetUsers({
      role: singleRoleFilter,
      per_page: singleRoleFilter ? 200 : 200,
    }),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const roleSummary = useMemo(() => {
    return assignableUsers.reduce<Record<string, number>>((acc, user) => {
      const key = normalizeRole(user.role) || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [assignableUsers]);

  useEffect(() => {
    if (!assignableUsers.length) return;
    const sample = assignableUsers.slice(0, 5).map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      normalizedRole: normalizeRole(user.role),
      institution: user.institution?.name,
    }));
    console.groupCollapsed('[UserTargeting] Assignable users loaded');
    console.log('Total users:', assignableUsers.length);
    console.log('Role summary:', roleSummary);
    console.log('Sample users:', sample);
    console.groupEnd();
  }, [assignableUsers, roleSummary]);

  const watchedTargetUsers = form.watch('target_users');
  const selectedUserIds: number[] = useMemo(() => {
    if (Array.isArray(watchedTargetUsers)) {
      return watchedTargetUsers;
    }
    return EMPTY_USER_IDS;
  }, [watchedTargetUsers]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.toLowerCase().trim();
    const activeRoleFilters = roleFilters;

    return assignableUsers.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.institution?.name || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeRoleFilters.size === 0) return true;

      const roleKey = normalizeRole(user.role) as RoleFilterKey;
      return activeRoleFilters.has(roleKey);
    });
  }, [assignableUsers, roleFilters, userSearch]);

  useEffect(() => {
    if (!roleFilters.size) return;
    const active = Array.from(roleFilters);
    console.log('[UserTargeting] Role filters applied', {
      activeFilters: active,
      availableForFilters: active.reduce<Record<string, number>>((acc, role) => {
        acc[role] = roleSummary[role] || 0;
        return acc;
      }, {}),
      filteredUserCount: filteredUsers.length,
    });
  }, [roleFilters, filteredUsers.length, roleSummary]);

  useEffect(() => {
    if (!assignableUsers.length) return;
    const missingRoleOptions = ROLE_FILTER_OPTIONS.filter(
      (option) => !roleSummary[option.key]
    );
    if (missingRoleOptions.length) {
      console.info('[UserTargeting] Role filters without backing data', {
        missing: missingRoleOptions.map((option) => option.key),
        allRoleSummary: roleSummary,
      });
    }
  }, [assignableUsers.length, roleSummary]);

  const hierarchyGroups = useMemo(() => {
    const regionMap = new Map<string, RegionGroup>();

    filteredUsers.forEach((user) => {
      const { regionNode, sectorNode } = extractHierarchyInfo(user);
      const roleKey = normalizeRole(user.role);
      const regionKey = regionNode ? `region_${regionNode.id}` : 'region_unknown';
      const regionLabel = regionNode?.name || 'Region məlumatı yoxdur';

      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          key: regionKey,
          label: regionLabel,
          regionAdmins: [],
          regionOperators: [],
          sectors: [],
          otherUsers: [],
        });
      }

      const regionGroup = regionMap.get(regionKey)!;

      if (roleKey === 'regionadmin') {
        regionGroup.regionAdmins.push(user);
        return;
      }
      if (roleKey === 'regionoperator') {
        regionGroup.regionOperators.push(user);
        return;
      }

      if (!sectorNode) {
        regionGroup.otherUsers.push(user);
        return;
      }

      const sectorKey = `sector_${sectorNode.id}`;
      let sectorGroup = regionGroup.sectors.find((sector) => sector.key === sectorKey);
      if (!sectorGroup) {
        sectorGroup = {
          key: sectorKey,
          label: sectorNode.name,
          sectorAdmins: [],
          schoolAdmins: [],
          otherUsers: [],
        };
        regionGroup.sectors.push(sectorGroup);
      }

      if (roleKey === 'sektoradmin') {
        sectorGroup.sectorAdmins.push(user);
        return;
      }
      if (roleKey === 'schooladmin') {
        sectorGroup.schoolAdmins.push(user);
        return;
      }

      sectorGroup.otherUsers.push(user);
    });

    // Sort sectors alphabetically within each region
    regionMap.forEach((group) => {
      group.sectors.sort((a, b) => a.label.localeCompare(b.label));
    });

    return Array.from(regionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredUsers]);

  const handleToggleUser = useCallback((userId: number, checked: boolean) => {
    if (checked) {
      form.setValue('target_users', [...new Set([...selectedUserIds, userId])]);
    } else {
      form.setValue('target_users', selectedUserIds.filter((id: number) => id !== userId));
    }
  }, [form, selectedUserIds]);

  const selectAllFiltered = useCallback(() => {
    const ids = filteredUsers.map((user) => user.id);
    form.setValue('target_users', [...new Set([...selectedUserIds, ...ids])]);
  }, [filteredUsers, form, selectedUserIds]);

  const clearSelection = useCallback(() => {
    form.setValue('target_users', []);
  }, [form]);

  const getInstitutionPath = (user: AssignableUser) => {
    if (user.institution?.hierarchy_path?.length) {
      return user.institution.hierarchy_path.map((node) => node.name).join(' / ');
    }
    return user.institution?.name || 'Müəssisə göstərilməyib';
  };

  const renderUserRow = (user: AssignableUser) => {
    const checked = selectedUserIds.includes(user.id);
    const roleKey = normalizeRole(user.role);
    const label = ROLE_LABELS[roleKey] || user.role || 'Naməlum rol';

    return (
      <label
        key={user.id}
        className="flex items-start gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(next) => handleToggleUser(user.id, next === true)}
        />
        <div className="flex-1">
          <p className="text-sm font-medium">{user.name}</p>
          {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
          <p className="text-xs text-muted-foreground">{getInstitutionPath(user)}</p>
          <Badge className={`text-xs mt-1 ${ROLE_COLORS[roleKey] || 'bg-gray-100 text-gray-800'}`}>
            {label}
          </Badge>
        </div>
      </label>
    );
  };

  const renderUserList = (users: AssignableUser[]) => {
    if (users.length === 0) return null;

    return (
      <div className="space-y-1 mt-2">
        {users.map(renderUserRow)}
      </div>
    );
  };

  const selectUsers = (users: AssignableUser[]) => {
    const ids = users.map((user) => user.id);
    form.setValue('target_users', [...new Set([...selectedUserIds, ...ids])]);
  };

  const toggleRoleFilter = (key: RoleFilterKey) => {
    setRoleFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setUserSearch('');
    setRegionSearch('');
    setRoleFilters(new Set());
  };

  const visibleHierarchyGroups = useMemo(() => {
    const term = regionSearch.toLowerCase().trim();
    if (!term) {
      return hierarchyGroups;
    }

    return hierarchyGroups
      .map((group) => {
        const matchesRegion = group.label.toLowerCase().includes(term);
        const filteredSectors = group.sectors
          .map((sector) => ({
            ...sector,
            sectorAdmins: sector.sectorAdmins,
            schoolAdmins: sector.schoolAdmins,
            otherUsers: sector.otherUsers,
          }))
          .filter((sector) =>
            sector.label.toLowerCase().includes(term)
          );

        if (matchesRegion) {
          return group;
        }

        if (filteredSectors.length > 0) {
          return {
            ...group,
            sectors: filteredSectors,
          };
        }

        return null;
      })
      .filter((group): group is RegionGroup => !!group);
  }, [hierarchyGroups, regionSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-green-500" />
          İstifadəçiləri seçin
        </Label>
        {selectedUserIds.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            {selectedUserIds.length} seçildi
          </Badge>
        )}
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Filtrlər</h4>
          <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
            Hamısını sıfırla
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Label className="text-xs text-muted-foreground mb-1 block">
              İstifadəçi axtarışı
            </Label>
            <Input
              type="text"
              placeholder="Ad, email və ya müəssisə adı..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="relative">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Region/Sektor axtarışı
            </Label>
            <Input
              type="text"
              placeholder="Region və ya sektor adı..."
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            {regionSearch && (
              <button
                type="button"
                onClick={() => setRegionSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Rollar
          </Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTER_OPTIONS.map(({ key, label }) => {
              const active = roleFilters.has(key);
              return (
                <Button
                  key={key}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleRoleFilter(key)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAllFiltered}
          disabled={filteredUsers.length === 0}
        >
          <Users className="h-4 w-4 mr-2" />
          Hamısını seç ({filteredUsers.length})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSelection}
          disabled={selectedUserIds.length === 0}
        >
          <X className="h-4 w-4 mr-2" />
          Seçimi təmizlə
        </Button>
      </div>

      {userLoadError ? (
        <div className="text-sm text-destructive">
          İstifadəçilər yüklənmədi: {(userLoadError as Error)?.message || 'Giriş icazəsi tələb olunur'}
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">İstifadəçilər yüklənir...</div>
      ) : visibleHierarchyGroups.length === 0 ? (
        <div className="text-sm text-muted-foreground">İstifadəçi tapılmadı</div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {visibleHierarchyGroups.map((regionGroup) => (
            <AccordionItem key={regionGroup.key} value={regionGroup.key} className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 text-left">
                <div className="flex flex-col text-left">
                  <span className="font-semibold">{regionGroup.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {regionGroup.regionAdmins.length +
                    regionGroup.regionOperators.length +
                    regionGroup.sectors.reduce(
                      (total, sector) =>
                        total + sector.sectorAdmins.length + sector.schoolAdmins.length + sector.otherUsers.length,
                      0
                    ) +
                    regionGroup.otherUsers.length}{' '}
                    istifadəçi
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {regionGroup.regionAdmins.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Region Adminlər</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => selectUsers(regionGroup.regionAdmins)}
                      >
                        Hamısını seç
                      </Button>
                    </div>
                    {renderUserList(regionGroup.regionAdmins)}
                  </div>
                )}

                {regionGroup.regionOperators.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Region Operatorlar</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => selectUsers(regionGroup.regionOperators)}
                      >
                        Hamısını seç
                      </Button>
                    </div>
                    {renderUserList(regionGroup.regionOperators)}
                  </div>
                )}

                {regionGroup.sectors.map((sector) => (
                  <div key={sector.key} className="mb-4 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{sector.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {sector.sectorAdmins.length + sector.schoolAdmins.length + sector.otherUsers.length} istifadəçi
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectUsers([
                          ...sector.sectorAdmins,
                          ...sector.schoolAdmins,
                          ...sector.otherUsers,
                        ])}
                      >
                        Hamısını seç
                      </Button>
                    </div>

                    {sector.sectorAdmins.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Sektor Adminləri</p>
                        {renderUserList(sector.sectorAdmins)}
                      </div>
                    )}

                    {sector.schoolAdmins.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Məktəb Adminləri</p>
                        {renderUserList(sector.schoolAdmins)}
                      </div>
                    )}

                    {sector.otherUsers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">Digər istifadəçilər</p>
                        {renderUserList(sector.otherUsers)}
                      </div>
                    )}
                  </div>
                ))}

                {regionGroup.otherUsers.length > 0 && (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Digər istifadəçilər</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => selectUsers(regionGroup.otherUsers)}
                      >
                        Hamısını seç
                      </Button>
                    </div>
                    {renderUserList(regionGroup.otherUsers)}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
