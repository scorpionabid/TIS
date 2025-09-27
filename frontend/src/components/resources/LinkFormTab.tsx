import React from 'react';
import { Link } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Basic Link Information */}
        <div className="space-y-3">

          <div className="grid grid-cols-1 gap-3">
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