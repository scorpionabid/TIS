/**
 * BasicInfoTab - Tab 1: Required personal information fields
 * Fields: first_name, last_name, patronymic, email, username, password, is_active
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

import { IS_ACTIVE_OPTIONS } from '../utils/constants';

interface BasicInfoTabProps {
  isNewTeacher: boolean;
  emailValidationIsUnique: boolean | null;
  onEmailBlur: (email: string) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  isNewTeacher,
  emailValidationIsUnique,
  onEmailBlur,
}) => {
  const form = useFormContext();

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700 font-medium">
          <GraduationCap className="h-5 w-5" />
          Məcburi Sahələr
        </div>
        <p className="text-sm text-blue-600 mt-1">
          Bütün məcburi sahələri doldurun. Əlavə məlumatlar ikinci tabda qeyd edilə bilər.
        </p>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Adı daxil edin" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soyad *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Soyadı daxil edin" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="patronymic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ata adı *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ata adını daxil edin" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="email@example.com"
                  onBlur={(e) => {
                    field.onBlur();
                    onEmailBlur(e.target.value);
                  }}
                />
              </FormControl>
              {emailValidationIsUnique === false && (
                <p className="text-sm text-destructive">Bu email artıq istifadə olunur</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İstifadəçi adı *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="İstifadəçi adı" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isNewTeacher && (
          <>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifrə *</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Minimum 8 simvol" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifrə təkrarı *</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Şifrəni təkrar daxil edin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      {/* Status */}
      <div className="border-t pt-4">
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Status seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {IS_ACTIVE_OPTIONS.map((option) => (
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
      </div>
    </div>
  );
};

export default BasicInfoTab;
