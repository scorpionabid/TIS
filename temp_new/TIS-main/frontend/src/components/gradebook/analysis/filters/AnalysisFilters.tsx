import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hierarchyService, HierarchyNode } from '@/services/hierarchy';
import { academicYearService, AcademicYear } from '@/services/academicYears';
import { gradeService, Grade } from '@/services/grades';

export type GroupBy = 'class_level' | 'sector' | 'school' | 'grade' | 'subject' | 'language';

export interface AnalysisFilters {
  institution_id?: number;
  academic_year_ids?: number[];
  subject_ids?: number[];
  status: string;
  // Enriched filters
  sector_ids?: number[];
  school_ids?: number[];
  class_levels?: number[];
  grade_ids?: number[];
  teaching_languages?: string[];
  gender?: 'male' | 'female';
  group_by?: GroupBy[];
  view_mode?: 'flat' | 'nested';
}

interface AnalysisFiltersComponentProps {
  filters: AnalysisFilters;
  onFiltersChange: (filters: AnalysisFilters) => void;
}

interface InstitutionOption {
  id: number;
  name: string;
}

export function AnalysisFiltersComponent({ filters, onFiltersChange }: AnalysisFiltersComponentProps) {
  const { currentUser } = useAuth();
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const autoSetDone = useRef(false);

  // institution.level === 4 means School — only school users get auto-set
  const isSchoolUser = currentUser?.institution?.level === 4;

  const handleChange = (key: keyof AnalysisFilters, value: string | number | undefined | number[]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (isSchoolUser && currentUser?.institution?.id) {
          // School admin/teacher: auto-set institution_id once, hide picker
          setInstitutions([{ id: currentUser.institution.id, name: currentUser.institution.name ?? '' }]);
          if (!autoSetDone.current) {
            autoSetDone.current = true;
            onFiltersChange({ ...filters, institution_id: currentUser.institution.id });
          }
          return;
        }
        // RegionAdmin / SektorAdmin: load child schools for optional filtering
        const treeResponse = await hierarchyService.getHierarchy();
        const result: InstitutionOption[] = [];
        const extract = (nodes: HierarchyNode[]) => {
          for (const node of nodes) {
            if (node.level === 4) {
              result.push({ id: Number(node.id), name: node.name });
            } else if (node.children?.length) {
              extract(node.children);
            }
          }
        };
        extract(treeResponse.data ?? []);
        setInstitutions(result);
      } catch {
        setInstitutions([]);
      }
    };
    load();
  }, [isSchoolUser, currentUser?.institution?.id]);

  useEffect(() => {
    academicYearService.getAllForDropdown()
      .then(setAcademicYears)
      .catch(() => setAcademicYears([]));
  }, []);

  useEffect(() => {
    const params: { per_page: number; institution_id?: number } = { per_page: 100 };
    if (filters.institution_id) params.institution_id = filters.institution_id;
    gradeService.get(params)
      .then((result) => setGrades((result.items ?? []).filter((g) => g.class_level > 0)))
      .catch(() => setGrades([]));
  }, [filters.institution_id]);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Institution Filter — visible for RegionAdmin/SektorAdmin, hidden for school users */}
          {!isSchoolUser && (
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.institution_id?.toString() || 'all'}
                onValueChange={(value) => handleChange('institution_id', value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="h-9 border-slate-200">
                  <Building2 className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Bütün məktəblər" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün məktəblər</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id.toString()}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Academic Year Filter */}
          <div className="flex-1 min-w-[200px]">
            <Select
              value={filters.academic_year_ids?.[0]?.toString() || 'all'}
              onValueChange={(value) => handleChange('academic_year_ids', value === 'all' ? undefined : [parseInt(value)])}
            >
              <SelectTrigger className="h-9 border-slate-200">
                <Calendar className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <SelectValue placeholder="Bütün illər" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün illər</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id.toString()}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade Filter — only useful when institution is selected */}
          {(filters.institution_id || isSchoolUser) && grades.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.grade_ids?.[0]?.toString() || 'all'}
                onValueChange={(value) => handleChange('grade_ids', value === 'all' ? undefined : [parseInt(value)])}
              >
                <SelectTrigger className="h-9 border-slate-200">
                  <GraduationCap className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Bütün siniflər" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün siniflər</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {(g.full_name || `${g.class_level}${g.name}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
