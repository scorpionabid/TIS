import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkFormValues } from '../../schemas/linkForm.schema';

const ROLE_OPTIONS = [
  { value: 'regionadmin', label: 'Regional Admin' },
  { value: 'sektoradmin', label: 'Sektor Admin' },
  { value: 'schooladmin', label: 'Məktəb Admin' },
  { value: 'teacher', label: 'Müəllim' },
  { value: 'regionoperator', label: 'Operator' },
] as const;

interface PermissionsTabProps {
  control: Control<LinkFormValues>;
}

export function PermissionsTab({ control }: PermissionsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-[13px] font-bold text-orange-900">Giriş İzinləri</div>
          <p className="text-[11px] text-orange-700 font-medium leading-relaxed mt-0.5">
            Bu keçidi yalnız seçilən vəzifə sahibləri görə biləcək. Heç bir vəzifə seçilməzsə, keçid regionun bütün istifadəçiləri üçün açıq olacaq.
          </p>
        </div>
      </div>

      <Controller
        control={control}
        name="target_roles"
        render={({ field }) => (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((role) => {
                const active = (field.value || []).includes(role.value);
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      const current = field.value || [];
                      field.onChange(
                        active
                          ? current.filter((r) => r !== role.value)
                          : [...current, role.value]
                      );
                    }}
                    className={cn(
                      'flex items-center justify-between px-5 py-4 rounded-2xl text-xs font-bold transition-all border-2',
                      active
                        ? 'bg-primary/5 border-primary text-primary'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-2 h-2 rounded-full', active ? 'bg-primary animate-pulse' : 'bg-gray-200')} />
                      {role.label}
                    </div>
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            {(field.value || []).length > 0 && (
              <button
                type="button"
                onClick={() => field.onChange([])}
                className="text-[11px] text-red-500 font-bold hover:text-red-600 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Bütün rolları sıfırla
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
