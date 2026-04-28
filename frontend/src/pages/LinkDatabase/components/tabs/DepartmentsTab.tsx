import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkFormValues } from '../../schemas/linkForm.schema';
import type { Department } from '../../types/linkDatabase.types';

interface DepartmentsTabProps {
  control: Control<LinkFormValues>;
  departments: Department[];
}

export function DepartmentsTab({ control, departments }: DepartmentsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
        <Target className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-[13px] font-bold text-indigo-900">Departament Hədəfləmə</div>
          <p className="text-[11px] text-indigo-700 font-medium leading-relaxed mt-0.5">
            Bu link seçilən departamentlərdə görünəcək. Birdən çox departament seçmək mümkündür.
          </p>
        </div>
      </div>

      <Controller
        control={control}
        name="target_departments"
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-2">
            {departments.map((dept) => {
              const checked = (field.value || []).includes(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    const current = field.value || [];
                    field.onChange(
                      checked
                        ? current.filter((id) => id !== dept.id)
                        : [...current, dept.id]
                    );
                  }}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl text-left font-bold transition-all border-2',
                    checked
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                    checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                  )}>
                    {checked && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm">{dept.name}</span>
                  {checked && <CheckCircle2 className="h-4 w-4 text-indigo-500 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
