import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Folder, Building2, Users, Settings2, X,
  ChevronLeft, ChevronRight, Loader2,
  Lock, Upload,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import documentCollectionService from '@/services/documentCollectionService';
import { institutionService } from '@/services/institutions';
import { getUserInstitutionId, hasRole } from '@/utils/permissions';
import { InstitutionTargeting } from '@/components/resources/InstitutionTargeting';
import { UserTargeting } from '@/components/resources/UserTargeting';
import type { DocumentCollection } from '@/types/documentCollection';

// ─── Schema ───────────────────────────────────────────────────────────────────

const folderSchema = z.object({
  name: z.string().min(1, 'Qovluq adı daxil edin'),
  description: z.string().optional(),
  owner_institution_id: z.number().nullable(),
  target_institutions: z.array(z.number()).default([]),
  target_users: z.array(z.number()).default([]),
  allow_school_upload: z.boolean().default(true),
  is_locked: z.boolean().default(false),
  reason: z.string().optional(),
});

type FolderFormData = z.infer<typeof folderSchema>;

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

// ─── Sections ─────────────────────────────────────────────────────────────────

function GeneralSection({ form, mode, isAdmin, availableInstitutions }: { form: UseFormReturn<FolderFormData>; mode: 'create' | 'edit'; isAdmin: boolean; availableInstitutions: { id: number; name: string; level: number }[] }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      {isAdmin && mode === 'create' && (
        <div>
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sahib Müəssisə *</Label>
          <select
            {...form.register('owner_institution_id', { valueAsNumber: true })}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50/60 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">Seçin...</option>
            {availableInstitutions.filter(i => [2,3,4].includes(Number(i.level))).map(i => (
              <option key={i.id} value={i.id}>{i.name} (Səviyyə {i.level})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Qovluq Adı *</Label>
        <Input
          {...form.register('name')}
          placeholder="Məsələn: Əmrlər, Fəaliyyət Planı..."
          className="h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white"
        />
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Açıqlama</Label>
        <Textarea
          {...form.register('description')}
          placeholder="Qovluq haqqında qısa məlumat..."
          rows={3}
          className="rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white resize-none"
        />
      </div>
    </div>
  );
}

function SettingsSection({ form }: { form: UseFormReturn<FolderFormData> }) {
  const allowUpload = useWatch({ control: form.control, name: 'allow_school_upload' });
  const isLocked    = useWatch({ control: form.control, name: 'is_locked' });

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      <div className="space-y-3">
        <label className={cn('flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all',
          allowUpload ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
        )}>
          <Checkbox checked={allowUpload} onCheckedChange={v => form.setValue('allow_school_upload', v === true)} />
          <div>
            <div className="flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-600" />
              <p className="font-semibold text-sm">Sənəd yükləməyə icazə ver</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Hədəf məktəblər bu qovluğa sənəd yükləyə bilər</p>
          </div>
        </label>

        <label className={cn('flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all',
          isLocked ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/30'
        )}>
          <Checkbox checked={isLocked} onCheckedChange={v => form.setValue('is_locked', v === true)} />
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
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Dəyişiklik Səbəbi</Label>
        <Textarea
          {...form.register('reason')}
          placeholder="Bu dəyişikliyi niyə etdiniz? (audit üçün)"
          rows={3}
          className="rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white resize-none"
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
  const { toast } = useToast();
  const isAdmin = hasRole(user, 'superadmin');

  const [activeTab, setActiveTab] = useState<TabId>('general');

  const form = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: folder?.name ?? '',
      description: folder?.description ?? '',
      owner_institution_id: folder?.owner_institution_id ?? null,
      allow_school_upload: folder?.allow_school_upload ?? true,
      is_locked: folder?.is_locked ?? false,
      reason: '',
      target_institutions: (folder?.target_institutions || (folder as any)?.targetInstitutions || []).map((x: any) => typeof x === 'number' ? x : x.id),
      target_users: (folder?.target_users || (folder as any)?.targetUsers || []).map((x: any) => typeof x === 'number' ? x : x.id),
    }
  });

  // Set owner institution for non-admins on load
  useEffect(() => {
    if (!isAdmin && mode === 'create') {
      const id = getUserInstitutionId(user);
      if (id) form.setValue('owner_institution_id', id);
    }
  }, [user, isAdmin, mode, form]);

  const { data: institutionsResponse, isLoading: instLoading } = useQuery({
    queryKey: ['institutions-for-folders'],
    queryFn: () => institutionService.getAll({ per_page: 1000 }),
  });

  const availableInstitutions = useMemo(() => {
    const raw = institutionsResponse?.institutions || institutionsResponse?.data?.data || institutionsResponse?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [institutionsResponse]);

  const handleSubmit = async (data: FolderFormData) => {
    try {
      if (mode === 'create') {
        const ownerId = data.owner_institution_id;
        if (!ownerId) {
          toast({ title: 'Müəssisə seçilməyib', description: 'Sahib müəssisəni seçin', variant: 'destructive' });
          return;
        }
        const key = data.name.trim().toLowerCase().replace(/\s+/g, '_');
        await documentCollectionService.createRegionalFolders({
          institution_id: ownerId,
          folder_templates: { [key]: data.name.trim() },
          target_institutions: data.target_institutions,
          target_user_ids: data.target_users,
        });
        toast({ title: 'Qovluq yaradıldı', description: `"${data.name.trim()}" qovluğu uğurla yaradıldı` });
      } else {
        await documentCollectionService.update(folder!.id, {
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          allow_school_upload: data.allow_school_upload,
          is_locked: data.is_locked,
          reason: data.reason?.trim() || undefined,
          target_institutions: data.target_institutions,
          target_user_ids: data.target_users,
        });
        toast({ title: 'Qovluq yeniləndi', description: `"${data.name.trim()}" qovluğu uğurla yeniləndi` });
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      toast({
        title: 'Xəta baş verdi',
        description: msg || 'Qovluq saxlanılarkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const tabs = mode === 'edit' ? EDIT_TABS : BASE_TABS;
  const currentIdx = tabs.findIndex(t => t.id === activeTab);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === tabs.length - 1;
  const goNext     = () => !isLast  && setActiveTab(tabs[currentIdx + 1].id);
  const goBack     = () => !isFirst && setActiveTab(tabs[currentIdx - 1].id);

  const typeLabel = mode === 'create' ? 'Yeni Qovluq' : 'Qovluq Redaktə';

  // Watchers for tab badges
  const watchedInst = useWatch({ control: form.control, name: 'target_institutions' }) || [];
  const watchedUsers = useWatch({ control: form.control, name: 'target_users' }) || [];

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-[960px] p-0 flex flex-col sm:flex-row h-[94vh] sm:h-[720px] sm:max-h-[820px] rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 [&>[data-dialog-close]]:hidden">
        
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
              <button key={tab.id} type="button" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab(tab.id); }}
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
            {tabs.map((tab) => {
              const c      = COLOR_MAP[tab.color];
              const active = tab.id === activeTab;
              const count  =
                tab.id === 'institutions' ? watchedInst.length :
                tab.id === 'users'        ? watchedUsers.length  : 0;
              return (
                <button key={tab.id} type="button" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveTab(tab.id); }}
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
            {form.formState.errors.name && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <X className="h-4 w-4 shrink-0 mt-0.5" />
                {form.formState.errors.name.message}
              </div>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {activeTab === 'general' && (
                <GeneralSection form={form} mode={mode} isAdmin={isAdmin} availableInstitutions={availableInstitutions} />
              )}
              {activeTab === 'institutions' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                  <InstitutionTargeting form={form} availableInstitutions={availableInstitutions} />
                </div>
              )}
              {activeTab === 'users' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                  <UserTargeting form={form} />
                </div>
              )}
              {activeTab === 'settings' && mode === 'edit' && (
                <SettingsSection form={form} />
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-white">
            <Button type="button" variant="ghost" size="sm" onClick={isFirst ? onClose : goBack}
              className="gap-1.5 text-gray-500">
              {isFirst ? 'Ləğv et' : <><ChevronLeft className="h-4 w-4" />Geri</>}
            </Button>
            <div className="flex items-center gap-2">
              {isLast ? (
                <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={form.formState.isSubmitting}
                  className="gap-1.5 px-6 bg-emerald-600 hover:bg-emerald-700">
                  {form.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Yüklənir...</> : mode === 'create' ? 'Qovluq Yarat' : 'Yadda Saxla'}
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
