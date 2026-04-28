import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Link2,
  Info,
  ShieldCheck,
  Target,
  Users,
  Star,
  LayoutDashboard,
} from 'lucide-react';
import { linkFormSchema, type LinkFormValues } from '../schemas/linkForm.schema';
import type { Department, LinkShare } from '../types/linkDatabase.types';
import { cn } from '@/lib/utils';
import { useRoleCheck } from '@/hooks/useRoleCheck';
import { GeneralTab } from './tabs/GeneralTab';
import { PermissionsTab } from './tabs/PermissionsTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { UsersTab } from './tabs/UsersTab';
import { FeaturesTab } from './tabs/FeaturesTab';

interface UnifiedLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  activeTab: string;
  mode?: 'create' | 'edit';
  selectedLink?: LinkShare | null;
  onEditSubmit?: (data: LinkFormValues) => void;
  onCreateSubmit?: (data: LinkFormValues) => void;
  isLoading?: boolean;
}

type ModalTab = 'general' | 'permissions' | 'departments' | 'users' | 'features';

const MODAL_TABS: Array<{ id: ModalTab; label: string; icon: React.ElementType; color: string }> = [
  { id: 'general',     label: 'Ümumi',         icon: Info,        color: 'text-blue-500' },
  { id: 'permissions', label: 'İzinlər',        icon: ShieldCheck, color: 'text-orange-500' },
  { id: 'departments', label: 'Departamentlər', icon: Target,      color: 'text-indigo-500' },
  { id: 'users',       label: 'Şəxslər',        icon: Users,       color: 'text-cyan-500' },
  { id: 'features',    label: 'Özəllik',        icon: Star,        color: 'text-yellow-500' },
];

const TAB_IDS = MODAL_TABS.map((t) => t.id);

export function UnifiedLinkModal({
  isOpen,
  onClose,
  departments,
  activeTab,
  mode = 'create',
  selectedLink,
  onEditSubmit,
  onCreateSubmit,
  isLoading = false,
}: UnifiedLinkModalProps) {
  const { isSektorAdmin, currentUser } = useRoleCheck();
  const [modalActiveTab, setModalActiveTab] = useState<ModalTab>('general');

  const buildDefaults = useCallback((): LinkFormValues => {
    if (mode === 'edit' && selectedLink) {
      return {
        title: selectedLink.title,
        url: selectedLink.url,
        description: selectedLink.description || '',
        link_type: selectedLink.link_type,
        is_featured: selectedLink.is_featured,
        expires_at: selectedLink.expires_at || '',
        target_departments: selectedLink.target_departments || [],
        target_institutions: selectedLink.target_institutions || [],
        target_users: selectedLink.target_users || [],
        target_roles: selectedLink.target_roles || [],
      };
    }

    const initialDepts: number[] = [];
    if (!isNaN(parseInt(activeTab))) {
      initialDepts.push(parseInt(activeTab));
    }

    const initialInsts: number[] = [];
    if (isSektorAdmin && currentUser?.institution_id) {
      initialInsts.push(currentUser.institution_id);
    }

    return {
      title: '',
      url: '',
      description: '',
      link_type: 'external',
      is_featured: false,
      expires_at: '',
      target_departments: initialDepts,
      target_institutions: initialInsts,
      target_users: [],
      target_roles: isSektorAdmin ? ['sektoradmin'] : ['regionadmin'],
    };
  }, [mode, selectedLink, activeTab, isSektorAdmin, currentUser?.institution_id]);

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: buildDefaults(),
  });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = form;

  useEffect(() => {
    if (isOpen) {
      reset(buildDefaults());
      setModalActiveTab('general');
    }
  }, [isOpen, selectedLink, buildDefaults]);

  const onFormSubmit = handleSubmit((data) => {
    const share_scope = (data.target_users || []).length > 0 ? 'specific_users' : 'regional';
    const payload = { ...data, share_scope };
    if (mode === 'edit') {
      onEditSubmit?.(payload);
    } else {
      onCreateSubmit?.(payload);
    }
  });

  const goToNextTab = () => {
    const next = TAB_IDS[TAB_IDS.indexOf(modalActiveTab) + 1];
    if (next) setModalActiveTab(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[860px] p-0 flex flex-row h-[90vh] max-h-[680px] min-h-[520px] rounded-[2rem] overflow-hidden border-0 shadow-2xl bg-white">

        {/* LEFT SIDEBAR */}
        <aside className="w-[220px] bg-gray-50 border-r border-gray-100 flex flex-col p-6 shrink-0">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="font-black text-sm tracking-tight text-gray-800">KEÇİD EDİTORU</div>
          </div>

          <nav className="flex-1 space-y-1">
            {MODAL_TABS.map(({ id, label, icon: Icon, color }) => {
              const isActive = modalActiveTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setModalActiveTab(id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200',
                    isActive
                      ? 'bg-white text-primary shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', isActive ? color : 'text-gray-400')} />
                    <span>{label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest mb-1">
              <LayoutDashboard className="h-3 w-3" />
              Status
            </div>
            <div className="text-[11px] font-bold text-gray-600">
              {mode === 'edit' ? 'Redaktə rejimindədir' : 'Yeni keçid hazırlığı'}
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {MODAL_TABS.find((t) => t.id === modalActiveTab)?.label}
              </h2>
              <p className="text-xs text-gray-400 font-medium">Link parametrlərini buradan tənzimləyin</p>
            </div>
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">ATS Link v2.0</div>
          </header>

          <form id="unified-link-form" onSubmit={onFormSubmit} className="flex-1 overflow-y-auto p-8">
            {modalActiveTab === 'general' && (
              <GeneralTab
                register={register}
                control={control}
                errors={errors}
                isLoading={isLoading}
                watchedUrl={watch('url')}
                watchedExpiry={watch('expires_at')}
                onClearExpiry={() => setValue('expires_at', '')}
              />
            )}
            {modalActiveTab === 'permissions' && (
              <PermissionsTab control={control} />
            )}
            {modalActiveTab === 'departments' && (
              <DepartmentsTab control={control} departments={departments} />
            )}
            {modalActiveTab === 'users' && (
              <UsersTab control={control} isLoading={isLoading} />
            )}
            {modalActiveTab === 'features' && (
              <FeaturesTab control={control} />
            )}
          </form>

          <footer className="px-8 py-5 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl h-11 px-6 font-bold text-gray-400 hover:text-gray-600"
            >
              Ləğv et
            </Button>
            <div className="flex items-center gap-3">
              {modalActiveTab !== 'features' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToNextTab}
                  className="rounded-xl h-11 px-6 font-bold border-gray-200"
                >
                  Növbəti
                </Button>
              )}
              <Button
                type="submit"
                form="unified-link-form"
                disabled={isLoading}
                className="min-w-[140px] rounded-xl h-11 px-8 font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isLoading
                  ? <Loader2 className="animate-spin h-5 w-5" />
                  : mode === 'create' ? 'Əlavə et' : 'Yadda saxla'
                }
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
