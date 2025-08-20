import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { NewClassData } from './hooks/useSchoolClassManager';

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface ClassCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newClassData: NewClassData;
  setNewClassData: React.Dispatch<React.SetStateAction<NewClassData>>;
  onCreateClass: () => void;
  teachers?: Teacher[];
  getCurrentAcademicYear: () => string;
  isCreating: boolean;
}

export const ClassCreateDialog: React.FC<ClassCreateDialogProps> = ({
  isOpen,
  onClose,
  newClassData,
  setNewClassData,
  onCreateClass,
  teachers,
  getCurrentAcademicYear,
  isCreating
}) => {
  const isFormValid = newClassData.name && newClassData.grade_level && newClassData.capacity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni sinif yarat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Class Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Sinif adı *</Label>
            <Input
              id="name"
              value={newClassData.name}
              onChange={(e) => setNewClassData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="məs. 5-A"
            />
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <Label htmlFor="grade_level">Sinif səviyyəsi *</Label>
            <Select 
              value={newClassData.grade_level} 
              onValueChange={(value) => setNewClassData(prev => ({ ...prev, grade_level: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Səviyyə seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Anasinifi</SelectItem>
                {[...Array(11)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {`${i + 1}. sinif`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room Number and Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Otaq nömrəsi</Label>
              <Input
                id="room_number"
                value={newClassData.room_number}
                onChange={(e) => setNewClassData(prev => ({ ...prev, room_number: e.target.value }))}
                placeholder="məs. 201"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Tutum *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="50"
                value={newClassData.capacity}
                onChange={(e) => setNewClassData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="25"
              />
            </div>
          </div>

          {/* Class Teacher */}
          <div className="space-y-2">
            <Label htmlFor="class_teacher">Sinif rəhbəri</Label>
            <Select 
              value={newClassData.class_teacher_id} 
              onValueChange={(value) => setNewClassData(prev => ({ ...prev, class_teacher_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Müəllim seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Hələlik təyin etmə</SelectItem>
                {teachers?.filter(t => t.is_active).map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.first_name} {teacher.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <Label htmlFor="academic_year">Akademik il</Label>
            <Select 
              value={newClassData.academic_year} 
              onValueChange={(value) => setNewClassData(prev => ({ ...prev, academic_year: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={getCurrentAcademicYear()}>{getCurrentAcademicYear()}</SelectItem>
                <SelectItem value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}>
                  {`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button 
              onClick={onCreateClass}
              disabled={!isFormValid || isCreating}
            >
              {isCreating ? 'Yaradılır...' : 'Yarat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};