/**
 * PositionTab - Position type, workplace type, specialty, and assessment fields
 * Fields: position_type, workplace_type, specialty, assessment_type, assessment_score
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
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

import {
  POSITION_TYPES,
  WORKPLACE_TYPES,
  ASSESSMENT_TYPES,
} from '../utils/constants';

export const PositionTab: React.FC = () => {
  const form = useFormContext();

  return (
    <div className="space-y-6">
      {/* Position Information */}
      <div>
        <h3 className="font-medium mb-4">Vəzifə Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="position_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vəzifə *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vəzifə seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {POSITION_TYPES.map((option) => (
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
            name="workplace_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İş yeri növü *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="İş yeri növü seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORKPLACE_TYPES.map((option) => (
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
            name="specialty"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>İxtisas *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="İxtisasını daxil edin" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Assessment Information */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-4">Qiymətləndirmə Məlumatları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assessment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qiymətləndirmə növü *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Qiymətləndirmə növü seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSESSMENT_TYPES.map((option) => (
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
            name="assessment_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qiymətləndirmə balı *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default PositionTab;
