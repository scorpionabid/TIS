import React from 'react';
import { useForm, Controller, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'switch'
  | 'date';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { label: string; value: string; category?: string }[];
  validation?: z.ZodType<any>;
  defaultValue?: any;
  disabled?: boolean;
  className?: string;
  onChange?: (value: any) => void;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

export interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  submitLabel?: string;
  loading?: boolean;
  defaultValues?: Record<string, any>;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  columns?: 1 | 2 | 3;
}

export function FormBuilder({
  fields,
  onSubmit,
  submitLabel = 'Yadda saxla',
  loading = false,
  defaultValues = {},
  className,
  layout = 'vertical',
  columns = 1,
}: FormBuilderProps) {
  // Create dynamic schema from fields
  const schema = z.object(
    fields.reduce((acc, field) => {
      // Ensure we have a proper Zod schema
      let fieldSchema = field.validation;
      
      // If no validation provided, create appropriate default schema based on field type
      if (!fieldSchema) {
        switch (field.type) {
          case 'email':
            fieldSchema = z.string().email('Düzgün email daxil edin');
            break;
          case 'number':
            fieldSchema = z.number().or(z.string().regex(/^\d+$/, 'Düzgün nömrə daxil edin').transform(Number));
            break;
          case 'password':
            fieldSchema = z.string().min(6, 'Parol ən azı 6 simvol olmalıdır');
            break;
          case 'checkbox':
          case 'switch':
            fieldSchema = z.boolean();
            break;
          case 'date':
            fieldSchema = z.string().refine((date) => !isNaN(Date.parse(date)), 'Düzgün tarix formatı daxil edin');
            break;
          default:
            fieldSchema = z.string();
        }
      }
      
      // Apply optional modifier if field is not required
      if (!field.required) {
        // Check if the schema has optional method (some custom validations might not have it)
        if (fieldSchema && typeof fieldSchema.optional === 'function') {
          fieldSchema = fieldSchema.optional();
        } else {
          // For schemas without optional method, wrap in optional
          fieldSchema = z.optional(fieldSchema);
        }
      }
      
      acc[field.name] = fieldSchema;
      return acc;
    }, {} as Record<string, z.ZodType<any>>)
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...fields.reduce((acc, field) => {
        acc[field.name] = field.defaultValue || '';
        return acc;
      }, {} as Record<string, any>),
      ...defaultValues,
    },
  });

  const renderField = (field: FormField) => {
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className={cn(field.className)}>
            <FormLabel className="text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {(() => {
                switch (field.type) {
                  case 'text':
                  case 'email':
                  case 'password':
                    return (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        disabled={field.disabled || loading}
                        {...formField}
                        onChange={(e) => {
                          formField.onChange(e);
                          field.onChange?.(e.target.value);
                        }}
                      />
                    );

                  case 'number':
                    return (
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        disabled={field.disabled || loading}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        {...formField}
                        onChange={(e) => {
                          formField.onChange(e);
                          field.onChange?.(e.target.value);
                        }}
                      />
                    );
                  
                  case 'date':
                    return (
                      <Input
                        type="date"
                        disabled={field.disabled || loading}
                        {...formField}
                      />
                    );
                  
                  case 'textarea':
                    return (
                      <Textarea
                        placeholder={field.placeholder}
                        disabled={field.disabled || loading}
                        rows={field.rows}
                        {...formField}
                        onChange={(e) => {
                          formField.onChange(e);
                          field.onChange?.(e.target.value);
                        }}
                      />
                    );
                  
                  case 'select':
                    return (
                      <Select
                        value={formField.value}
                        onValueChange={(value) => {
                          formField.onChange(value);
                          field.onChange?.(value);
                        }}
                        disabled={field.disabled || loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );

                  case 'multiselect':
                    return (
                      <div className="space-y-2">
                        <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                          {field.options?.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2 py-1">
                              <Checkbox
                                checked={formField.value?.includes(option.value) || false}
                                onCheckedChange={(checked) => {
                                  const currentValues = formField.value || [];
                                  const newValues = checked
                                    ? [...currentValues, option.value]
                                    : currentValues.filter((v: string) => v !== option.value);
                                  formField.onChange(newValues);
                                  field.onChange?.(newValues);
                                }}
                                disabled={field.disabled || loading}
                              />
                              <span className="text-sm">{option.label}</span>
                              {option.category && (
                                <span className="text-xs text-muted-foreground">
                                  ({option.category})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {formField.value?.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {formField.value.length} seçilmiş
                          </div>
                        )}
                      </div>
                    );
                  
                  case 'checkbox':
                    return (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={formField.value}
                          onCheckedChange={formField.onChange}
                          disabled={field.disabled || loading}
                        />
                        <span className="text-sm">{field.placeholder}</span>
                      </div>
                    );
                  
                  case 'radio':
                    return (
                      <RadioGroup
                        value={formField.value}
                        onValueChange={formField.onChange}
                        disabled={field.disabled || loading}
                        className="flex flex-col space-y-2"
                      >
                        {field.options?.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} />
                            <span className="text-sm">{option.label}</span>
                          </div>
                        ))}
                      </RadioGroup>
                    );
                  
                  case 'switch':
                    return (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formField.value}
                          onCheckedChange={formField.onChange}
                          disabled={field.disabled || loading}
                        />
                        <span className="text-sm">{field.placeholder}</span>
                      </div>
                    );
                  
                  default:
                    return null;
                }
              })()}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={cn("space-y-6", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className={cn(
            "gap-6",
            columns > 1 ? `grid ${gridClass}` : "space-y-6"
          )}>
            {fields.map(renderField)}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
              )}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Helper function to create common field configurations
export const createField = (
  name: string,
  label: string,
  type: FieldType,
  options?: Partial<FormField>
): FormField => ({
  name,
  label,
  type,
  ...options,
});

// Common validation schemas
export const commonValidations = {
  email: {
    required: z.string().email('Etibarlı email daxil edin'),
    optional: () => z.string().email('Etibarlı email daxil edin').optional().or(z.literal('')),
  },
  phone: {
    required: z.string().regex(/^[0-9\+\-\s\(\)]+$/, 'Etibarlı telefon nömrəsi daxil edin'),
    optional: () => z.string().regex(/^[0-9\+\-\s\(\)]+$/, 'Etibarlı telefon nömrəsi daxil edin').optional().or(z.literal('')),
  },
  password: z.string().min(6, 'Şifrə ən azı 6 simvol olmalıdır'),
  required: z.string().min(1, 'Bu sahə tələb olunur'),
  number: z.coerce.number().min(0, 'Müsbət rəqəm daxil edin'),
};