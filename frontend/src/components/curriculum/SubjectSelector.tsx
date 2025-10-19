/**
 * SubjectSelector Component
 *
 * Enhanced searchable subject selector with:
 * - Category grouping
 * - Search functionality
 * - Visual subject cards
 * - Default hours display
 */

import React, { useMemo } from 'react';
import Select, { GroupBase, StylesConfig } from 'react-select';
import { BookOpen } from 'lucide-react';

export interface SubjectOption {
  id: number;
  name: string;
  code: string;
  category: string;
  weekly_hours?: number;
  description?: string;
}

interface SubjectSelectorProps {
  subjects: SubjectOption[];
  value: number | null;
  onChange: (subjectId: number | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

// Category translations and colors
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  core: { label: 'Əsas Fənlər', color: '#3B82F6', icon: '📚' },
  science: { label: 'Elm Fənləri', color: '#10B981', icon: '🔬' },
  humanities: { label: 'Humanitar Fənlər', color: '#F59E0B', icon: '📖' },
  language: { label: 'Dil Fənləri', color: '#8B5CF6', icon: '🗣️' },
  arts: { label: 'İncəsənət', color: '#EC4899', icon: '🎨' },
  physical: { label: 'Fiziki Tərbiyə', color: '#EF4444', icon: '⚽' },
  technical: { label: 'Texniki Fənlər', color: '#6366F1', icon: '⚙️' },
  elective: { label: 'Seçmə Fənlər', color: '#64748B', icon: '📝' },
};

interface SelectOption {
  value: number;
  label: string;
  category: string;
  code: string;
  weeklyHours?: number;
  categoryLabel: string;
  categoryColor: string;
  categoryIcon: string;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  value,
  onChange,
  placeholder = 'Fənn seçin...',
  isDisabled = false,
}) => {
  // Group subjects by category
  const groupedOptions = useMemo(() => {
    const grouped: GroupBase<SelectOption>[] = [];
    const categoryMap = new Map<string, SelectOption[]>();

    subjects.forEach((subject) => {
      const config = CATEGORY_CONFIG[subject.category] || CATEGORY_CONFIG.elective;
      const option: SelectOption = {
        value: subject.id,
        label: subject.name,
        category: subject.category,
        code: subject.code,
        weeklyHours: subject.weekly_hours,
        categoryLabel: config.label,
        categoryColor: config.color,
        categoryIcon: config.icon,
      };

      if (!categoryMap.has(subject.category)) {
        categoryMap.set(subject.category, []);
      }
      categoryMap.get(subject.category)!.push(option);
    });

    // Convert to grouped format
    categoryMap.forEach((options, category) => {
      const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.elective;
      grouped.push({
        label: `${config.icon} ${config.label}`,
        options: options.sort((a, b) => a.label.localeCompare(b.label)),
      });
    });

    return grouped;
  }, [subjects]);

  // Find selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    for (const group of groupedOptions) {
      const found = group.options.find((opt) => opt.value === value);
      if (found) return found;
    }
    return null;
  }, [value, groupedOptions]);

  // Custom styles
  const customStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: '44px',
      borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': {
        borderColor: '#3B82F6',
      },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#3B82F6'
        : state.isFocused
        ? '#EFF6FF'
        : 'white',
      color: state.isSelected ? 'white' : '#111827',
      cursor: 'pointer',
      padding: '10px 12px',
    }),
    group: (base) => ({
      ...base,
      paddingTop: '8px',
      paddingBottom: '8px',
    }),
    groupHeading: (base) => ({
      ...base,
      fontSize: '13px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'none',
      marginBottom: '4px',
    }),
    menu: (base) => ({
      ...base,
      zIndex: 100,
    }),
  };

  // Custom option component
  const formatOptionLabel = (option: SelectOption) => (
    <div className="flex items-center justify-between py-1">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{option.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          Kod: {option.code}
          {option.weeklyHours && (
            <span className="ml-2">
              • {option.weeklyHours} saat/həftə
            </span>
          )}
        </div>
      </div>
      <div
        className="ml-3 px-2 py-1 rounded text-xs font-medium"
        style={{
          backgroundColor: `${option.categoryColor}15`,
          color: option.categoryColor,
        }}
      >
        {option.categoryIcon}
      </div>
    </div>
  );

  const handleChange = (newValue: SelectOption | null) => {
    onChange(newValue?.value || null);
  };

  // Type-safe Select component
  const TypedSelect = Select as React.ComponentType<any>;

  return (
    <div className="w-full">
      <TypedSelect
        value={selectedOption}
        onChange={handleChange}
        options={groupedOptions}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        placeholder={
          <div className="flex items-center gap-2 text-gray-500">
            <BookOpen className="h-4 w-4" />
            {placeholder}
          </div>
        }
        noOptionsMessage={() => 'Fənn tapılmadı'}
        isDisabled={isDisabled}
        isClearable
        isSearchable
        className="react-select-container"
        classNamePrefix="react-select"
      />
    </div>
  );
};

export default SubjectSelector;
