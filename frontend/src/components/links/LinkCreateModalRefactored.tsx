import React from 'react';
import { Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLinkCreate } from './hooks/useLinkCreate';
import { LinkBasicInfo } from './LinkBasicInfo';
import { LinkSharingSettings } from './LinkSharingSettings';
import { LinkTargetSelection } from './LinkTargetSelection';
import { LinkAccessControl } from './LinkAccessControl';

interface LinkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

export const LinkCreateModal: React.FC<LinkCreateModalProps> = ({
  isOpen,
  onClose,
  onLinkCreated
}) => {
  const {
    // State
    creating,
    institutionSearch,
    departmentSearch,
    institutionTypeFilter,
    selectedInstitutionForDepartments,
    
    // Data
    sharingOptions,
    institutions,
    departments,
    filteredInstitutions,
    filteredDepartments,
    availableInstitutionTypes,
    sharingOptionsLoading,
    institutionsLoading,
    departmentsLoading,
    
    // Form
    form,
    
    // Actions
    setInstitutionSearch,
    setDepartmentSearch,
    setInstitutionTypeFilter,
    setSelectedInstitutionForDepartments,
    handleSelectAllInstitutions,
    handleDeselectAllInstitutions,
    handleSelectAllDepartments,
    handleDeselectAllDepartments,
    handleSelectAllRoles,
    handleDeselectAllRoles,
    onSubmit,
    handleClose
  } = useLinkCreate({ onLinkCreated, onClose });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5" />
            <span>Yeni Link Əlavə Et</span>
          </DialogTitle>
          <DialogDescription>
            Faydalı linklər yaradın və istifadəçilər ilə paylaşın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <LinkBasicInfo
            form={form}
            creating={creating}
          />

          {/* Sharing Settings */}
          <LinkSharingSettings
            form={form}
            creating={creating}
            sharingOptions={sharingOptions}
            sharingOptionsLoading={sharingOptionsLoading}
          />

          {/* Target Selection */}
          <LinkTargetSelection
            form={form}
            creating={creating}
            filteredInstitutions={filteredInstitutions}
            filteredDepartments={filteredDepartments}
            availableInstitutionTypes={availableInstitutionTypes}
            sharingOptions={sharingOptions}
            institutionsLoading={institutionsLoading}
            departmentsLoading={departmentsLoading}
            institutionSearch={institutionSearch}
            departmentSearch={departmentSearch}
            institutionTypeFilter={institutionTypeFilter}
            selectedInstitutionForDepartments={selectedInstitutionForDepartments}
            setInstitutionSearch={setInstitutionSearch}
            setDepartmentSearch={setDepartmentSearch}
            setInstitutionTypeFilter={setInstitutionTypeFilter}
            setSelectedInstitutionForDepartments={setSelectedInstitutionForDepartments}
            handleSelectAllInstitutions={handleSelectAllInstitutions}
            handleDeselectAllInstitutions={handleDeselectAllInstitutions}
            handleSelectAllDepartments={handleSelectAllDepartments}
            handleDeselectAllDepartments={handleDeselectAllDepartments}
            handleSelectAllRoles={handleSelectAllRoles}
            handleDeselectAllRoles={handleDeselectAllRoles}
          />

          {/* Access Control */}
          <LinkAccessControl
            form={form}
            creating={creating}
          />
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={creating}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={creating}
            onClick={form.handleSubmit(onSubmit)}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Yaradılır...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Link Yarat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};