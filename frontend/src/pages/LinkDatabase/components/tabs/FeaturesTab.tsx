import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Star, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkFormValues } from '../../schemas/linkForm.schema';

interface FeaturesTabProps {
  control: Control<LinkFormValues>;
}

export function FeaturesTab({ control }: FeaturesTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <Controller
        control={control}
        name="is_featured"
        render={({ field }) => (
          <div
            onClick={() => field.onChange(!field.value)}
            className={cn(
              'p-10 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center text-center gap-4',
              field.value
                ? 'bg-yellow-50 border-yellow-400 shadow-2xl shadow-yellow-100'
                : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100 hover:border-yellow-200'
            )}
          >
            <div className={cn(
              'p-6 rounded-3xl transition-transform duration-500',
              field.value ? 'bg-yellow-400 text-white scale-110 shadow-xl' : 'bg-white text-gray-200'
            )}>
              <Star className={cn('h-12 w-12', field.value && 'fill-current')} />
            </div>
            <div>
              <h3 className={cn('text-xl font-black mb-2', field.value ? 'text-yellow-700' : 'text-gray-400')}>
                Seçilmiş Keçid
              </h3>
              <p className={cn('text-xs font-medium max-w-[280px]', field.value ? 'text-yellow-600' : 'text-gray-400')}>
                Bu link ana paneldə ən yuxarıda, fərqli rəngdə və hər kəsin diqqətini çəkəcək şəkildə görünəcək.
              </p>
            </div>
          </div>
        )}
      />

      <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white border border-gray-100 text-gray-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="text-[13px] font-bold text-gray-700">Analitika və İzləmə</div>
        </div>
        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
          Bu link üzrə kliklərin sayı, hansı regionlardan və rollardan daha çox keçid edildiyi avtomatik olaraq izlənilir. Statistikaları "İcmal" bölməsindən görə bilərsiniz.
        </p>
      </div>
    </div>
  );
}
