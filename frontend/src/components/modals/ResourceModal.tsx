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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {mode === 'create' ? 'Yeni Resurs Yaradın' : 'Resurs Redaktə Et'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'links' | 'documents')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="links" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Linklər
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sənədlər
              </TabsTrigger>
            </TabsList>

            <TabsContent value="links" className="space-y-6">
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

            <TabsContent value="documents" className="space-y-6">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Yüklənir...' : mode === 'create' ? 'Yaradın' : 'Yenilə'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}