import React from 'react';
import { FileText, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { InstitutionTargeting } from "./InstitutionTargeting";

import { Institution } from "@/services/institutions";

interface DocumentFormTabProps {
  form: any;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  availableInstitutions: Institution[];
  filteredInstitutions: Institution[];
  institutionSearch: string;
  setInstitutionSearch: (value: string) => void;
  selectInstitutionsByLevel: (level: number) => void;
  selectInstitutionsByType: (filterFn: (inst: any) => boolean) => void;
  mode?: 'create' | 'edit';
  currentFileName?: string;
}

export function DocumentFormTab({
  form,
  selectedFile,
  setSelectedFile,
  availableInstitutions,
  filteredInstitutions,
  institutionSearch,
  setInstitutionSearch,
  selectInstitutionsByLevel,
  selectInstitutionsByType,
  mode = 'create',
  currentFileName,
}: DocumentFormTabProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('📄 File selected:', file);
    if (file) {
      setSelectedFile(file);
      form.setValue('file', file as any);
      console.log('✅ File set in form and state:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Basic Document Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sənəd Məlumatları
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Sənəd Başlığı *</Label>
              <Input
                {...form.register('title')}
                placeholder="Sənəd başlığını daxil edin"
                className="mt-1"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label>
                Fayl Seçin {mode === 'create' ? '*' : '(mövcud faylı dəyişdirmək üçün)'}
              </Label>

              {mode === 'edit' && currentFileName && !selectedFile && (
                <div className="mt-1 p-2 bg-muted rounded-md flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Mövcud fayl: {currentFileName}</span>
                </div>
              )}

              <div className="mt-1">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                />
                {selectedFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {form.formState.errors.file && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.file.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Təsvir</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Sənəd haqqında qısa məlumat"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Kateqoriya</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Kateqoriya seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrative">İdarəetmə sənədləri</SelectItem>
                  <SelectItem value="financial">Maliyyə sənədləri</SelectItem>
                  <SelectItem value="educational">Təhsil materialları</SelectItem>
                  <SelectItem value="hr">İnsan resursları</SelectItem>
                  <SelectItem value="technical">Texniki sənədlər</SelectItem>
                  <SelectItem value="other">Digər</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={form.watch('is_downloadable')}
                  onCheckedChange={(checked) => {
                    console.log('📥 is_downloadable changed:', checked, typeof checked);
                    form.setValue('is_downloadable', checked as boolean);
                  }}
                />
                <Label>Yükləmə icazəsi</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={form.watch('is_viewable_online')}
                  onCheckedChange={(checked) => {
                    console.log('👁️ is_viewable_online changed:', checked, typeof checked);
                    form.setValue('is_viewable_online', checked as boolean);
                  }}
                />
                <Label>Onlayn baxış icazəsi</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="expires_at">Son İstifadə Tarixi</Label>
              <Input
                {...form.register('expires_at')}
                type="datetime-local"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Institution Targeting */}
        <InstitutionTargeting
          form={form}
          availableInstitutions={availableInstitutions}
          filteredInstitutions={filteredInstitutions}
          institutionSearch={institutionSearch}
          setInstitutionSearch={setInstitutionSearch}
          selectInstitutionsByLevel={selectInstitutionsByLevel}
          selectInstitutionsByType={selectInstitutionsByType}
        />
      </div>
    </div>
  );
}