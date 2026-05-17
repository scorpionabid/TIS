import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { TemplateForm } from './hooks/useScheduleTemplate';

interface TemplateCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateForm: TemplateForm;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateForm>>;
  onCreateTemplate: () => void;
  isCreating: boolean;
}

export const TemplateCreateDialog: React.FC<TemplateCreateDialogProps> = ({
  isOpen,
  onClose,
  templateForm,
  setTemplateForm,
  onCreateTemplate,
  isCreating
}) => {
  const handleGradeToggle = (grade: number) => {
    const newGrades = templateForm.grade_levels.includes(grade)
      ? templateForm.grade_levels.filter(g => g !== grade)
      : [...templateForm.grade_levels, grade];
    setTemplateForm({ ...templateForm, grade_levels: newGrades });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Cədvəl Şablonu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-name">Şablon Adı *</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Şablon adını daxil edin"
              />
            </div>
            <div>
              <Label htmlFor="template-type">Şablon Tipi</Label>
              <Select
                value={templateForm.type}
                onValueChange={(value: any) => setTemplateForm({ ...templateForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Həftəlik</SelectItem>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="exam">İmtahan</SelectItem>
                  <SelectItem value="custom">Xüsusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="template-description">Açıqlama</Label>
            <Textarea
              id="template-description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              placeholder="Şablon haqqında məlumat"
            />
          </div>

          {/* Grade Levels */}
          <div>
            <Label>Sinif Səviyyələri *</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(grade => (
                <Button
                  key={grade}
                  variant={templateForm.grade_levels.includes(grade) ? "default" : "outline"}
                  size="sm"
                  type="button"
                  onClick={() => handleGradeToggle(grade)}
                >
                  {grade}
                </Button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="max-periods">Maksimum Günlük Dərs</Label>
              <Input
                id="max-periods"
                type="number"
                value={templateForm.max_periods_per_day}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  max_periods_per_day: parseInt(e.target.value) || 7 
                })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="auto-assign"
                checked={templateForm.auto_assign_teachers}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  auto_assign_teachers: e.target.checked 
                })}
              />
              <Label htmlFor="auto-assign">Avtomatik müəllim təyinatı</Label>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="prefer-morning"
                checked={templateForm.prefer_morning_slots}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  prefer_morning_slots: e.target.checked 
                })}
              />
              <Label htmlFor="prefer-morning">Səhər saatlarına üstünlük</Label>
            </div>
          </div>

          {/* Additional Settings Row */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="balance-workload"
                checked={templateForm.balance_workload}
                onChange={(e) => setTemplateForm({ 
                  ...templateForm, 
                  balance_workload: e.target.checked 
                })}
              />
              <Label htmlFor="balance-workload">İş yükü balansı</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Ləğv Et
            </Button>
            <Button
              onClick={onCreateTemplate}
              disabled={isCreating}
            >
              {isCreating ? 'Yaradılır...' : 'Şablon Yarat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};