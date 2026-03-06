import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type {
  Institution,
  RegionTeacherCreateInput,
} from '@/services/regionAdminTeachers';
import {
  EMPLOYMENT_STATUS_LABELS,
  POSITION_TYPE_LABELS,
} from '@/types/teacher';
import type { EnhancedTeacherProfile } from '@/types/teacher';

const teacherFormSchema = z.object({
  first_name: z.string().min(1, 'Ad məcburidir'),
  last_name: z.string().min(1, 'Soyad məcburidir'),
  email: z.string().email('Düzgün email daxil edin'),
  phone: z.string().optional(),
  institution_id: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) {
        return undefined;
      }
      return Number(value);
    },
    z
      .number({
        required_error: 'Məktəb seçilməlidir',
        invalid_type_error: 'Məktəb seçilməlidir',
      })
      .min(1, 'Məktəb seçilməlidir')
  ),
  position_type: z.string().optional(),
  employment_status: z.string().optional(),
  password: z
    .string()
    .min(6, 'Parol minimum 6 simvol olmalıdır')
    .optional(),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

interface RegionTeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: RegionTeacherCreateInput) => Promise<void>;
  schools: Institution[];
  teacher: (EnhancedTeacherProfile & { profile?: any }) | null;
  isSubmitting?: boolean;
}

const getDefaultValues = (
  teacher: (EnhancedTeacherProfile & { profile?: any }) | null
): TeacherFormValues => ({
  first_name: teacher?.profile?.first_name || teacher?.first_name || '',
  last_name: teacher?.profile?.last_name || teacher?.last_name || '',
  email: teacher?.email || '',
  phone: teacher?.profile?.phone || teacher?.phone || '',
  institution_id: teacher?.institution?.id,
  position_type: teacher?.profile?.position_type || '',
  employment_status: teacher?.profile?.employment_status || '',
  password: '',
});

export const RegionTeacherFormModal: React.FC<RegionTeacherFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  schools,
  teacher,
  isSubmitting = false,
}) => {
  const isEditMode = !!teacher;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: useMemo(() => getDefaultValues(teacher), [teacher]),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(getDefaultValues(teacher));
    }
  }, [isOpen, teacher, form]);

  const positionOptions = Object.entries(POSITION_TYPE_LABELS);
  const employmentOptions = Object.entries(EMPLOYMENT_STATUS_LABELS);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: RegionTeacherCreateInput = {
      email: values.email.trim(),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      institution_id: values.institution_id,
    };

    if (values.phone?.trim()) {
      payload.phone = values.phone.trim();
    }
    if (values.position_type) {
      payload.position_type = values.position_type;
    }
    if (values.employment_status) {
      payload.employment_status = values.employment_status;
    }
    if (!isEditMode && values.password?.trim()) {
      payload.password = values.password.trim();
    }

    await onSubmit(payload);
  });

  const closeModal = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? closeModal() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Müəllimi redaktə et' : 'Yeni müəllim əlavə et'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Müəllim haqqında məlumatları yeniləyin.'
              : 'Region daxilində yeni müəllim yaradın.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad *</FormLabel>
                    <FormControl>
                      <Input placeholder="Adı daxil edin" {...field} />
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
                      <Input placeholder="Soyadı daxil edin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="teacher@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+994 xx xxx xx xx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="institution_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Məktəb *</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={schools.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Məktəb seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem
                            key={school.id}
                            value={school.id.toString()}
                          >
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vəzifə</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? '' : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vəzifə seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Seçilməyib</SelectItem>
                        {positionOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="employment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İş statusu</FormLabel>
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? '' : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Seçilməyib</SelectItem>
                        {employmentOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Müvəqqəti parol</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Teacher123"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Ləğv et
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Yadda saxlanılır...'
                  : isEditMode
                    ? 'Yadda saxla'
                    : 'Müəllim yarat'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RegionTeacherFormModal;
