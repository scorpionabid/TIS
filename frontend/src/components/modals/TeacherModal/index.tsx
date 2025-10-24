/**
 * TeacherModal - Teacher Creation/Editing with Tabs
 * Tab 1: Required Basic Information
 * Tab 2: Optional Additional Information
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { userService } from '@/services/users';

import {
  DEFAULT_TEACHER_VALUES,
  POSITION_TYPES,
  WORKPLACE_TYPES,
  SPECIALTY_LEVELS,
  ASSESSMENT_TYPES,
  GENDER_OPTIONS,
  IS_ACTIVE_OPTIONS,
  SUCCESS_MESSAGES,
  FIELD_NAME_MAP,
} from './utils/constants';

import {
  transformTeacherDataToBackend,
  transformBackendDataToForm,
} from './utils/transformers';

interface TeacherModalProps {
  open: boolean;
  onClose: () => void;
  teacher?: any | null;
  onSave: (teacherData: any) => Promise<void>;
}

// Validation schema
const createTeacherSchema = (isNewTeacher: boolean) => {
  const baseSchema = {
    // Basic required fields
    first_name: z.string().min(1, 'Ad məcburidir'),
    last_name: z.string().min(1, 'Soyad məcburidir'),
    patronymic: z.string().min(1, 'Ata adı məcburidir'),
    email: z.string().email('Email formatı düz deyil'),
    username: z.string().min(1, 'İstifadəçi adı məcburidir'),

    // Position fields
    position_type: z.string().min(1, 'Vəzifə məcburidir'),
    workplace_type: z.string().min(1, 'İş yeri növü məcburidir'),
    specialty: z.string().min(1, 'İxtisas məcburidir'),

    // Assessment fields
    assessment_type: z.string().min(1, 'Qiymətləndirmə növü məcburidir'),
    assessment_score: z.coerce.number().min(0, 'Minimum 0').max(100, 'Maksimum 100'),

    // Status
    is_active: z.string(),

    // Optional basic fields
    contact_phone: z.string().optional(),
    birth_date: z.string().optional(),
    gender: z.string().optional(),
    national_id: z.string().optional(),

    // Optional professional fields
    specialty_level: z.string().optional(),
    specialty_score: z.string().optional(),
    experience_years: z.string().optional(),

    // Optional contract fields
    contract_start_date: z.string().optional(),
    contract_end_date: z.string().optional(),

    // Optional certification fields
    miq_score: z.string().optional(),
    certification_score: z.string().optional(),
    last_certification_date: z.string().optional(),

    // Optional education fields
    degree_level: z.string().optional(),
    graduation_university: z.string().optional(),
    graduation_year: z.string().optional(),
    university_gpa: z.string().optional(),

    // Optional emergency contact fields
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_email: z.string().optional(),
    notes: z.string().optional(),
  };

  if (isNewTeacher) {
    return z.object({
      ...baseSchema,
      password: z.string().min(8, 'Şifrə minimum 8 simvol olmalıdır'),
      password_confirmation: z.string().min(8, 'Şifrə təkrarı minimum 8 simvol olmalıdır'),
    }).refine((data) => data.password === data.password_confirmation, {
      message: 'Şifrələr uyğun gəlmir',
      path: ['password_confirmation'],
    });
  }

  return z.object({
    ...baseSchema,
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  });
};

export function TeacherModal({
  open,
  onClose,
  teacher = null,
  onSave,
}: TeacherModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ isUnique: null as boolean | null });
  const [activeTab, setActiveTab] = useState('basic');

  const isNewTeacher = !teacher;

  // Initialize form
  const form = useForm({
    resolver: zodResolver(createTeacherSchema(isNewTeacher)),
    defaultValues: teacher ? transformBackendDataToForm(teacher) : DEFAULT_TEACHER_VALUES,
  });

  // Reset form when modal opens/closes or teacher changes
  useEffect(() => {
    if (open) {
      const values = teacher ? transformBackendDataToForm(teacher) : DEFAULT_TEACHER_VALUES;
      form.reset(values);
      setActiveTab('basic');
    }
  }, [open, teacher, form]);

  // Email uniqueness check
  const checkEmailUnique = useCallback(
    async (email: string) => {
      if (!email || email === teacher?.email) {
        setEmailValidation({ isUnique: null });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailValidation({ isUnique: null });
        return;
      }

      try {
        const result = await userService.checkEmailUnique(email, teacher?.id);
        setEmailValidation({ isUnique: result?.isUnique ?? true });
      } catch (error) {
        console.warn('Email uniqueness check failed:', error);
        setEmailValidation({ isUnique: null });
      }
    },
    [teacher?.email, teacher?.id]
  );

  // Submit handler
  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Email uniqueness validation
      if (emailValidation.isUnique === false) {
        toast({
          title: 'Xəta',
          description: 'Bu email artıq istifadə olunur',
          variant: 'destructive',
        });
        return;
      }

      // Transform to backend format
      const teacherData = transformTeacherDataToBackend(data);

      console.log('📤 TeacherModal sending data:', teacherData);

      // Save
      await onSave(teacherData);

      toast({
        title: 'Uğurlu',
        description: teacher ? SUCCESS_MESSAGES.TEACHER_UPDATED : SUCCESS_MESSAGES.TEACHER_CREATED,
      });

      onClose();
    } catch (error: any) {
      console.error('Teacher save error:', error);

      let errorDescription = 'Əməliyyat zamanı xəta baş verdi';
      if (error.message === 'Validation failed' && error.errors) {
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = FIELD_NAME_MAP[field.replace('profile.', '')] || field;
            const messageList = Array.isArray(messages) ? messages : [messages];
            return `${fieldName}: ${messageList.join(', ')}`;
          })
          .join('\n');
        errorDescription = errorMessages;
      } else if (error.message) {
        errorDescription = error.message;
      }

      toast({
        title: 'Xəta',
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if basic tab has errors
  const basicTabErrors = Object.keys(form.formState.errors).filter(key =>
    ['first_name', 'last_name', 'patronymic', 'email', 'username', 'password',
     'password_confirmation', 'position_type', 'workplace_type', 'specialty',
     'assessment_type', 'assessment_score', 'is_active'].includes(key)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {teacher ? 'Müəllim məlumatlarını redaktə et' : 'Yeni müəllim əlavə et'}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? 'Müəllimin məlumatlarını dəyişdirin və yadda saxlayın.'
              : 'Yeni müəllimin məlumatlarını daxil edin. Məcburi sahələri doldurun.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic" className="relative">
                  Əsas Məlumatlar *
                  {basicTabErrors.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                      <AlertCircle className="h-3 w-3" />
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="additional">
                  Əlavə Məlumatlar
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto px-1 pb-4">
                {/* TAB 1: BASIC INFORMATION (REQUIRED) */}
                <TabsContent value="basic" className="space-y-6 mt-4">
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
                                checkEmailUnique(e.target.value);
                              }}
                            />
                          </FormControl>
                          {emailValidation.isUnique === false && (
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

                  {/* Position Information */}
                  <div className="border-t pt-4">
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
                </TabsContent>

                {/* TAB 2: ADDITIONAL INFORMATION (OPTIONAL) */}
                <TabsContent value="additional" className="space-y-6 mt-4">
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

                  {/* Old Certification (optional) */}
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
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Ləğv et
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Yüklənir...' : (teacher ? 'Yenilə' : 'Əlavə et')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default TeacherModal;
