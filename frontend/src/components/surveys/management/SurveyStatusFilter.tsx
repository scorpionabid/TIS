import { Button } from '@/components/ui/button';

export type StatusFilterValue = 'all' | 'draft' | 'active' | 'completed' | 'archived';

const STATUS_LABELS: Record<StatusFilterValue, string> = {
  all:       'Hamısı',
  draft:     'Layihə',
  active:    'Aktiv',
  completed: 'Tamamlandı',
  archived:  'Arxivləndi',
};

const STATUS_VALUES = Object.keys(STATUS_LABELS) as StatusFilterValue[];

interface SurveyStatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

export function SurveyStatusFilter({ value, onChange }: SurveyStatusFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {STATUS_VALUES.map((status) => (
        <Button
          key={status}
          variant={value === status ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(status)}
        >
          {STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
