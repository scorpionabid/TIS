import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Users, Building2, Shield, Briefcase, Globe, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { institutionService } from '@/services/institutions';
import { userService } from '@/services/users';

export interface LinkFilterParams {
  status?: 'active' | 'disabled' | 'expired' | 'all';
  assignmentType?: 'all' | 'institutions' | 'roles' | 'users' | 'departments' | 'public';
  target_institution_id?: number;
  target_role_id?: number;
  target_user_id?: number;
  target_department_id?: number;
  link_type?: string;
  share_scope?: string;
}

interface LinkAdvancedFiltersProps {
  filters: LinkFilterParams;
  onFiltersChange: (filters: LinkFilterParams) => void;
  linkCounts?: {
    all: number;
    institutions: number;
    roles: number;
    users: number;
    departments: number;
    public: number;
  };
}

export function LinkAdvancedFilters({ filters, onFiltersChange, linkCounts }: LinkAdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<LinkFilterParams>(filters);

  // Sync local filters with prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch institutions for dropdown
  const { data: institutionsData } = useQuery({
    queryKey: ['institutions-for-filter'],
    queryFn: () => institutionService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch users for dropdown (limited to 100 for performance)
  const { data: usersData } = useQuery({
    queryKey: ['users-for-filter'],
    queryFn: () => userService.getAll({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const institutions = institutionsData?.data || [];
  const users = usersData?.data || [];

  const roles = [
    { id: 1, name: 'SuperAdmin', display_name: 'SuperAdmin' },
    { id: 2, name: 'RegionAdmin', display_name: 'Region Admini' },
    { id: 3, name: 'RegionOperator', display_name: 'Region Operatoru' },
    { id: 4, name: 'SektorAdmin', display_name: 'Sektor Admini' },
    { id: 5, name: 'SchoolAdmin', display_name: 'Məktəb Admini' },
    { id: 6, name: 'Müəllim', display_name: 'Müəllim' },
  ];

  // Group users by role for better UX - prioritize high-level roles
  const usersByRole = useMemo(() => {
    const grouped: Record<string, Array<any>> = {
      'SuperAdmin': [],
      'RegionAdmin': [],
      'RegionOperator': [],
      'SektorAdmin': [],
      'SchoolAdmin': [],
      'Müəllim': [],
      'Other': [],
    };

    users.forEach((user: any) => {
      // Get the user's primary role (first role or from role_id)
      const userRole = user.roles?.[0]?.name || user.role?.name || 'Other';

      // Map role names to display categories
      const roleCategory =
        userRole === 'superadmin' ? 'SuperAdmin' :
        userRole === 'regionadmin' ? 'RegionAdmin' :
        userRole === 'regionoperator' ? 'RegionOperator' :
        userRole === 'sektoradmin' ? 'SektorAdmin' :
        userRole === 'schooladmin' ? 'SchoolAdmin' :
        userRole === 'müəllim' ? 'Müəllim' : 'Other';

      if (grouped[roleCategory]) {
        grouped[roleCategory].push(user);
      } else {
        grouped['Other'].push(user);
      }
    });

    // Sort users within each group by name
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return grouped;
  }, [users]);

  const handleAssignmentTypeChange = (type: LinkFilterParams['assignmentType']) => {
    const newFilters: LinkFilterParams = {
      ...localFilters,
      assignmentType: type,
      // Clear sub-filters when changing assignment type
      target_institution_id: undefined,
      target_role_id: undefined,
      target_user_id: undefined,
      target_department_id: undefined,
    };

    // Set share_scope based on assignment type
    if (type === 'public') {
      newFilters.share_scope = 'public';
    } else {
      newFilters.share_scope = undefined;
    }

    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSubFilterChange = (key: keyof LinkFilterParams, value: any) => {
    const newFilters = {
      ...localFilters,
      [key]: value === 'all' || value === '' ? undefined : value,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters: LinkFilterParams = {
      status: 'all',
      assignmentType: 'all',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = [
    localFilters.status && localFilters.status !== 'all',
    localFilters.assignmentType && localFilters.assignmentType !== 'all',
    localFilters.target_institution_id,
    localFilters.target_role_id,
    localFilters.target_user_id,
    localFilters.target_department_id,
    localFilters.link_type,
    localFilters.share_scope && localFilters.share_scope !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="border rounded-lg bg-card">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Təkmilləşdirilmiş Filtrlər</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} aktiv filtr
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 border-t space-y-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'disabled', 'expired'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={localFilters.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSubFilterChange('status', status)}
                  >
                    {status === 'all' && 'Hamısı'}
                    {status === 'active' && 'Aktiv'}
                    {status === 'disabled' && 'Passiv'}
                    {status === 'expired' && 'Müddəti keçib'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assignment Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Təyin Növü
              </Label>
              <div className="flex flex-wrap gap-2">
                {/* Hamısı */}
                <Button
                  variant={localFilters.assignmentType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAssignmentTypeChange('all')}
                  className="gap-2"
                >
                  <Globe className="h-3 w-3" />
                  Hamısı
                </Button>

                {/* Müəssisələrə */}
                <Button
                  variant={localFilters.assignmentType === 'institutions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAssignmentTypeChange('institutions')}
                  className="gap-2"
                >
                  <Building2 className="h-3 w-3" />
                  Müəssisələrə
                </Button>

                {/* RegionAdmin-lərə - High Priority */}
                <Button
                  variant={localFilters.target_role_id === 2 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newFilters: LinkFilterParams = {
                      ...localFilters,
                      assignmentType: 'roles',
                      target_role_id: 2,
                      target_user_id: undefined,
                      target_institution_id: undefined,
                      target_department_id: undefined,
                    };
                    setLocalFilters(newFilters);
                    onFiltersChange(newFilters);
                  }}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Shield className="h-3 w-3" />
                  🔵 RegionAdmin-lərə
                </Button>

                {/* RegionOperator-lara */}
                <Button
                  variant={localFilters.target_role_id === 3 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newFilters: LinkFilterParams = {
                      ...localFilters,
                      assignmentType: 'roles',
                      target_role_id: 3,
                      target_user_id: undefined,
                      target_institution_id: undefined,
                      target_department_id: undefined,
                    };
                    setLocalFilters(newFilters);
                    onFiltersChange(newFilters);
                  }}
                  className="gap-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                >
                  <Shield className="h-3 w-3" />
                  🔷 RegionOperator-lara
                </Button>

                {/* SektorAdmin-lərə - Medium Priority */}
                <Button
                  variant={localFilters.target_role_id === 4 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newFilters: LinkFilterParams = {
                      ...localFilters,
                      assignmentType: 'roles',
                      target_role_id: 4,
                      target_user_id: undefined,
                      target_institution_id: undefined,
                      target_department_id: undefined,
                    };
                    setLocalFilters(newFilters);
                    onFiltersChange(newFilters);
                  }}
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Shield className="h-3 w-3" />
                  🟢 SektorAdmin-lərə
                </Button>

                {/* Digər Rollara */}
                <Button
                  variant={localFilters.assignmentType === 'roles' && !localFilters.target_role_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAssignmentTypeChange('roles')}
                  className="gap-2"
                >
                  <Shield className="h-3 w-3" />
                  Digər Rollara
                </Button>

                {/* Konkret İstifadəçilərə */}
                <Button
                  variant={localFilters.assignmentType === 'users' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAssignmentTypeChange('users')}
                  className="gap-2"
                >
                  <Users className="h-3 w-3" />
                  Konkret İstifadəçilərə
                </Button>
              </div>
            </div>

            {/* Sub-filters based on assignment type */}
            {localFilters.assignmentType === 'institutions' && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label className="text-sm">Müəssisə seçin</Label>
                <Select
                  value={localFilters.target_institution_id?.toString() || 'all'}
                  onValueChange={(value) => handleSubFilterChange('target_institution_id', value === 'all' ? undefined : Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Müəssisə seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {institutions.map((inst: any) => (
                      <SelectItem key={inst.id} value={inst.id.toString()}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Digər Rollara sub-filter - only show if "Digər Rollara" was clicked */}
            {localFilters.assignmentType === 'roles' && !localFilters.target_role_id && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label className="text-sm">Rol seçin (SuperAdmin, SchoolAdmin, Müəllim)</Label>
                <Select
                  value={localFilters.target_role_id?.toString() || 'all'}
                  onValueChange={(value) => handleSubFilterChange('target_role_id', value === 'all' ? undefined : Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rol seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {localFilters.assignmentType === 'users' && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label className="text-sm">İstifadəçi seçin</Label>
                <Select
                  value={localFilters.target_user_id?.toString() || 'all'}
                  onValueChange={(value) => handleSubFilterChange('target_user_id', value === 'all' ? undefined : Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="İstifadəçi seçin..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    <SelectItem value="all">Hamısı</SelectItem>

                    {/* SuperAdmin - Highest Priority */}
                    {usersByRole['SuperAdmin'].length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-red-600">
                          🔴 SuperAdmin ({usersByRole['SuperAdmin'].length})
                        </SelectLabel>
                        {usersByRole['SuperAdmin'].map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {/* RegionAdmin - High Priority */}
                    {usersByRole['RegionAdmin'].length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-blue-600">
                          🔵 Region Admini ({usersByRole['RegionAdmin'].length})
                        </SelectLabel>
                        {usersByRole['RegionAdmin'].map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {/* RegionOperator */}
                    {usersByRole['RegionOperator'].length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-cyan-600">
                          🔷 Region Operatoru ({usersByRole['RegionOperator'].length})
                        </SelectLabel>
                        {usersByRole['RegionOperator'].map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {/* SektorAdmin - Medium Priority */}
                    {usersByRole['SektorAdmin'].length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-green-600">
                          🟢 Sektor Admini ({usersByRole['SektorAdmin'].length})
                        </SelectLabel>
                        {usersByRole['SektorAdmin'].map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {/* Note: SchoolAdmin və Müəllim qrupları gizlədilib */}
                    {/* Çünki link assignment üçün yüksək səviyyəli rollar prioritetdir */}

                    {/* Other Roles */}
                    {usersByRole['Other'].length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-gray-400">
                          Digər ({usersByRole['Other'].length})
                        </SelectLabel>
                        {usersByRole['Other'].map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}


            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Bütün filterləri sıfırla
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
