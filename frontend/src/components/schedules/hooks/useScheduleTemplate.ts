import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Types
export interface ScheduleTemplate {
  id: number;
  name: string;
  description?: string;
  type: 'weekly' | 'daily' | 'exam' | 'custom';
  grade_levels: number[];
  subjects_config: SubjectConfig[];
  time_slots: TimeSlotConfig[];
  constraints: TemplateConstraints;
  metadata: {
    created_by: number;
    created_at: string;
    last_used: string;
    usage_count: number;
    is_default: boolean;
    is_public: boolean;
    tags: string[];
  };
  settings: {
    auto_assign_teachers: boolean;
    prefer_morning_slots: boolean;
    avoid_single_periods: boolean;
    balance_workload: boolean;
    consider_room_capacity: boolean;
    allow_conflicts: boolean;
    max_daily_periods: number;
    min_break_duration: number;
  };
}

export interface SubjectConfig {
  subject_id: number;
  subject_name: string;
  weekly_periods: number;
  period_duration: number;
  preferred_times: string[];
  required_room_type?: string;
  requires_lab: boolean;
  max_consecutive: number;
  priority: 'high' | 'medium' | 'low';
}

export interface TimeSlotConfig {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration: number;
  type: 'regular' | 'break' | 'lunch' | 'activity';
  is_available: boolean;
}

export interface TemplateConstraints {
  max_periods_per_day: number;
  min_break_between_classes: number;
  lunch_break_start: string;
  lunch_break_duration: number;
  no_class_times: string[];
  preferred_teacher_assignments: Record<number, number[]>;
  room_restrictions: Record<number, number[]>;
}

export interface TemplateForm {
  name: string;
  description: string;
  type: 'weekly' | 'daily' | 'exam' | 'custom';
  grade_levels: number[];
  max_periods_per_day: number;
  auto_assign_teachers: boolean;
  prefer_morning_slots: boolean;
  balance_workload: boolean;
}

interface UseScheduleTemplateProps {
  onTemplateSelect?: (template: ScheduleTemplate) => void;
  selectedGradeLevel?: number;
}

export const useScheduleTemplate = ({
  onTemplateSelect,
  selectedGradeLevel
}: UseScheduleTemplateProps = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Template form state
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: '',
    description: '',
    type: 'weekly',
    grade_levels: [],
    max_periods_per_day: 7,
    auto_assign_teachers: true,
    prefer_morning_slots: true,
    balance_workload: true
  });

  // Mock data function
  const getMockTemplates = (): ScheduleTemplate[] => [
    {
      id: 1,
      name: "Standart Həftəlik Cədvəl",
      description: "5-9-cu siniflər üçün standart həftəlik dərs cədvəli şablonu",
      type: "weekly",
      grade_levels: [5, 6, 7, 8, 9],
      subjects_config: [
        {
          subject_id: 1,
          subject_name: "Riyaziyyat",
          weekly_periods: 4,
          period_duration: 45,
          preferred_times: ["09:00", "10:00", "11:00"],
          requires_lab: false,
          max_consecutive: 2,
          priority: "high"
        },
        {
          subject_id: 2,
          subject_name: "Fizika",
          weekly_periods: 2,
          period_duration: 45,
          preferred_times: ["10:00", "11:00"],
          required_room_type: "laboratory",
          requires_lab: true,
          max_consecutive: 1,
          priority: "medium"
        }
      ],
      time_slots: [
        {
          id: "1",
          day_of_week: 1,
          start_time: "08:30",
          end_time: "09:15",
          duration: 45,
          type: "regular",
          is_available: true
        }
      ],
      constraints: {
        max_periods_per_day: 7,
        min_break_between_classes: 10,
        lunch_break_start: "12:30",
        lunch_break_duration: 30,
        no_class_times: ["13:00", "17:00"],
        preferred_teacher_assignments: {},
        room_restrictions: {}
      },
      metadata: {
        created_by: 1,
        created_at: "2024-08-01T00:00:00Z",
        last_used: "2024-08-15T00:00:00Z",
        usage_count: 15,
        is_default: true,
        is_public: true,
        tags: ["standart", "həftəlik", "orta"]
      },
      settings: {
        auto_assign_teachers: true,
        prefer_morning_slots: true,
        avoid_single_periods: true,
        balance_workload: true,
        consider_room_capacity: true,
        allow_conflicts: false,
        max_daily_periods: 7,
        min_break_duration: 10
      }
    },
    {
      id: 2,
      name: "İmtahan Cədvəli Şablonu",
      description: "Final imtahanları üçün xüsusi cədvəl şablonu",
      type: "exam",
      grade_levels: [9, 10, 11],
      subjects_config: [],
      time_slots: [],
      constraints: {
        max_periods_per_day: 3,
        min_break_between_classes: 30,
        lunch_break_start: "12:00",
        lunch_break_duration: 60,
        no_class_times: [],
        preferred_teacher_assignments: {},
        room_restrictions: {}
      },
      metadata: {
        created_by: 1,
        created_at: "2024-07-15T00:00:00Z",
        last_used: "2024-08-10T00:00:00Z",
        usage_count: 8,
        is_default: false,
        is_public: true,
        tags: ["imtahan", "final", "test"]
      },
      settings: {
        auto_assign_teachers: false,
        prefer_morning_slots: true,
        avoid_single_periods: false,
        balance_workload: false,
        consider_room_capacity: true,
        allow_conflicts: false,
        max_daily_periods: 3,
        min_break_duration: 30
      }
    }
  ];

  // Fetch templates
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['schedule-templates', selectedGradeLevel],
    queryFn: async () => {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 500));
      return getMockTemplates();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now(), ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates'] });
      setShowCreateDialog(false);
      resetTemplateForm();
      toast({
        title: "Şablon Yaradıldı",
        description: "Dərs cədvəli şablonu uğurla yaradıldı",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Şablon yaradılarkən xəta baş verdi",
        variant: "destructive",
      });
    }
  });

  // Generate schedule from template mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async (template: ScheduleTemplate) => {
      // Mock API call - replace with actual service
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { id: Date.now(), template_id: template.id };
    },
    onSuccess: (data, template) => {
      toast({
        title: "Cədvəl Yaradıldı",
        description: `${template.name} şablonundan yeni cədvəl yaradıldı`,
      });
      onTemplateSelect?.(template);
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Cədvəl yaradılarkən xəta baş verdi",
        variant: "destructive",
      });
    }
  });

  // Utility functions
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      type: 'weekly',
      grade_levels: [],
      max_periods_per_day: 7,
      auto_assign_teachers: true,
      prefer_morning_slots: true,
      balance_workload: true
    });
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'weekly': 'Həftəlik',
      'daily': 'Günlük',
      'exam': 'İmtahan',
      'custom': 'Xüsusi'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weekly': return 'default';
      case 'daily': return 'secondary';
      case 'exam': return 'warning';
      case 'custom': return 'outline';
      default: return 'secondary';
    }
  };

  // Event handlers
  const handleCreateTemplate = () => {
    if (!templateForm.name || templateForm.grade_levels.length === 0) {
      toast({
        title: "Məlumat Eksikliyi",
        description: "Şablon adı və sinif səviyyələrini daxil edin",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate({
      ...templateForm,
      metadata: {
        created_by: 1, // Current user
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: 0,
        is_default: false,
        is_public: false,
        tags: []
      }
    });
  };

  const handleGenerateSchedule = (template: ScheduleTemplate) => {
    generateScheduleMutation.mutate(template);
  };

  const handleUseTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect?.(template);
    toast({
      title: "Şablon Seçildi",
      description: `${template.name} şablonu aktiv edildi`,
    });
  };

  const handlePreviewTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  // Filtering
  const filteredTemplates = templates?.filter(template => {
    if (filterType !== 'all' && template.type !== filterType) return false;
    if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedGradeLevel && !template.grade_levels.includes(selectedGradeLevel)) return false;
    return true;
  });

  return {
    // State
    selectedTemplate,
    showCreateDialog,
    showPreviewDialog,
    filterType,
    searchTerm,
    templateForm,
    
    // Data
    templates: filteredTemplates,
    isLoading,
    
    // Mutations
    createTemplateMutation,
    generateScheduleMutation,
    
    // Actions
    setSelectedTemplate,
    setShowCreateDialog,
    setShowPreviewDialog,
    setFilterType,
    setSearchTerm,
    setTemplateForm,
    resetTemplateForm,
    refetch,
    
    // Event handlers
    handleCreateTemplate,
    handleGenerateSchedule,
    handleUseTemplate,
    handlePreviewTemplate,
    
    // Utilities
    getTypeLabel,
    getTypeColor
  };
};