import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { subjectService } from '@/services/subjects';
import type { NewAssessmentData } from './hooks/useAssessmentGradebook';

interface AssessmentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  newAssessment: NewAssessmentData;
  setNewAssessment: (assessment: NewAssessmentData) => void;
  onCreateAssessment: () => void;
  isCreating: boolean;
  selectedClassId: number | null;
}

export const AssessmentCreateModal: React.FC<AssessmentCreateModalProps> = ({
  isOpen,
  onClose,
  newAssessment,
  setNewAssessment,
  onCreateAssessment,
  isCreating,
  selectedClassId
}) => {
  const handleInputChange = (field: keyof NewAssessmentData, value: string) => {
    setNewAssessment({
      ...newAssessment,
      [field]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateAssessment();
  };

  const isFormValid = () => {
    return !!(
      selectedClassId &&
      newAssessment.title &&
      newAssessment.subject &&
      newAssessment.assessment_type &&
      newAssessment.total_points &&
      newAssessment.date
    );
  };

  const assessmentTypes = [
    { value: 'quiz', label: 'Sınaq' },
    { value: 'exam', label: 'İmtahan' },
    { value: 'homework', label: 'Ev tapşırığı' },
    { value: 'project', label: 'Layihə' },
    { value: 'presentation', label: 'Təqdimat' },
    { value: 'lab', label: 'Laboratoriya' },
    { value: 'midterm', label: 'Ara imtahan' },
    { value: 'final', label: 'Yekun imtahan' },
    { value: 'oral', label: 'Şifahi' },
    { value: 'written', label: 'Yazılı' },
    { value: 'practical', label: 'Praktiki' }
  ];

  // Load subjects dynamically
  const { data: subjectsResponse } = useQuery({
    queryKey: ['assessment-subjects'],
    queryFn: () => subjectService.getSubjects(),
  });

  const subjectSuggestions = (subjectsResponse?.data || []).map((subject: any) => subject.name);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni qiymətləndirmə yarat
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Başlıq <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={newAssessment.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="məs. Riyaziyyat çoxhədlilər mövzusu üzrə test"
                className="w-full"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  Fənn <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="subject"
                    value={newAssessment.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Fənn adını daxil edin"
                    list="subject-suggestions"
                    required
                  />
                  <datalist id="subject-suggestions">
                    {subjectSuggestions.map(subject => (
                      <option key={subject} value={subject} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessment_type" className="text-sm font-medium">
                  Qiymətləndirmə növü <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newAssessment.assessment_type} 
                  onValueChange={(value) => handleInputChange('assessment_type', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Növ seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {assessmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_points" className="text-sm font-medium">
                  Maksimum bal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_points"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={newAssessment.total_points}
                  onChange={(e) => handleInputChange('total_points', e.target.value)}
                  placeholder="100"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Qiymətləndirmənin maksimum bal sayı
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Qiymətləndirmə tarixi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={newAssessment.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Qiymətləndirmənin keçirildiyi tarix
                </p>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-foreground">Əlavə parametrlər</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="text-sm text-muted-foreground">
                  Qiymətləndirmə layihə statusunda yaradılacaq
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Sinif</Label>
                <div className="text-sm text-muted-foreground">
                  Seçilmiş sinif üçün yaradılacaq
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Tələb olunan sahələr
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                disabled={isCreating}
              >
                Ləğv et
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid() || isCreating}
                className="min-w-24"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Yaradılır...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Yarat
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <strong>Məsləhət:</strong> Qiymətləndirmə yaradıldıqdan sonra şagirdlərin qiymətlərini daxil edə və nəticələri idarə edə biləcəksiniz.
        </div>
      </DialogContent>
    </Dialog>
  );
};