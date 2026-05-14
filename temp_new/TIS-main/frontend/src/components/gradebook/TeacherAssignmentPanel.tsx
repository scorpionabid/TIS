import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X, UserPlus } from 'lucide-react';
import { gradeBookService, GradeBookTeacher } from '@/services/gradeBook';
import { teacherService } from '@/services/teachers';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface TeacherAssignmentPanelProps {
  gradeBookId: number;
  teachers: GradeBookTeacher[];
  onUpdate: () => void;
}

export function TeacherAssignmentPanel({ gradeBookId, teachers, onUpdate }: TeacherAssignmentPanelProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [groupLabel, setGroupLabel] = useState('');

  // Search teachers
  const { data: searchResults } = useQuery({
    queryKey: ['teacher-search', searchQuery],
    queryFn: () => teacherService.searchTeachers(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const handleAssign = async () => {
    if (!selectedTeacher) {
      toast({
        title: 'Xəta',
        description: 'Müəllim seçin',
        variant: 'destructive',
      });
      return;
    }

    try {
      await gradeBookService.assignTeacher(gradeBookId, {
        teacher_id: Number(selectedTeacher),
        group_label: groupLabel || undefined,
        is_primary: true,
      });

      toast({
        title: 'Uğurlu',
        description: 'Müəllim təyin edildi',
      });

      setIsAdding(false);
      setSelectedTeacher('');
      setGroupLabel('');
      setSearchQuery('');
      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Müəllim təyin edilərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (assignmentId: number) => {
    try {
      await gradeBookService.removeTeacher(assignmentId);
      toast({
        title: 'Uğurlu',
        description: 'Müəllim təyinatı silindi',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Silinərkən xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Müəllimlər
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Assigned Teachers List */}
        <div className="flex flex-wrap gap-2 mb-4">
          {teachers.map((assignment) => (
            <Badge
              key={assignment.id}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-2"
            >
              <span>
                {assignment.teacher?.last_name} {assignment.teacher?.first_name?.[0]}.
                {assignment.group_label && ` (${assignment.group_label} qrup)`}
              </span>
              <button
                onClick={() => handleRemove(assignment.id)}
                className="ml-1 text-gray-500 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {teachers.length === 0 && (
            <p className="text-sm text-gray-500">Müəllim təyin edilməyib</p>
          )}
        </div>

        {/* Add Teacher Button */}
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Müəllim Əlavə Et
          </Button>
        )}

        {/* Add Teacher Form */}
        {isAdding && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="space-y-2">
              <Label>Müəllim Axtarışı (UTSI, Soyad, Ad)</Label>
              <Input
                placeholder="Axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searchResults && searchResults.length > 0 && (
                <div className="border rounded bg-white max-h-40 overflow-y-auto">
                  {searchResults.map((teacher: any) => (
                    <div
                      key={teacher.id}
                      className={`p-2 cursor-pointer hover:bg-gray-100 ${
                        selectedTeacher === String(teacher.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedTeacher(String(teacher.id))}
                    >
                      <div className="font-medium">
                        {teacher.last_name} {teacher.first_name} {teacher.father_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        UTSI: {teacher.utsi_code || 'Yoxdur'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Qrup (opsional)</Label>
              <Select 
                value={groupLabel || 'all'} 
                onValueChange={(value) => setGroupLabel(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qrup seçin (vacib deyil)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün sinif</SelectItem>
                  <SelectItem value="A">A qrupu</SelectItem>
                  <SelectItem value="B">B qrupu</SelectItem>
                  <SelectItem value="C">C qrupu</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Əgər sinif bölünübsə, hər qrup üçün ayrı müəllim təyin edin
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Ləğv Et
              </Button>
              <Button size="sm" onClick={handleAssign} disabled={!selectedTeacher}>
                <UserPlus className="w-4 h-4 mr-2" />
                Təyin Et
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
