import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Folder, Building2, Users, Settings2, Search, X,
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  User as UserIcon, Lock, Upload,
} from 'lucide-react';
import documentCollectionService from '@/services/documentCollectionService';
import { institutionService } from '@/services/institutions';
import { userService } from '@/services/users';
import { getUserInstitutionId, hasRole } from '@/utils/permissions';
import type { DocumentCollection } from '@/types/documentCollection';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateProps {
  mode: 'create';
  currentCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditProps {
  mode: 'edit';
  folder: DocumentCollection;
  onClose: () => void;
  onSuccess: () => void;
}

type UnifiedFolderModalProps = CreateProps | EditProps;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const BASE_TABS = [
  { id: 'general',      label: 'Ümumi',         icon: Folder,    color: 'blue'   },
  { id: 'institutions', label: 'Müəssisələr',   icon: Building2, color: 'green'  },
  { id: 'users',        label: 'İstifadəçilər', icon: Users,     color: 'violet' },
] as const;

const EDIT_TABS = [
  ...BASE_TABS,
  { id: 'settings', label: 'Parametrlər', icon: Settings2, color: 'amber' },
] as const;

type TabId = 'general' | 'institutions' | 'users' | 'settings';

const COLOR_MAP: Record<string, { dot: string; active: string; text: string }> = {
  green:  { dot: 'bg-emerald-500', active: 'bg-emerald-50 border-l-2 border-emerald-500', text: 'text-emerald-700' },
  blue:   { dot: 'bg-blue-500',    active: 'bg-blue-50 border-l-2 border-blue-500',       text: 'text-blue-700'   },
  violet: { dot: 'bg-violet-500',  active: 'bg-violet-50 border-l-2 border-violet-500',   text: 'text-violet-700' },
  amber:  { dot: 'bg-amber-500',   active: 'bg-amber-50 border-l-2 border-amber-500',     text: 'text-amber-700'  },
};

interface Institution { id: number; name: string; level?: number | null; type?: string | null; }
interface User        { id: number; name: string; role?: string; }
interface UserConfig  { id: number; can_upload: boolean; can_delete: boolean; }

// ─── Section: Ümumi ───────────────────────────────────────────────────────────

function GeneralSection({ mode, name, setName, description, setDescription, selectedInstitution, setSelectedInstitution, availableInstitutions, isAdmin }: {
  mode: 'create' | 'edit';
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  selectedInstitution: number | null; setSelectedInstitution: (v: number | null) => void;
  availableInstitutions: Institution[];
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      {isAdmin && mode === 'create' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Sahib Müəssisə *
          </label>
          <select
            value={selectedInstitution ?? ''}
            onChange={e => setSelectedInstitution(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50/60 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            required
          >
            <option value="">Seçin...</option>
            {availableInstitutions.filter(i => [2,3,4].includes(Number(i.level))).map(i => (
              <option key={i.id} value={i.id}>{i.name} (Səviyyə {i.level})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Qovluq Adı *
        </label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Məsələn: Əmrlər, Fəaliyyət Planı..."
          className="h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white"
        />
      </div>

      {mode === 'edit' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Açıqlama
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Qovluq haqqında qısa məlumat..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      )}
    </div>
  );
}

// ─── Section: Müəssisələr ─────────────────────────────────────────────────────

function InstitutionsSection({ targetInstitutions, setTargetInstitutions, availableInstitutions }: {
  targetInstitutions: number[];
  setTargetInstitutions: (v: number[]) => void;
  availableInstitutions: Institution[];
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q ? availableInstitutions.filter(i => i.name.toLowerCase().includes(q)) : [...availableInstitutions];
    // Seçilmişlər yuxarıda
    return list.sort((a, b) => {
      const aS = targetInstitutions.includes(a.id) ? 0 : 1;
      const bS = targetInstitutions.includes(b.id) ? 0 : 1;
      return aS - bS;
    });
  }, [availableInstitutions, search, targetInstitutions]);

  const counts = useMemo(() => ({
    all:      availableInstitutions.length,
    sector:   availableInstitutions.filter(i => i.level === 3).length,
    school:   availableInstitutions.filter(i => i.level === 4 && (i.name?.toLowerCase().includes('məktəb') || ['secondary_school','vocational_school','school'].includes(i.type ?? ''))).length,
  }), [availableInstitutions]);

  const toggle = (id: number) => setTargetInstitutions(
    targetInstitutions.includes(id) ? targetInstitutions.filter(x => x !== id) : [...targetInstitutions, id]
  );

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Selected strip */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 border rounded-xl min-h-[44px] transition-colors',
        targetInstitutions.length > 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-muted/30 border-border/50'
      )}>
        <Building2 className={cn('h-3.5 w-3.5 shrink-0', targetInstitutions.length > 0 ? 'text-blue-600' : 'text-muted-foreground')} />
        <span className={cn('text-xs font-semibold', targetInstitutions.length > 0 ? 'text-blue-700' : 'text-muted-foreground')}>
          {targetInstitutions.length > 0 ? `${targetInstitutions.length} müəssisə seçilib` : 'Seçilməyib'}
        </span>
        {targetInstitutions.length > 0 && (
          <button type="button" onClick={() => setTargetInstitutions([])}
            className="ml-auto text-[11px] text-blue-600/70 hover:text-red-600 transition-colors">
            Hamısını sil
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Müəssisə axtar..."
          className="pl-9 h-8 text-sm bg-muted/30 border-border/50 rounded-lg" />
        {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </div>

      {/* Quick select */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => setTargetInstitutions(filtered.map(i => i.id))}
          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 transition-all">
          Hamısını seç ({counts.all})
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button type="button" onClick={() => setTargetInstitutions(availableInstitutions.filter(i => i.level === 3).map(i => i.id))}
          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
          Sektorlar ({counts.sector})
        </button>
        <button type="button" onClick={() => setTargetInstitutions(availableInstitutions.filter(i => i.level === 4 && (i.name?.toLowerCase().includes('məktəb') || ['secondary_school','vocational_school','school'].includes(i.type ?? ''))).map(i => i.id))}
          className="h-7 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
          Məktəblər ({counts.school})
        </button>
      </div>

      {/* List */}
      <div className="border rounded-xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Müəssisə tapılmadı</div>
        ) : filtered.map(inst => {
          const checked = targetInstitutions.includes(inst.id);
          return (
            <label key={inst.id} className={cn('flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/20 last:border-0 transition-colors', checked ? 'bg-blue-50/60' : 'hover:bg-muted/30')}>
              <Checkbox checked={checked} onCheckedChange={() => toggle(inst.id)} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{inst.name}</p>
                <p className="text-[11px] text-muted-foreground">Səviyyə {inst.level}</p>
              </div>
              {checked && <span className="text-[10px] text-blue-600 font-bold shrink-0">✓</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: İstifadəçilər ───────────────────────────────────────────────────

const ROLE_FILTERS = [
  { key: 'regionadmin',    label: 'RegionAdmin'    },
  { key: 'regionoperator', label: 'RegionOperator' },
  { key: 'sektoradmin',    label: 'SektorAdmin'    },
  { key: 'schooladmin',    label: 'SchoolAdmin'    },
] as const;

type RoleKey = typeof ROLE_FILTERS[number]['key'];

function UsersSection({ targetUsersConfig, setTargetUsersConfig, availableUsers }: {
  targetUsersConfig: UserConfig[];
  setTargetUsersConfig: (v: UserConfig[]) => void;
  availableUsers: User[];
}) {
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleKey | null>(null);

  const filtered = useMemo(() => {
    let list = availableUsers;
    if (roleFilter) list = list.filter(u => (u.role ?? '').toLowerCase() === roleFilter);
    const q = search.toLowerCase();
    if (q) list = list.filter(u => u.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const aS = targetUsersConfig.some(c => c.id === a.id) ? 0 : 1;
      const bS = targetUsersConfig.some(c => c.id === b.id) ? 0 : 1;
      return aS - bS;
    });
  }, [availableUsers, search, roleFilter, targetUsersConfig]);

  const toggle = (user: User, checked: boolean) => {
    setTargetUsersConfig(
      checked
        ? [...targetUsersConfig, { id: user.id, can_upload: true, can_delete: false }]
        : targetUsersConfig.filter(c => c.id !== user.id)
    );
  };

  const updatePerm = (userId: number, field: 'can_upload' | 'can_delete', value: boolean) => {
    setTargetUsersConfig(targetUsersConfig.map(c => c.id === userId ? { ...c, [field]: value } : c));
  };

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Selected strip */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 border rounded-xl min-h-[44px] transition-colors',
        targetUsersConfig.length > 0 ? 'bg-violet-50/60 border-violet-200' : 'bg-muted/30 border-border/50'
      )}>
        <Users className={cn('h-3.5 w-3.5 shrink-0', targetUsersConfig.length > 0 ? 'text-violet-600' : 'text-muted-foreground')} />
        <span className={cn('text-xs font-semibold', targetUsersConfig.length > 0 ? 'text-violet-700' : 'text-muted-foreground')}>
          {targetUsersConfig.length > 0 ? `${targetUsersConfig.length} istifadəçi seçilib` : 'Seçilməyib'}
        </span>
        {targetUsersConfig.length > 0 && (
          <button type="button" onClick={() => setTargetUsersConfig([])}
            className="ml-auto text-[11px] text-violet-600/70 hover:text-red-600 transition-colors">
            Hamısını sil
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="İstifadəçi axtar..."
          className="pl-9 h-8 text-sm bg-muted/30 border-border/50 rounded-lg" />
        {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </div>

      {/* Role filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => setRoleFilter(null)}
          className={cn('h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
            !roleFilter ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30')}>
          Hamısı
        </button>
        {ROLE_FILTERS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setRoleFilter(prev => prev === key ? null : key)}
            className={cn('h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all',
              roleFilter === key ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30')}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border rounded-xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">İstifadəçi tapılmadı</div>
        ) : filtered.map(user => {
          const config = targetUsersConfig.find(c => c.id === user.id);
          const checked = !!config;
          return (
            <div key={user.id} className={cn('px-4 py-2.5 border-b border-border/20 last:border-0 transition-colors', checked ? 'bg-violet-50/40' : 'hover:bg-muted/20')}>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={v => toggle(user, v === true)} className="shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  {user.role && <span className="text-[10px] text-muted-foreground shrink-0">{user.role}</span>}
                </div>
              </label>
              {checked && config && (
                <div className="ml-9 mt-2 flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={config.can_upload} onCheckedChange={v => updatePerm(user.id, 'can_upload', v === true)}
                      className="h-3.5 w-3.5" />
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Yükləyə bilsin
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={config.can_delete} onCheckedChange={v => updatePerm(user.id, 'can_delete', v === true)}
                      className="h-3.5 w-3.5" />
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <X className="h-3 w-3" /> Silə bilsin
                    </span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section: Parametrlər (edit only) ────────────────────────────────────────

function SettingsSection({ allowUpload, setAllowUpload, isLocked, setIsLocked, reason, setReason }: {
  allowUpload: boolean; setAllowUpload: (v: boolean) => void;
  isLocked: boolean;    setIsLocked:    (v: boolean) => void;
  reason: string;       setReason:      (v: string) => void;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all hover:border-emerald-200 hover:bg-emerald-50/30"
          style={{ borderColor: allowUpload ? '#10b981' : undefined, backgroundColor: allowUpload ? '#f0fdf4' : undefined }}>
          <Checkbox checked={allowUpload} onCheckedChange={v => setAllowUpload(v === true)} />
          <div>
            <div className="flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-600" />
              <p className="font-semibold text-sm">Sənəd yükləməyə icazə ver</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Hədəf məktəblər bu qovluğa sənəd yükləyə bilər</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all hover:border-amber-200 hover:bg-amber-50/30"
          style={{ borderColor: isLocked ? '#f59e0b' : undefined, backgroundColor: isLocked ? '#fffbeb' : undefined }}>
          <Checkbox checked={isLocked} onCheckedChange={v => setIsLocked(v === true)} />
          <div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-sm">Qovluğu kilitleyin</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Kilidlənmiş qovluğa heç kim yükləyə bilməz</p>
          </div>
        </label>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Dəyişiklik Səbəbi
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Bu dəyişikliyi niyə etdiniz? (audit üçün)"
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function UnifiedFolderModal(props: UnifiedFolderModalProps) {
  const { mode, onClose, onSuccess } = props;
  const folder = mode === 'edit' ? props.folder : null;

  const { currentUser: user } = useAuth();
  const isAdmin = hasRole(user, 'superadmin');

  // ── State ──
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [name, setName]           = useState(folder?.name ?? '');
  const [description, setDescription] = useState(folder?.description ?? '');
  const [allowUpload, setAllowUpload] = useState(folder?.allow_school_upload ?? true);
  const [isLocked, setIsLocked]   = useState(folder?.is_locked ?? false);
  const [reason, setReason]       = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Institutions targeting
  const [targetInstitutions, setTargetInstitutions] = useState<number[]>(() => {
    if (!folder) return [];
    const t = folder.target_institutions || (folder as any).targetInstitutions || [];
    return t.map((x: any) => typeof x === 'number' ? x : x.id);
  });

  // Users targeting
  const [targetUsersConfig, setTargetUsersConfig] = useState<UserConfig[]>(() => {
    if (!folder) return [];
    const t = (folder as any).targetUsers || (folder as any).target_users || [];
    return t.map((x: any) => ({
      id: typeof x === 'number' ? x : x.id,
      can_upload: x.pivot?.can_upload ?? true,
      can_delete: x.pivot?.can_delete ?? false,
    }));
  });

  // Set owner institution on load
  useEffect(() => {
    if (!isAdmin) {
      const id = getUserInstitutionId(user);
      if (id) setSelectedInstitution(id);
    }
  }, [user, isAdmin]);

  // ── Data ──
  const { data: institutionsResponse, isLoading: instLoading } = useQuery({
    queryKey: ['institutions-for-folders'],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
  });

  const targetRoles = useMemo(() => {
    if (hasRole(user, 'superadmin'))   return 'all';
    if (hasRole(user, 'regionadmin'))  return 'regionadmin,sektoradmin,regionoperator';
    if (hasRole(user, 'sektoradmin'))  return 'sektoradmin,regionoperator';
    if (hasRole(user, 'regionoperator')) return 'regionoperator';
    return '';
  }, [user]);

  const { data: usersResponse } = useQuery({
    queryKey: ['users-for-folders', targetRoles],
    queryFn: () => userService.getUsers({ role: targetRoles, per_page: 100 }),
    enabled: !!targetRoles,
  });

  const availableInstitutions: Institution[] = useMemo(() => {
    const raw = institutionsResponse?.institutions || institutionsResponse?.data?.data || institutionsResponse?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [institutionsResponse]);

  const availableUsers: User[] = useMemo(() =>
    Array.isArray(usersResponse?.data) ? usersResponse.data : [], [usersResponse]);

  // ── Tabs ──
  const tabs = mode === 'edit' ? EDIT_TABS : BASE_TABS;
  const currentIdx = tabs.findIndex(t => t.id === activeTab);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === tabs.length - 1;
  const goNext     = () => !isLast  && setActiveTab(tabs[currentIdx + 1].id);
  const goBack     = () => !isFirst && setActiveTab(tabs[currentIdx - 1].id);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!name.trim()) { setError('Qovluq adı daxil edin'); setActiveTab('general'); return; }
    if (mode === 'create' && !selectedInstitution) { setError('Sahib müəssisə seçin'); setActiveTab('general'); return; }
    if (targetInstitutions.length === 0 && targetUsersConfig.length === 0) {
      setError('Ən azı bir müəssisə və ya istifadəçi seçin');
      setActiveTab('institutions');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        const key = name.trim().toLowerCase().replace(/\s+/g, '_');
        await documentCollectionService.createRegionalFolders({
          institution_id: selectedInstitution!,
          folder_templates: { [key]: name.trim() },
          target_institutions: targetInstitutions,
          target_user_ids: targetUsersConfig,
        });
      } else {
        await documentCollectionService.update(folder!.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          allow_school_upload: allowUpload,
          is_locked: isLocked,
          reason: reason.trim() || undefined,
          target_institutions: targetInstitutions,
          target_user_ids: targetUsersConfig,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [mode, name, selectedInstitution, targetInstitutions, targetUsersConfig, description, allowUpload, isLocked, reason, folder, onSuccess]);

  const typeLabel = mode === 'create' ? 'Yeni Qovluq' : 'Qovluq Redaktə';

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="w-full sm:max-w-[960px] p-0 flex flex-col sm:flex-row h-[94vh] sm:h-[720px] sm:max-h-[820px] rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 [&>[data-dialog-close]]:hidden"
      >
        {/* ── Mobile tabs ── */}
        <div className="flex sm:hidden items-center gap-1 px-4 pt-4 pb-2 border-b bg-gray-50 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 mr-3 shrink-0">
            <div className={cn('p-1.5 rounded-lg text-white', mode === 'create' ? 'bg-emerald-600' : 'bg-blue-600')}>
              <Folder className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-gray-800">{typeLabel}</span>
          </div>
          {tabs.map(tab => {
            const c = COLOR_MAP[tab.color];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  activeTab === tab.id ? `${c.active.split(' ')[0]} ${c.text} shadow-sm` : 'text-gray-500 hover:bg-gray-100'
                )}>
                <tab.icon className="h-3 w-3" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Desktop sidebar ── */}
        <div className="hidden sm:flex w-[200px] shrink-0 flex-col bg-gray-50 border-r">
          <div className="p-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className={cn('p-2 rounded-xl text-white', mode === 'create' ? 'bg-emerald-600' : 'bg-blue-600')}>
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">{typeLabel}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{mode === 'create' ? 'Yeni əlavə' : 'Redaktə'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-3 px-2">
            {tabs.map((tab, idx) => {
              const c      = COLOR_MAP[tab.color];
              const active = tab.id === activeTab;
              const count  =
                tab.id === 'institutions' ? targetInstitutions.length :
                tab.id === 'users'        ? targetUsersConfig.length  : 0;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1',
                    active ? `${c.active} ${c.text}` : 'text-gray-500 hover:bg-white hover:text-gray-800'
                  )}>
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                    active ? `${c.dot} text-white` : 'bg-gray-200 text-gray-400'
                  )}>
                    <tab.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {count > 0 && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                      active ? 'bg-white/30 text-current' : `${c.dot} text-white`
                    )}>{count}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="px-5 pb-5 flex gap-1.5">
            {tabs.map((t, i) => (
              <div key={t.id} className={cn('h-1.5 rounded-full transition-all',
                t.id === activeTab ? 'flex-1 bg-blue-500' : i < currentIdx ? 'w-4 bg-emerald-400' : 'w-4 bg-gray-200'
              )} />
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <X className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {activeTab === 'general' && (
              <GeneralSection mode={mode} name={name} setName={setName}
                description={description} setDescription={setDescription}
                selectedInstitution={selectedInstitution} setSelectedInstitution={setSelectedInstitution}
                availableInstitutions={availableInstitutions} isAdmin={isAdmin} />
            )}
            {activeTab === 'institutions' && (
              instLoading
                ? <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                : <InstitutionsSection targetInstitutions={targetInstitutions} setTargetInstitutions={setTargetInstitutions} availableInstitutions={availableInstitutions} />
            )}
            {activeTab === 'users' && (
              <UsersSection targetUsersConfig={targetUsersConfig} setTargetUsersConfig={setTargetUsersConfig} availableUsers={availableUsers} />
            )}
            {activeTab === 'settings' && mode === 'edit' && (
              <SettingsSection allowUpload={allowUpload} setAllowUpload={setAllowUpload}
                isLocked={isLocked} setIsLocked={setIsLocked}
                reason={reason} setReason={setReason} />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-white">
            <Button type="button" variant="ghost" size="sm" onClick={isFirst ? onClose : goBack}
              className="gap-1.5 text-gray-500">
              {isFirst ? 'Ləğv et' : <><ChevronLeft className="h-4 w-4" />Geri</>}
            </Button>
            <div className="flex items-center gap-2">
              {isLast ? (
                <Button onClick={handleSubmit} disabled={loading}
                  className="gap-1.5 px-6 bg-emerald-600 hover:bg-emerald-700">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Yüklənir...</> : mode === 'create' ? 'Qovluq Yarat' : 'Yadda Saxla'}
                </Button>
              ) : (
                <Button type="button" onClick={goNext}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  Növbəti <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
