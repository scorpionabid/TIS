import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Save, 
  X, 
  Info, 
  Clock, 
  Users, 
  Target, 
  Layout,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ResponsibleUserSelector } from '@/components/tasks/ResponsibleUserSelector';
import { Project } from '@/services/projects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const projectSchema = z.object({
  name: z.string().min(3, 'Layihə adı ən az 3 simvol olmalıdır'),
  description: z.string().optional(),
  start_date: z.date({
    required_error: 'Başlanğıc tarixi mütləqdir',
  }),
  end_date: z.date({
    required_error: 'Bitmə tarixi mütləqdir',
  }),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
  total_goal: z.string().optional(),
  employee_ids: z.array(z.string()).min(1, 'Ən az bir əməkdaş seçilməlidir'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      status: initialData?.status || 'active',
      total_goal: initialData?.total_goal || '',
      employee_ids: initialData?.employees?.map(emp => emp.id.toString()) || [],
    },
  });

  // Sync form with initialData when it changes (e.g. user opens a different project)
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        description: initialData.description || '',
        start_date: initialData.start_date ? new Date(initialData.start_date) : undefined,
        end_date: initialData.end_date ? new Date(initialData.end_date) : undefined,
        status: initialData.status || 'active',
        total_goal: initialData.total_goal || '',
        employee_ids: initialData.employees?.map(emp => emp.id.toString()) || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        start_date: undefined,
        end_date: undefined,
        status: 'active',
        total_goal: '',
        employee_ids: [],
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (values: ProjectFormValues) => {
    // Transform data for backend
    const formattedValues = {
      ...values,
      employee_ids: values.employee_ids.map(id => parseInt(id, 10)),
      start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
      end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : null,
    };
    
    await onSubmit(formattedValues);
  };

  const statusColors = {
    active: 'bg-emerald-500 text-white',
    completed: 'bg-blue-500 text-white',
    on_hold: 'bg-amber-500 text-white',
    cancelled: 'bg-red-500 text-white',
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full bg-background">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-10 pb-10">
            {/* Section 1: General Info */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Ümumi Məlumat</h3>
                  <p className="text-xs text-muted-foreground italic">Layihənin adı və əsas hədəflərini təyin edin.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors">Layihənin Adı</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input 
                            placeholder="Məs: Rəqəmsal Transformasiya Planı" 
                            className="h-12 border-muted-foreground/20 focus:border-primary px-4 bg-muted/20 hover:bg-muted/40 transition-all font-medium"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="total_goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Target className="w-3 h-3" /> Ümumi Hədəf (KPI)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Məs: 100% rəqəmsallaşma" className="bg-muted/10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">İlkin Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/10 h-10">
                              <SelectValue placeholder="Seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Aktiv</SelectItem>
                            <SelectItem value="completed">Tamamlanıb</SelectItem>
                            <SelectItem value="on_hold">Gözləmədə</SelectItem>
                            <SelectItem value="cancelled">Ləğv edilib</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Info className="w-3 h-3" /> Ətraflı Açıqlama
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Layihənin məqsədi və əsas hədəfləri haqqında əlavə məlumat yazın..." 
                          className="min-h-[140px] resize-none bg-muted/10 border-muted-foreground/20 italic"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator className="opacity-50" />

            {/* Section 2: Timeline */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Zaman Planlaması</h3>
                  <p className="text-xs text-muted-foreground italic">Layihənin icra müddətini müəyyən edin.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Başlama Tarixi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-11 text-left font-medium border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-all",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: az })
                              ) : (
                                <span>Tarix seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 text-primary/60" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bitmə Tarixi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-11 text-left font-medium border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-all",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: az })
                              ) : (
                                <span>Tarix seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 text-primary/60" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < (form.getValues('start_date') || new Date())
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Separator className="opacity-50" />

            {/* Section 3: Team */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Komanda və Məsullar</h3>
                  <p className="text-xs text-muted-foreground italic">Layihə tapşırıqlarını yaradacaq heyəti təyin edin.</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="employee_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="bg-muted/5 rounded-xl border-border/50">
                        <ResponsibleUserSelector 
                          value={field.value} 
                          onChange={field.onChange}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[10px] mt-2 flex items-center gap-2 text-primary/70">
                      <AlertCircle className="w-3 h-3" /> Seçilmiş şəxslər layihə daxilində fəaliyyət bəndləri yarada biləcəklər.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 mt-auto border-t bg-background/95 backdrop-blur-sm z-50">
          <Button type="button" variant="ghost" className="h-11 px-8 rounded-xl font-bold text-muted-foreground" onClick={onCancel}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={isLoading} className="h-11 px-10 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initialData ? 'Dəyişiklikləri Saxla' : 'Layihəni Təsdiqlə'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
