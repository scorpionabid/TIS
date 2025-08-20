import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2 } from 'lucide-react';
import { AssessmentType } from '../../services/assessmentTypes';
import { useAssessmentTypeForm } from '../../hooks/assessment-types/useAssessmentTypeForm';
import { BasicInfoTab } from './BasicInfoTab';
import { InstitutionAssignmentTab } from './InstitutionAssignmentTab';
import { SchedulingTab } from './SchedulingTab';
import { PreviewTab } from './PreviewTab';

interface AssessmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentType?: AssessmentType;
  onSuccess: () => void;
  mode?: 'basic' | 'enhanced';
  showInstitutionAssignment?: boolean;
  showScheduling?: boolean;
}

export default function AssessmentTypeModal({ 
  isOpen, 
  onClose, 
  assessmentType, 
  onSuccess,
  mode = 'basic',
  showInstitutionAssignment = false,
  showScheduling = false
}: AssessmentTypeModalProps) {
  const {
    // State
    loading,
    loadingInstitutions,
    institutions,
    selectedInstitutions,
    setSelectedInstitutions,
    institutionSearch,
    setInstitutionSearch,
    selectedTab,
    setSelectedTab,
    dueDate,
    setDueDate,
    isRecurring,
    setIsRecurring,
    recurringFrequency,
    setRecurringFrequency,
    notificationDays,
    setNotificationDays,
    criteria,
    setCriteria,
    formData,
    setFormData,
    
    // Computed
    filteredInstitutions,
    
    // Actions
    addCriteria,
    removeCriteria,
    updateCriteria,
    handleSubmit,
  } = useAssessmentTypeForm(assessmentType, onSuccess, onClose);

  const tabs = ['basic'];
  if (showInstitutionAssignment) tabs.push('institutions');
  if (showScheduling) tabs.push('scheduling');
  if (mode === 'enhanced') tabs.push('preview');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {assessmentType ? 'Qiymətləndirmə Növünü Redaktə Et' : 'Yeni Qiymətləndirmə Növü'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="basic">Əsas Məlumat</TabsTrigger>
            {showInstitutionAssignment && (
              <TabsTrigger value="institutions">Müəssisələr</TabsTrigger>
            )}
            {showScheduling && (
              <TabsTrigger value="scheduling">Vaxt Cədvəli</TabsTrigger>
            )}
            {mode === 'enhanced' && (
              <TabsTrigger value="preview">Nəzərdən Keçir</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <BasicInfoTab
              formData={formData}
              setFormData={setFormData}
              criteria={criteria}
              addCriteria={addCriteria}
              removeCriteria={removeCriteria}
              updateCriteria={updateCriteria}
            />
          </TabsContent>

          {showInstitutionAssignment && (
            <TabsContent value="institutions" className="mt-6">
              <InstitutionAssignmentTab
                institutions={institutions}
                selectedInstitutions={selectedInstitutions}
                setSelectedInstitutions={setSelectedInstitutions}
                institutionSearch={institutionSearch}
                setInstitutionSearch={setInstitutionSearch}
                filteredInstitutions={filteredInstitutions}
                loadingInstitutions={loadingInstitutions}
              />
            </TabsContent>
          )}

          {showScheduling && (
            <TabsContent value="scheduling" className="mt-6">
              <SchedulingTab
                dueDate={dueDate}
                setDueDate={setDueDate}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                recurringFrequency={recurringFrequency}
                setRecurringFrequency={setRecurringFrequency}
                notificationDays={notificationDays}
                setNotificationDays={setNotificationDays}
              />
            </TabsContent>
          )}

          {mode === 'enhanced' && (
            <TabsContent value="preview" className="mt-6">
              <PreviewTab
                formData={formData}
                criteria={criteria}
                selectedInstitutions={selectedInstitutions}
                institutions={institutions}
                dueDate={dueDate}
                isRecurring={isRecurring}
                recurringFrequency={recurringFrequency}
                notificationDays={notificationDays}
              />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Ləğv et
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {assessmentType ? 'Yenilənir...' : 'Yaradılır...'}
              </>
            ) : (
              assessmentType ? 'Yenilə' : 'Yarat'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}