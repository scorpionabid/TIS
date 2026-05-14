import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Link2, FileText, Sparkles,
  Building2, Users as UsersIcon,
  CheckCircle2, ChevronRight, ChevronLeft,
  Star, Calendar, Upload, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResourceForm } from '@/hooks/useResourceForm';
import { InstitutionTargeting } from '@/components/resources/InstitutionTargeting';
import { UserTargeting } from '@/components/resources/UserTargeting';
import type { Resource } from '@/types/resources';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceType = 'link' | 'document';

interface UnifiedResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ResourceType;
  resource?: Resource | null;
  mode?: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const LINK_TABS = [
  { id: 'general',      label: 'Ümumi',       mobileLabel: 'Ümumi',   icon: Link2,     color: 'blue'   },
  { id: 'institutions', label: 'Müəssisələr', mobileLabel: 'Müəss.',  icon: Building2, color: 'green'  },
  { id: 'users',        label: 'İstifadəçilər',mobileLabel: 'İstif.',  icon: UsersIcon, color: 'violet' },
  { id: 'features',     label: 'Özəllik',     mobileLabel: 'Özəllik', icon: Sparkles,  color: 'amber'  },
] as const;

const DOC_TABS = [
  { id: 'general',      label: 'Ümumi',       mobileLabel: 'Ümumi',  icon: FileText,  color: 'blue'   },
  { id: 'institutions', label: 'Müəssisələr', mobileLabel: 'Müəss.', icon: Building2, color: 'green'  },
  { id: 'users',        label: 'İstifadəçilər',mobileLabel: 'İstif.', icon: UsersIcon, color: 'violet' },
] as const;

type LinkTabId = typeof LINK_TABS[number]['id'];
type DocTabId  = typeof DOC_TABS[number]['id'];
type TabId     = LinkTabId | DocTabId;

const COLOR_MAP: Record<string, { dot: string; active: string; text: string }> = {
  blue:   { dot: 'bg-blue-500',   active: 'bg-blue-50 border-l-2 border-blue-500',      text: 'text-blue-700'   },
  green:  { dot: 'bg-emerald-500',active: 'bg-emerald-50 border-l-2 border-emerald-500', text: 'text-emerald-700' },
  violet: { dot: 'bg-violet-500', active: 'bg-violet-50 border-l-2 border-violet-500',   text: 'text-violet-700' },
  amber:  { dot: 'bg-amber-500',  active: 'bg-amber-50 border-l-2 border-amber-500',     text: 'text-amber-700'  },
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

const TARGETING_KEY = 'resources.linkForm.lastTargeting';

function detectLinkType(url: string): 'external' | 'video' | 'form' | 'document' {
  try {
    const { hostname, pathname } = new URL(url);
    const h = hostname.toLowerCase(), p = pathname.toLowerCase();
    if (/(youtube\.com|youtu\.be|vimeo\.com)/.test(h)) return 'video';
    if (/forms\.gle|docs\.google\.com\/forms|typeform\.com/.test(h)) return 'form';
    if (/docs\.google\.com\/(document|spreadsheets)|dropbox\.com|onedrive/.test(h) ||
        /\.(pdf|docx?|pptx?|xlsx?)$/.test(p)) return 'document';
    return 'external';
  } catch { return 'external'; }
}

// ─── Section components ───────────────────────────────────────────────────────

function LinkGeneralSection({ form }: { form: any }) {
  const [preview, setPreview] = useState<{ host: string; proto: string } | null>(null);
  const [urlOk, setUrlOk] = useState(false);
  const [typeLocked, setTypeLocked] = useState(false);
  const urlVal   = form.watch('url');
  const linkType = form.watch('link_type');

  useEffect(() => {
    if (!urlVal) { setPreview(null); setUrlOk(false); return; }
    try {
      const u = new URL(urlVal);
      setPreview({ host: u.hostname.replace(/^www\./, ''), proto: u.protocol.replace(':', '') });
      setUrlOk(true);
      if (!typeLocked) {
        const detected = detectLinkType(urlVal);
        if (detected !== linkType) form.setValue('link_type', detected, { shouldDirty: true });
      }
    } catch { setPreview(null); setUrlOk(false); }
  }, [urlVal, linkType, typeLocked, form]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Başlıq *</Label>
        <Input
          {...form.register('title')}
          placeholder="Məsələn: Elektron Jurnal Sistemi"
          className="mt-1.5 h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white"
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">URL *</Label>
        <div className="relative mt-1.5">
          <Input
            {...form.register('url')}
            type="url"
            placeholder="https://"
            className={cn(
              'h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white pr-10',
              urlOk && 'border-emerald-300 bg-emerald-50/30',
            )}
          />
          {urlOk && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
        {form.formState.errors.url && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.url.message}</p>
        )}
        {preview && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-blue-800 truncate break-all">{preview.host}</p>
              <p className="text-[10px] text-blue-600">{preview.proto.toUpperCase()}</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 shrink-0">
              {linkType === 'video' && '🎬 Video'}
              {linkType === 'form'  && '📋 Form'}
              {linkType === 'document' && '📄 Sənəd'}
              {linkType === 'external' && '🔗 Xarici'}
            </Badge>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Link Növü *</Label>
        <Select
          value={linkType}
          onValueChange={v => { setTypeLocked(true); form.setValue('link_type', v); }}
        >
          <SelectTrigger className="mt-1.5 h-10 rounded-xl bg-gray-50/60 border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">🔗 Xarici Link</SelectItem>
            <SelectItem value="video">🎬 Video</SelectItem>
            <SelectItem value="form">📋 Form</SelectItem>
            <SelectItem value="document">📄 Sənəd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Açıqlama</Label>
        <Textarea
          {...form.register('description')}
          placeholder="Link haqqında qısa məlumat..."
          className="mt-1.5 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}

function InstitutionsSection({ form, availableInstitutions }: { form: any; availableInstitutions: any[] }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-200">
      <InstitutionTargeting form={form} availableInstitutions={availableInstitutions} />
    </div>
  );
}

function UsersSection({ form }: { form: any }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-200">
      <UserTargeting form={form} />
    </div>
  );
}

function LinkFeaturesSection({ form }: { form: any }) {
  const featured = form.watch('is_featured');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
      {/* Featured toggle */}
      <button
        type="button"
        onClick={() => form.setValue('is_featured', !featured)}
        className={cn(
          'w-full p-5 border-2 border-dashed rounded-xl text-left transition-all',
          featured
            ? 'border-amber-400 bg-amber-50 shadow-sm'
            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            'p-3 rounded-xl transition-all',
            featured ? 'bg-amber-200 scale-110' : 'bg-gray-100'
          )}>
            <Star className={cn('h-6 w-6', featured ? 'text-amber-700 fill-amber-500' : 'text-gray-400')} />
          </div>
          <div className="flex-1">
            <p className={cn('font-bold text-sm', featured ? 'text-amber-800' : 'text-gray-700')}>
              Vurğulanmış Link
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {featured ? 'Bu link yuxarıda vurğulanmış bölmədə göstəriləcək.' : 'Aktivləşdirmək üçün basın.'}
            </p>
          </div>
          <div className={cn(
            'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all',
            featured ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
          )}>
            {featured && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
          </div>
        </div>
      </button>

      {/* Expiry */}
      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Bitmə Tarixi
        </Label>
        <div className="relative mt-1.5">
          <Input
            {...form.register('expires_at')}
            type="datetime-local"
            className="h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white pr-10"
          />
          {form.watch('expires_at') && (
            <button type="button" onClick={() => form.setValue('expires_at', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">Boş buraxılsa, link müddətsiz aktiv qalır.</p>
      </div>
    </div>
  );
}

function DocGeneralSection({ form, selectedFile, setSelectedFile, mode, currentFileName }: {
  form: any;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  mode: 'create' | 'edit';
  currentFileName?: string;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); form.setValue('file', f as any); }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Başlıq *</Label>
        <Input
          {...form.register('title')}
          placeholder="Sənəd başlığını daxil edin"
          className="mt-1.5 h-10 rounded-xl bg-gray-50/60 border-gray-200 focus:bg-white"
        />
        {form.formState.errors.title && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Fayl {mode === 'create' ? '*' : '(mövcud faylı əvəz etmək üçün)'}
        </Label>
        {mode === 'edit' && currentFileName && !selectedFile && (
          <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentFileName}</span>
          </div>
        )}
        <div className="mt-1.5">
          {selectedFile ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-800 flex-1 truncate">{selectedFile.name}</span>
              <button type="button" onClick={() => setSelectedFile(null)}
                className="text-emerald-600 hover:text-emerald-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
              <Upload className="h-8 w-8 text-gray-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Fayl seçmək üçün klikləyin</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, XLS, PPT, şəkil — max 50MB</p>
              </div>
              <input type="file" className="hidden" onChange={handleFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif" />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kateqoriya</Label>
          <Select value={form.watch('category')} onValueChange={v => form.setValue('category', v)}>
            <SelectTrigger className="mt-1.5 h-10 rounded-xl bg-gray-50/60 border-gray-200">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administrative">İdarəetmə</SelectItem>
              <SelectItem value="financial">Maliyyə</SelectItem>
              <SelectItem value="educational">Təhsil</SelectItem>
              <SelectItem value="hr">İnsan resursları</SelectItem>
              <SelectItem value="technical">Texniki</SelectItem>
              <SelectItem value="other">Digər</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bitmə tarixi</Label>
          <Input
            {...form.register('expires_at')}
            type="datetime-local"
            className="mt-1.5 h-10 rounded-xl bg-gray-50/60 border-gray-200"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Açıqlama</Label>
        <Textarea
          {...form.register('description')}
          placeholder="Sənəd haqqında qısa məlumat..."
          className="mt-1.5 rounded-xl bg-gray-50/60 border-gray-200 resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-5">
        {[
          { field: 'is_downloadable',   label: 'Yükləməyə icazə'  },
          { field: 'is_viewable_online', label: 'Onlayn baxış'     },
        ].map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={!!form.watch(field)}
              onCheckedChange={v => form.setValue(field, v as boolean)}
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function UnifiedResourceModal({
  isOpen,
  onClose,
  type = 'link',
  resource = null,
  mode = 'create',
  onResourceSaved,
}: UnifiedResourceModalProps) {
  const isLink = type === 'link';
  const tabs   = (isLink ? LINK_TABS : DOC_TABS) as readonly { id: string; label: string; icon: any; color: string }[];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Reset tab on open
  useEffect(() => {
    if (!isOpen) return;
    // Edit rejimində seçilmiş data-ya görə tab açılır
    if (mode === 'edit' && resource) {
      if ((resource.target_institutions?.length ?? 0) > 0) {
        setActiveTab('institutions');
      } else if ((resource.target_users?.length ?? 0) > 0) {
        setActiveTab('users');
      } else {
        setActiveTab(tabs[0].id);
      }
    } else {
      setActiveTab(tabs[0].id);
    }
  }, [isOpen, type, mode, resource]);

  const {
    form,
    maybeDefaultInstitutions,
    selectedFile,
    setSelectedFile,
    availableInstitutions,
    handleSubmit,
  } = useResourceForm({ isOpen, activeTab: isLink ? 'links' : 'documents', resource, mode, onResourceSaved, onClose });

  const currentIdx  = tabs.findIndex(t => t.id === activeTab);
  const isFirst     = currentIdx === 0;
  const isLast      = currentIdx === tabs.length - 1;
  const goNext      = () => !isLast && setActiveTab(tabs[currentIdx + 1].id);
  const goBack      = () => !isFirst && setActiveTab(tabs[currentIdx - 1].id);

  const typeLabel = isLink
    ? (mode === 'create' ? 'Yeni Link' : 'Link Redaktə')
    : (mode === 'create' ? 'Yeni Sənəd' : 'Sənəd Redaktə');

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="w-full sm:max-w-[960px] p-0 flex flex-col sm:flex-row h-[94vh] sm:h-auto sm:max-h-[90vh] rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 [&>[data-dialog-close]]:hidden"
      >

        {/* ── Mobile: horizontal tabs ── */}
        <div className="flex sm:hidden items-center gap-1 px-4 pt-4 pb-2 border-b bg-gray-50 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 mr-3 shrink-0">
            <div className={cn('p-1.5 rounded-lg text-white', isLink ? 'bg-blue-600' : 'bg-violet-600')}>
              {isLink ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <span className="text-sm font-bold text-gray-800">{typeLabel}</span>
          </div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const c = COLOR_MAP[tab.color];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                  activeTab === tab.id ? `${c.active.split(' ')[0]} ${c.text} shadow-sm` : 'text-gray-500 hover:bg-gray-100'
                )}>
                <Icon className="h-3 w-3" />{tab.mobileLabel}
              </button>
            );
          })}
        </div>

        {/* ── Desktop: left sidebar ── */}
        <div className="hidden sm:flex sm:w-[180px] lg:w-[220px] shrink-0 flex-col bg-gray-50 border-r">
          {/* Header */}
          <div className="p-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className={cn('p-2 rounded-xl text-white', isLink ? 'bg-blue-600' : 'bg-violet-600')}>
                {isLink ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800 leading-tight">{typeLabel}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {mode === 'create' ? 'Yeni əlavə' : 'Redaktə'}
                </p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 px-2">
            {tabs.map((tab, idx) => {
              const Icon   = tab.icon;
              const c      = COLOR_MAP[tab.color];
              const active = tab.id === activeTab;

              // Count badge: institutions / users tab-larında seçilmiş say
              const watchedInst  = form.watch('target_institutions');
              const watchedUsers = form.watch('target_users');
              const tabCount =
                tab.id === 'institutions' ? (Array.isArray(watchedInst)  ? watchedInst.length  : 0) :
                tab.id === 'users'        ? (Array.isArray(watchedUsers) ? watchedUsers.length : 0) :
                0;

              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1',
                    active ? `${c.active} ${c.text}` : 'text-gray-500 hover:bg-white hover:text-gray-800'
                  )}>
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                    active ? `${c.dot} text-white` : 'bg-gray-200 text-gray-400'
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tabCount > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                      active ? 'bg-white/30 text-current' : `${c.dot} text-white`
                    )}>
                      {tabCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab progress dots */}
          <div className="px-5 pb-5 flex gap-1.5">
            {tabs.map((t, i) => (
              <div key={t.id}
                className={cn('h-1.5 rounded-full transition-all',
                  t.id === activeTab ? 'flex-1 bg-blue-500' : i < currentIdx ? 'w-4 bg-emerald-400' : 'w-4 bg-gray-200'
                )} />
            ))}
          </div>
        </div>

        {/* ── Right: content + footer ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* institutions/users tab: flex-fill so only the list scrolls internally */}
          <div className={cn(
            'flex-1 min-h-0 p-6',
            (activeTab === 'institutions' || activeTab === 'users')
              ? 'flex flex-col overflow-hidden pb-4'
              : 'overflow-y-auto'
          )}>
            {/* Form-level errors */}
            {form.formState.errors.title && (
              <div className="shrink-0 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <X className="h-4 w-4 shrink-0 mt-0.5" />
                {String(form.formState.errors.title.message)}
              </div>
            )}
            <form
              id="unified-resource-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className={cn(
                (activeTab === 'institutions' || activeTab === 'users') && 'flex-1 flex flex-col min-h-0'
              )}
            >
              {activeTab === 'general' && isLink && <LinkGeneralSection form={form} />}
              {activeTab === 'general' && !isLink && (
                <DocGeneralSection
                  form={form}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  mode={mode}
                  currentFileName={resource?.original_filename}
                />
              )}
              {activeTab === 'institutions' && (
                <InstitutionsSection form={form} availableInstitutions={availableInstitutions} />
              )}
              {activeTab === 'users' && <UsersSection form={form} />}
              {activeTab === 'features' && <LinkFeaturesSection form={form} />}
            </form>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-white">
            <Button type="button" variant="ghost" size="sm"
              onClick={isFirst ? onClose : goBack}
              className="gap-1.5 text-gray-500">
              {isFirst ? 'Ləğv et' : <><ChevronLeft className="h-4 w-4" />Geri</>}
            </Button>

            <div className="flex items-center gap-2">
              {isLast ? (
                <Button
                  type="submit"
                  form="unified-resource-form"
                  disabled={form.formState.isSubmitting}
                  className={cn('gap-1.5 px-6', isLink ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700')}
                >
                  {form.formState.isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Yüklənir...</>
                    : mode === 'create' ? 'Yarat' : 'Yadda saxla'}
                </Button>
              ) : (
                <Button type="button" onClick={goNext}
                  className={cn('gap-1.5', isLink ? 'bg-blue-600 hover:bg-blue-700' : 'bg-violet-600 hover:bg-violet-700')}>
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
