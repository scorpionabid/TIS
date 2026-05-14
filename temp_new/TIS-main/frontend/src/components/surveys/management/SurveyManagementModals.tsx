import React from 'react';
import { SurveyModal } from '@/components/modals/SurveyModal';
import { Survey } from '@/services/surveys';

interface SurveyManagementModalsProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  surveyToEdit: Survey | null;
  onSave: (data: any) => Promise<void>;
}

export const SurveyManagementModals: React.FC<SurveyManagementModalsProps> = ({
  showModal,
  setShowModal,
  surveyToEdit,
  onSave
}) => {
  return (
    <SurveyModal
      open={showModal}
      onClose={() => setShowModal(false)}
      survey={surveyToEdit}
      onSave={onSave}
    />
  );
};
