import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Users } from 'lucide-react';
import { ResponsibleUserSelector } from '@/components/tasks/ResponsibleUserSelector';
import type { LinkFormValues } from '../../schemas/linkForm.schema';

interface UsersTabProps {
  control: Control<LinkFormValues>;
  isLoading: boolean;
}

export function UsersTab({ control, isLoading }: UsersTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center gap-2 text-[13px] font-bold text-gray-700">
        <Users className="h-4 w-4 text-cyan-500" />
        Xüsusi Şəxslər
      </div>
      <Controller
        control={control}
        name="target_users"
        render={({ field }) => (
          <ResponsibleUserSelector
            value={(field.value || []).map((id) => id.toString())}
            onChange={(ids) => {
              const parsed = ids
                .map((id) => parseInt(id, 10))
                .filter((n) => !isNaN(n));
              field.onChange(parsed);
            }}
            disabled={isLoading}
          />
        )}
      />
      <div className="p-3 rounded-xl bg-cyan-50/50 border border-cyan-100">
        <p className="text-[10px] text-cyan-600 font-bold leading-relaxed">
          Siyahıdakı hər bir şəxsə bu keçid bildiriş olaraq göndəriləcək.
        </p>
      </div>
    </div>
  );
}
