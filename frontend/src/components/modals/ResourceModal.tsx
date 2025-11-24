import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, FileText } from "lucide-react";
import { Resource } from "@/types/resources";
import { useResourceForm } from "@/hooks/useResourceForm";
import { LinkFormTab } from "@/components/resources/LinkFormTab";
import { DocumentFormTab } from "@/components/resources/DocumentFormTab";
import {
  MinimalDialog,
  MinimalDialogContent,
  MinimalDialogDescription,
  MinimalDialogTitle,
} from "@/components/ui/minimal-dialog";


interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType?: 'link' | 'document';
  resource?: Resource | null;
  mode?: 'create' | 'edit';
  onResourceSaved?: (resource: Resource) => void;
  lockedTab?: 'links' | 'documents';
}

export function ResourceModal({
  isOpen,
  onClose,
  resourceType = 'link',
  resource = null,
  mode = 'create',
  onResourceSaved,
  lockedTab,
}: ResourceModalProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'documents'>('links');

  // Set initial tab based on resourceType or resource
  useEffect(() => {
    if (lockedTab) {
      setActiveTab((prev) => (prev === lockedTab ? prev : lockedTab));
      return;
    }

    const derivedTab = resource
      ? resource.type === 'link' ? 'links' : 'documents'
      : resourceType === 'link'
        ? 'links'
        : 'documents';

    setActiveTab((prev) => (prev === derivedTab ? prev : derivedTab));
  }, [resource, resourceType, lockedTab]);

  // Use the custom hook for all form logic
  const {
    form,
    maybeDefaultInstitutions,
    selectedFile,
    setSelectedFile,
    availableInstitutions,
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
    <MinimalDialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <MinimalDialogContent className="max-h-[85vh] h-fit flex flex-col">
        <MinimalDialogDescription id="resource-modal-desc">
          Resurs əlavə etmə və ya redaktə etmə pəncərəsi.
        </MinimalDialogDescription>
        <div className="pb-4 flex-shrink-0">
          <MinimalDialogTitle asChild>
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'Yeni Resurs' : 'Resurs Redaktə Et'}
            </h2>
          </MinimalDialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-4">
            {lockedTab ? (
              lockedTab === 'links' ? (
                <LinkFormTab
                  form={form}
                  maybeDefaultInstitutions={maybeDefaultInstitutions}
                  availableInstitutions={availableInstitutions}
                  isOpen={isOpen}
                  mode={mode}
                  resource={resource}
                />
              ) : (
                <DocumentFormTab
                  form={form}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  availableInstitutions={availableInstitutions}
                  mode={mode}
                  currentFileName={resource?.original_filename}
                />
              )
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'links' | 'documents')}
                className="w-full"
              >
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
                    maybeDefaultInstitutions={maybeDefaultInstitutions}
                    availableInstitutions={availableInstitutions}
                    isOpen={isOpen}
                    mode={mode}
                    resource={resource}
                  />
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-0">
                  <DocumentFormTab
                    form={form}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    availableInstitutions={availableInstitutions}
                    mode={mode}
                    currentFileName={resource?.original_filename}
                  />
                </TabsContent>
              </Tabs>
            )}
          </form>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 gap-2 flex-shrink-0 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            size="sm"
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {form.formState.isSubmitting ? 'Yüklənir...' : mode === 'create' ? 'Yaradın' : 'Yenilə'}
          </Button>
        </div>
      </MinimalDialogContent>
    </MinimalDialog>
  );
}
