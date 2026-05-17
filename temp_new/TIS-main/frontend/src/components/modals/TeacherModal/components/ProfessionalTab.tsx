/**
 * ProfessionalTab - Tab 2: Optional additional information
 * Sections: contact, contract, professional, certification, education, emergency contact, notes
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { GENDER_OPTIONS, SPECIALTY_LEVELS } from '../utils/constants';

export const ProfessionalTab: React.FC = () => {
  const form = useFormContext();

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-slate-700 font-medium">
          Əlavə Məlumatlar (Optional)
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Bu sahələr məcburi deyil. Doldursanız daha ətraflı profil yaranacaq.
        </p>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="font-medium mb-4">Əlaqə Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+994501234567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doğum tarixi</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cins</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Cins seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="national_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şəxsiyyət vəsiqəsi</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="FIN kod" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Contract Information */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Müqavilə Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contract_start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Müqavilə başlanğıc tarixi</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contract_end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Müqavilə bitmə tarixi</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Professional Details */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Peşəkar Məlumatlar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="specialty_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Təhsil səviyyəsi</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Təhsil səviyyəsi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SPECIALTY_LEVELS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialty_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İxtisas balı</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="0-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experience_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İş təcrübəsi (il)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="İl sayı" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Old Certification */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Köhnə Sertifikasiya Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="miq_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MİQ balı</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="0-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="certification_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sertifikat balı</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="0-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_certification_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Son sertifikat tarixi</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Education */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Təhsil Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="degree_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Təhsil dərəcəsi</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Bakalavr, Magistr..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="graduation_university"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Məzun olduğu universitet</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Universitet adı" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="graduation_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Məzun olma ili</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="2020" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="university_gpa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GPA</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="3.5" step="0.01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Təcili Əlaqə</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emergency_contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Təcili əlaqə (ad)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ad Soyad" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Təcili əlaqə (telefon)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+994501234567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Təcili əlaqə (email)</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="email@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4">
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qeydlər</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Əlavə qeydlər..." rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ProfessionalTab;
