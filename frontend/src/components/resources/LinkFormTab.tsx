import React from 'react';
import { Link } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InstitutionTargeting } from "./InstitutionTargeting";

import { Institution } from "@/services/institutions";

interface LinkFormTabProps {
  form: any;
  availableInstitutions: Institution[];
  filteredInstitutions: Institution[];
  institutionSearch: string;
  setInstitutionSearch: (value: string) => void;
  selectInstitutionsByLevel: (level: number) => void;
  selectInstitutionsByType: (filterFn: (inst: any) => boolean) => void;
}

export function LinkFormTab({
  form,
  availableInstitutions,
  filteredInstitutions,
  institutionSearch,
  setInstitutionSearch,
  selectInstitutionsByLevel,
  selectInstitutionsByType,
}: LinkFormTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Basic Link Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link Məlumatları
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Link Başlığı *</Label>
              <Input
                {...form.register('title')}
                placeholder="Link başlığını daxil edin"
                className="mt-1"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="url">Link URL *</Label>
              <Input
                {...form.register('url')}
                type="url"
                placeholder="https://example.com"
                className="mt-1"
              />
              {form.formState.errors.url && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.url.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Təsvir</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Link haqqında qısa məlumat"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Link Tipi</Label>
                <Select
                  value={form.watch('link_type')}
                  onValueChange={(value) => form.setValue('link_type', value as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">Xarici Link</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="document">Sənəd</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Paylaşım Əhatəsi</Label>
                <Select
                  value={form.watch('share_scope')}
                  onValueChange={(value) => form.setValue('share_scope', value as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Hamı</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="sectoral">Sektor</SelectItem>
                    <SelectItem value="institutional">Müəssisə</SelectItem>
                    <SelectItem value="specific_users">Xüsusi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={form.watch('is_featured')}
                onCheckedChange={(checked) => form.setValue('is_featured', checked as boolean)}
              />
              <Label>Xüsusi Link (Featured)</Label>
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