/**
 * TeacherRatingFilters Component
 *
 * Filter panel for teacher rating list
 */

import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Search, X } from 'lucide-react';
import type { TeacherRatingFilters } from '../../types/teacherRating';

const ALL_OPTION_VALUE = '__ALL__';

interface TeacherRatingFiltersProps {
  filters: TeacherRatingFilters;
  onChange: (filters: TeacherRatingFilters) => void;
  onReset: () => void;
  schools?: Array<{ id: number; name: string }>;
  subjects?: Array<{ id: number; name: string }>;
  academicYears?: Array<{ id: number; name: string }>;
}

export function TeacherRatingFiltersComponent({
  filters,
  onChange,
  onReset,
  schools = [],
  subjects = [],
  academicYears = [],
}: TeacherRatingFiltersProps) {
  const handleChange = (key: keyof TeacherRatingFilters, value: any) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.schoolId ||
    filters.subjectId ||
    filters.academicYearId ||
    filters.ageBand ||
    filters.isActive !== null ||
    filters.minScore ||
    filters.maxScore;

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filterlər</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Sıfırla
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Axtarış</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="UTIS, Ad, Soyad..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Academic Year */}
        <div className="space-y-2">
          <Label htmlFor="academicYear">Tədris İli</Label>
          <Select
            value={
              filters.academicYearId === null || filters.academicYearId === undefined
                ? ALL_OPTION_VALUE
                : filters.academicYearId.toString()
            }
            onValueChange={(value) =>
              handleChange(
                'academicYearId',
                value === ALL_OPTION_VALUE ? null : parseInt(value)
              )
            }
          >
            <SelectTrigger id="academicYear">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>Hamısı</SelectItem>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id.toString()}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* School */}
        <div className="space-y-2">
          <Label htmlFor="school">Məktəb</Label>
          <Select
            value={
              filters.schoolId === null || filters.schoolId === undefined
                ? ALL_OPTION_VALUE
                : filters.schoolId.toString()
            }
            onValueChange={(value) =>
              handleChange(
                'schoolId',
                value === ALL_OPTION_VALUE ? null : parseInt(value)
              )
            }
          >
            <SelectTrigger id="school">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>Hamısı</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id.toString()}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Fənn</Label>
          <Select
            value={
              filters.subjectId === null || filters.subjectId === undefined
                ? ALL_OPTION_VALUE
                : filters.subjectId.toString()
            }
            onValueChange={(value) =>
              handleChange(
                'subjectId',
                value === ALL_OPTION_VALUE ? null : parseInt(value)
              )
            }
          >
            <SelectTrigger id="subject">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>Hamısı</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age Band */}
        <div className="space-y-2">
          <Label htmlFor="ageBand">Yaş Qrupu</Label>
          <Select
            value={filters.ageBand ?? ALL_OPTION_VALUE}
            onValueChange={(value) =>
              handleChange('ageBand', value === ALL_OPTION_VALUE ? null : value)
            }
          >
            <SelectTrigger id="ageBand">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>Hamısı</SelectItem>
              <SelectItem value="20-29">20-29</SelectItem>
              <SelectItem value="30-39">30-39</SelectItem>
              <SelectItem value="40-49">40-49</SelectItem>
              <SelectItem value="50-59">50-59</SelectItem>
              <SelectItem value="60+">60+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={
              filters.isActive === null
                ? ALL_OPTION_VALUE
                : filters.isActive
                ? 'active'
                : 'inactive'
            }
            onValueChange={(value) =>
              handleChange(
                'isActive',
                value === ALL_OPTION_VALUE ? null : value === 'active'
              )
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>Hamısı</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Score */}
        <div className="space-y-2">
          <Label htmlFor="minScore">Min Bal</Label>
          <Input
            id="minScore"
            type="number"
            min="0"
            max="100"
            placeholder="0"
            value={filters.minScore || ''}
            onChange={(e) =>
              handleChange('minScore', e.target.value ? parseFloat(e.target.value) : null)
            }
          />
        </div>

        {/* Max Score */}
        <div className="space-y-2">
          <Label htmlFor="maxScore">Max Bal</Label>
          <Input
            id="maxScore"
            type="number"
            min="0"
            max="100"
            placeholder="100"
            value={filters.maxScore || ''}
            onChange={(e) =>
              handleChange('maxScore', e.target.value ? parseFloat(e.target.value) : null)
            }
          />
        </div>
      </div>
    </div>
  );
}

export { TeacherRatingFiltersComponent as TeacherRatingFilters };
