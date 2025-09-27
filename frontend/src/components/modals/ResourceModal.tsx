import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, FileText, Plus } from "lucide-react";
import { Resource } from "@/types/resources";
import { useResourceForm } from "@/hooks/useResourceForm";
import { LinkFormTab } from "@/components/resources/LinkFormTab";
import { DocumentFormTab } from "@/components/resources/DocumentFormTab";


interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType?: 'link' | 'document';
  resource?: Resource | null;
  mode?: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
}

export function ResourceModal({
  isOpen,
  onClose,
  resourceType = 'link',
  resource = null,
  mode = 'create',
  onResourceSaved,
}: ResourceModalProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'documents'>('links');

  // Set initial tab based on resourceType or resource
  useEffect(() => {
    if (resource) {
      setActiveTab(resource.type === 'link' ? 'links' : 'documents');
    } else {
      setActiveTab(resourceType === 'link' ? 'links' : 'documents');
    }
  }, [resource, resourceType]);

  // Use the custom hook for all form logic
  const {
    form,
    selectedFile,
    setSelectedFile,
    institutionSearch,
    setInstitutionSearch,
    availableInstitutions,
    filteredInstitutions,
    selectInstitutionsByLevel,
    selectInstitutionsByType,
    handleSubmit,
  } = useResourceForm({
    isOpen,
    activeTab,
    resource,
    mode,
    onResourceSaved,
    onClose,
  });


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold">
            {mode === 'create' ? 'Yeni Resurs' : 'Resurs Redaktə Et'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'links' | 'documents')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="links" className="text-sm">
                <Link className="h-4 w-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Sənəd
              </TabsTrigger>
            </TabsList>

            <TabsContent value="links" className="space-y-4 mt-0">
              <LinkFormTab
                form={form}
                availableInstitutions={availableInstitutions}
                filteredInstitutions={filteredInstitutions}
                institutionSearch={institutionSearch}
                setInstitutionSearch={setInstitutionSearch}
                selectInstitutionsByLevel={selectInstitutionsByLevel}
                selectInstitutionsByType={selectInstitutionsByType}
              />
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-0">
              <DocumentFormTab
                form={form}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                availableInstitutions={availableInstitutions}
                filteredInstitutions={filteredInstitutions}
                institutionSearch={institutionSearch}
                setInstitutionSearch={setInstitutionSearch}
                selectInstitutionsByLevel={selectInstitutionsByLevel}
                selectInstitutionsByType={selectInstitutionsByType}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Ləğv et
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
              {form.formState.isSubmitting ? 'Yüklənir...' : mode === 'create' ? 'Yaradın' : 'Yenilə'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}