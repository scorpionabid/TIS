import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useDocumentUpload } from '@/hooks/documents/useDocumentUpload';
import { FileList } from './FileList';
import { DocumentForm } from './DocumentForm';
import { ShareSettings } from './ShareSettings';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadComplete
}: DocumentUploadModalProps) {
  const {
    // Form
    form,
    
    // State
    selectedFiles,
    uploadProgress,
    searchTerm,
    setSearchTerm,
    selectedInstitutions,
    selectedDepartments,
    shareWithAll,
    setShareWithAll,
    isPublic,
    setIsPublic,
    
    // Data
    institutions,
    departments,
    filteredInstitutions,
    institutionsLoading,
    departmentsLoading,
    
    // Actions
    handleFilesSelect,
    removeFile,
    toggleInstitution,
    toggleDepartment,
    handleSubmit,
    resetForm,
    
    // Utils
    getFileIcon,
    formatFileSize,
    
    // Mutations
    uploadMutation,
  } = useDocumentUpload(isOpen, onUploadComplete);

  const onSubmit = form.handleSubmit(handleSubmit);

  const handleClose = () => {
    if (!uploadMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sənəd Yüklə</DialogTitle>
          <DialogDescription>
            Sistəmə yeni sənədlər yükləyin və paylaşım parametrlərini təyin edin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files">Fayllar</TabsTrigger>
              <TabsTrigger value="details">Məlumatlar</TabsTrigger>
              <TabsTrigger value="sharing">Paylaşım</TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="mt-6">
              <FileList
                files={selectedFiles}
                onRemove={removeFile}
                onFilesSelect={handleFilesSelect}
                getFileIcon={getFileIcon}
                formatFileSize={formatFileSize}
                uploadProgress={uploadProgress}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <DocumentForm
                form={form}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
              />
            </TabsContent>

            <TabsContent value="sharing" className="mt-6">
              <ShareSettings
                institutions={institutions}
                departments={departments}
                filteredInstitutions={filteredInstitutions}
                selectedInstitutions={selectedInstitutions}
                selectedDepartments={selectedDepartments}
                shareWithAll={shareWithAll}
                searchTerm={searchTerm}
                institutionsLoading={institutionsLoading}
                departmentsLoading={departmentsLoading}
                onSearchChange={setSearchTerm}
                onToggleInstitution={toggleInstitution}
                onToggleDepartment={toggleDepartment}
                onShareWithAllChange={setShareWithAll}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-8">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={uploadMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button 
              type="submit" 
              disabled={uploadMutation.isPending || selectedFiles.length === 0}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Yüklənir...
                </>
              ) : (
                `Yüklə (${selectedFiles.length} fayl)`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}