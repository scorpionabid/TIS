import { useState, useMemo, memo } from 'react';
import { Search, Check, Building2, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAvailableRecipients } from '@/hooks/messages/useMessages';
import { useQuery } from '@tanstack/react-query';
import { institutionService } from '@/services/institutions';
import { getRoleDisplayName, type UserRole } from '@/constants/roles';
import type { AvailableRecipient } from '@/types/message';
import { RoleBadge } from './RoleBadge';
import { useRoleCheck } from '@/hooks/useRoleCheck';

interface HierarchicalRecipientSelectorProps {
  selectedUsers: number[];
  selectedInstitutions: number[];
  onUserChange: (ids: number[]) => void;
  onInstitutionChange: (ids: number[]) => void;
}

// Rola görə filtr seçimləri (yalnız RegionAdmin/RegionOperator üçün)
type RoleFilter = 'all' | 'sektoradmin' | 'schooladmin';

export function HierarchicalRecipientSelector({
  selectedUsers,
  selectedInstitutions,
  onUserChange,
  onInstitutionChange,
}: HierarchicalRecipientSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const { isSchoolAdmin, isRegionAdmin, isSektorAdmin, hasAnyRole } = useRoleCheck();
  const isRegionLevel = isRegionAdmin || hasAnyRole(['regionoperator' as UserRole]);

  const { data: usersData, isLoading: usersLoading } = useAvailableRecipients();
  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['institutions', 'hierarchy'],
    queryFn: () => institutionService.getHierarchy(),
    enabled: isRegionLevel, // Yalnız RegionAdmin/RegionOperator üçün lazımdır
  });

  const recipients: AvailableRecipient[] = usersData?.data ?? [];

  const filteredUsers = useMemo(() => {
    let result = recipients;

    // Rol filtri (yalnız region səviyyəsi üçün)
    if (isRegionLevel && roleFilter !== 'all') {
      result = result.filter((r) => r.role === roleFilter);
    }

    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.institution_name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    );
  }, [recipients, search, roleFilter, isRegionLevel]);

  const toggleUser = (id: number) => {
    if (selectedUsers.includes(id)) {
      onUserChange(selectedUsers.filter((uid) => uid !== id));
    } else {
      onUserChange([...selectedUsers, id]);
    }
  };

  const toggleInstitution = (id: number) => {
    if (selectedInstitutions.includes(id)) {
      onInstitutionChange(selectedInstitutions.filter((iid) => iid !== id));
    } else {
      onInstitutionChange([...selectedInstitutions, id]);
    }
  };

  const allFilteredIds = filteredUsers.map((r) => r.id);
  const allSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedUsers.includes(id));

  const handleSelectAll = () => {
    if (allSelected) {
      onUserChange(selectedUsers.filter((id) => !allFilteredIds.includes(id)));
    } else {
      onUserChange(Array.from(new Set([...selectedUsers, ...allFilteredIds])));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search Header - WhatsApp Style */}
      <div className="relative group px-1">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-all duration-300" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kontakt axtarın (Ad, vəzifə...)"
          autoFocus
          className="pl-12 h-12 text-[15px] bg-gray-100/50 dark:bg-white/5 border-transparent rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all duration-300"
        />
      </div>

      {/* SchoolAdmin: yalnız rəhbər siyahısı (tək seçim — MessagingPanel singleSelect edir) */}
      {isSchoolAdmin ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-muted-foreground px-1">
            Mesaj göndərə biləcəyiniz rəhbərlər
          </p>
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 flex flex-col gap-1">
              {usersLoading ? (
                <p className="text-xs text-center py-4 text-muted-foreground">Yüklənir...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground">
                  İstifadəçi tapılmadı
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <UserItem
                    key={u.id}
                    user={u}
                    isSelected={selectedUsers.includes(u.id)}
                    onToggle={() => toggleUser(u.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ) : isSektorAdmin ? (
        /* SektorAdmin: öz sektoru altındakı məktəb adminləri — tabs yoxdur */
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-muted-foreground">
              Sektorunuzdakı məktəb adminləri
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredUsers.length === 0}
                className="h-6 text-xs px-2"
              >
                {allSelected ? 'Seçimi ləğv et' : 'Hamısını seç'}
              </Button>
              {selectedUsers.length > 0 && (
                <span className="text-xs text-muted-foreground">{selectedUsers.length} seçilib</span>
              )}
            </div>
          </div>
          <ScrollArea className="h-60 rounded-md border">
            <div className="p-2 flex flex-col gap-1">
              {usersLoading ? (
                <p className="text-xs text-center py-4 text-muted-foreground">Yüklənir...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs text-center py-4 text-muted-foreground">
                  İstifadəçi tapılmadı
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <UserItem
                    key={u.id}
                    user={u}
                    isSelected={selectedUsers.includes(u.id)}
                    onToggle={() => toggleUser(u.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* RegionAdmin / RegionOperator: tabs (istifadəçilər + müəssisələr) */
        <Tabs value={activeTab} onValueChange={(t) => { setActiveTab(t); if (t === 'institutions') setRoleFilter('all'); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 bg-gray-100/80 dark:bg-white/5 p-1.5 rounded-2xl ring-1 ring-black/5 dark:ring-white/5">
            <TabsTrigger value="users" className="text-xs font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-md transition-all">
              <Users className="h-3.5 w-3.5 mr-2" />
              İstifadəçilər
            </TabsTrigger>
            <TabsTrigger value="institutions" className="text-xs font-black uppercase tracking-widest rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-md transition-all">
              <Building2 className="h-3.5 w-3.5 mr-2" />
              Müəssisələr
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-2">
            {/* Rol filtri - Minimalist pill style */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {(['all', 'sektoradmin', 'schooladmin'] as RoleFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRoleFilter(f)}
                  className={cn(
                    'px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all duration-300',
                    roleFilter === f
                      ? 'bg-[#0059E1] text-white border-[#0059E1] shadow-lg shadow-blue-500/20'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 bg-white dark:bg-transparent'
                  )}
                >
                  {f === 'all' ? 'Hamısı' : getRoleDisplayName(f as UserRole)}
                </button>
              ))}
            </div>

            {/* Hamısını seç */}
            <div className="flex items-center justify-between px-1 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredUsers.length === 0}
                className="h-7 text-xs px-2"
              >
                {allSelected ? 'Seçimi ləğv et' : 'Hamısını seç'}
              </Button>
              {selectedUsers.length > 0 && (
                <span className="text-xs text-muted-foreground">{selectedUsers.length} seçilib</span>
              )}
            </div>

            <ScrollArea className="h-52 rounded-md border">
              <div className="p-2 flex flex-col gap-1">
                {usersLoading ? (
                  <p className="text-xs text-center py-4 text-muted-foreground">Yüklənir...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-center py-4 text-muted-foreground">
                    İstifadəçi tapılmadı
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <UserItem
                      key={u.id}
                      user={u}
                      isSelected={selectedUsers.includes(u.id)}
                      onToggle={() => toggleUser(u.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="institutions" className="mt-2">
            <p className="text-[11px] text-muted-foreground px-1 mb-2">
              Seçilmiş müəssisələrdəki bütün adminlərə mesaj göndəriləcək
            </p>
            <ScrollArea className="h-60 rounded-md border">
              <div className="p-2">
                {hierarchyLoading ? (
                  <p className="text-xs text-center py-4 text-muted-foreground">Yüklənir...</p>
                ) : (
                  <HierarchyTree
                    data={hierarchy || []}
                    selected={selectedInstitutions}
                    onToggle={toggleInstitution}
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}

      {/* Seçim xülasəsi */}
      {(selectedUsers.length > 0 || selectedInstitutions.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedUsers.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {selectedUsers.length} istifadəçi
            </Badge>
          )}
          {selectedInstitutions.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {selectedInstitutions.length} müəssisə
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onUserChange([]);
              onInstitutionChange([]);
            }}
            className="h-5 px-1.5 text-[10px] ml-auto text-muted-foreground"
          >
            Təmizlə
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── İstifadəçi elementi ────────────────────────────────────────────────────

function UserItem({
  user,
  isSelected,
  onToggle,
}: {
  user: AvailableRecipient;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-4 p-3.5 rounded-[1.25rem] text-left transition-all duration-300 group relative',
        isSelected ? 'bg-blue-500/5 dark:bg-white/5 ring-1 ring-blue-500/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'
      )}
    >
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-white/10 dark:to-transparent flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm uppercase shadow-sm">
          {user.name.charAt(0)}
        </div>
        {isSelected && (
          <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-lg animate-in zoom-in">
             <Check className="h-3 w-3 text-white" strokeWidth={4} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-[15px] transition-colors leading-tight", isSelected ? "font-black text-blue-600 dark:text-blue-400" : "font-bold text-gray-900 dark:text-white")}>{user.name}</p>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter opacity-60 truncate mt-0.5">
          {user.institution_name}
        </p>
      </div>
      <RoleBadge role={user.role} />
    </button>
  );
}


// ─── Hierarchy tree ─────────────────────────────────────────────────────────

const HierarchyTree = memo(function HierarchyTree({
  data,
  selected,
  onToggle,
  level = 0,
}: {
  data: Array<{ id: number; name: string; level?: number; children?: Array<{ id: number; name: string; level?: number; children?: unknown[] }> }>;
  selected: number[];
  onToggle: (id: number) => void;
  level?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      {data.map((node) => (
        <HierarchyNode
          key={node.id}
          node={node}
          selected={selected}
          onToggle={onToggle}
          level={level}
        />
      ))}
    </div>
  );
});

const HierarchyNode = memo(function HierarchyNode({
  node,
  selected,
  onToggle,
  level,
}: {
  node: { id: number; name: string; level?: number; children?: Array<{ id: number; name: string; level?: number; children?: unknown[] }> };
  selected: number[];
  onToggle: (id: number) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selected.includes(node.id);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-2 py-1 px-2 rounded-md hover:bg-accent transition-colors',
          isSelected && 'bg-accent/50'
        )}
      >
        <div className="flex items-center" style={{ paddingLeft: `${level * 12}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
        </div>

        <Checkbox
          id={`inst-${node.id}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(node.id)}
        />
        <label
          htmlFor={`inst-${node.id}`}
          className="text-xs font-medium cursor-pointer flex-1 truncate py-1"
        >
          {node.name}
          {node.level === 3 && (
            <span className="ml-1 text-[10px] text-muted-foreground">(Sektor)</span>
          )}
          {node.level === 4 && (
            <span className="ml-1 text-[10px] text-muted-foreground">(Məktəb)</span>
          )}
        </label>
      </div>

      {hasChildren && isOpen && (
        <div className="mt-0.5">
          <HierarchyTree
            data={node.children as Array<{ id: number; name: string; level?: number; children?: Array<{ id: number; name: string; level?: number; children?: unknown[] }> }>}
            selected={selected}
            onToggle={onToggle}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
});
