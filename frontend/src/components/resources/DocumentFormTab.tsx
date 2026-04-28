import React, { useState } from 'react';
import { FileText, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { InstitutionTargeting } from "./InstitutionTargeting";
import { UserTargeting } from "./UserTargeting";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, Users as UsersIcon } from "lucide-react";

import { Institution } from "@/services/institutions";

interface DocumentFormTabProps {
  form: any;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  availableInstitutions: Institution[];
  maybeDefaultInstitutions?: () => void;
  mode?: 'create' | 'edit';
  currentFileName?: string;
}

export function DocumentFormTab({
  form,
  selectedFile,
  setSelectedFile,
  availableInstitutions,
  maybeDefaultInstitutions,
  mode = 'create',
  currentFileName,
}: DocumentFormTabProps) {
  const [targetingMode, setTargetingMode] = useState<'institutions' | 'users'>(
    form.getValues('share_scope') === 'specific_users' ? 'users' : 'institutions'
  );

  const handleTargetingModeChange = (nextMode: 'institutions' | 'users') => {
    console.log('[DocumentFormTab] targeting mode change:', nextMode);
    setTargetingMode(nextMode);
    if (nextMode === 'institutions') {
      form.setValue('target_users', []);
      form.setValue('share_scope', 'institutional');
      // Always reset defaulted ref so it re-selects when switching back
      if (form.getValues('target_institutions')?.length === 0) {
        maybeDefaultInstitutions?.(true);
      }
    } else {
      form.setValue('target_institutions', []);
      form.setValue('target_departments', []);
      form.setValue('target_roles', []);
      form.setValue('share_scope', 'specific_users');
    }
  };

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

        {/* Targeting Mode Selector */}
        <div className="border-t pt-6 space-y-4">
          <div>
            <Label className="text-base font-semibold">Paylaşma üsulu</Label>
            <p className="text-sm text-gray-500 mt-1">Sənədi kimə göndərmək istəyirsiniz?</p>
          </div>

          <RadioGroup
            value={targetingMode}
            onValueChange={(value) => handleTargetingModeChange(value as 'institutions' | 'users')}
            className="grid grid-cols-2 gap-3"
          >
            <div
              className={`relative flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                targetingMode === 'institutions'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <RadioGroupItem value="institutions" id="doc-target-institutions" className="shrink-0" />
              <Label htmlFor="doc-target-institutions" className="cursor-pointer flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  targetingMode === 'institutions' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Building2 className={`h-5 w-5 ${
                    targetingMode === 'institutions' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Müəssisələr</div>
                  <div className="text-xs text-gray-500 mt-0.5">Regional, Sektor, Məktəb</div>
                </div>
              </Label>
            </div>

            <div
              className={`relative flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                targetingMode === 'users'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <RadioGroupItem value="users" id="doc-target-users" className="shrink-0" />
              <Label htmlFor="doc-target-users" className="cursor-pointer flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  targetingMode === 'users' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <UsersIcon className={`h-5 w-5 ${
                    targetingMode === 'users' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Xüsusi istifadəçilər</div>
                  <div className="text-xs text-gray-500 mt-0.5">Seçilmiş şəxslər</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Conditional Targeting Component */}
        {targetingMode === 'institutions' ? (
          <InstitutionTargeting
            form={form}
            availableInstitutions={availableInstitutions}
          />
        ) : (
          <UserTargeting form={form} />
        )}
      </div>
    </div>
  );
}
