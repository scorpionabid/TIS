import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Calendar as CalendarIcon, Clock, FileUp, X, Paperclip, FileText, Image as ImageIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { projectService, ProjectActivity, ProjectAttachment } from '@/services/projects';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ResponsibleUserSelector } from '@/components/tasks/ResponsibleUserSelector';

const activitySchema = z.object({
  name: z.string().min(3, 'Fəaliyyət adı ən az 3 simvol olmalıdır'),
  description: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  planned_hours: z.any().transform((v) => Number(v) || 0),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'checking', 'completed', 'stuck']).optional(),
  user_id: z.number().nullable().optional(),
  goal_contribution_percentage: z.any().transform((v) => Number(v) || 0).optional(),
  goal_target: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  initialData?: ProjectActivity;
  activities?: ProjectActivity[]; // For dependency selection
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onAttachmentUpload?: (file: File) => Promise<void>;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({ initialData, activities, onSubmit, onCancel, isLoading }) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<ProjectAttachment[]>(initialData?.attachments || []);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      planned_hours: (initialData?.planned_hours || 0) as any,
      priority: initialData?.priority || 'medium',
      category: initialData?.category || '',
      notes: initialData?.notes || '',
      status: initialData?.status || 'pending',
      user_id: initialData?.user_id || null,
      goal_contribution_percentage: (initialData?.goal_contribution_percentage || 0) as any,
      goal_target: initialData?.goal_target || '',
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData) return;

    try {
      setIsUploading(true);
      const newAttachment = await projectService.uploadAttachment(initialData.id, file);
      setAttachments(prev => [...prev, newAttachment]);
      toast({ title: 'Uğurlu', description: 'Fayl yükləndi.' });
    } catch (error) {
      toast({ title: 'Xəta', description: 'Fayl yüklənərkən xəta baş verdi.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fəaliyyətin Adı</FormLabel>
              <FormControl>
                <Input placeholder="Məs: Hesabatın hazırlanması" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıqlama</FormLabel>
              <FormControl>
                <Textarea placeholder="Fəaliyyət haqqında qısa məlumat..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="planned_hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Saat</FormLabel>
              <FormControl>
                <Input type="number" step="0.5" className="h-10 bg-muted/10 border-muted-foreground/20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="goal_contribution_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hədəf Payı (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" placeholder="Örnək: 20" {...field} />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Layihə hədəfinə töhfə dərəcəsi.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goal_target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hədəf Detalları</FormLabel>
                <FormControl>
                  <Input placeholder="Örnək: 50 sənəd" {...field} />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Kəmiyyət və ya keyfiyyət ölçüsü.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Məsul Şəxs</FormLabel>
              <FormControl>
                <ResponsibleUserSelector
                  value={field.value ? [field.value.toString()] : []}
                  onChange={(ids) => field.onChange(ids.length > 0 ? parseInt(ids[0]) : null)}
                  originScope={null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Başlanğıc</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PP", { locale: az }) : <span>Seçin</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Bitmə</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PP", { locale: az }) : <span>Seçin</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
        </div>

        {/* Attachments Section */}
        {initialData && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Qoşmalar
              </label>
              <div className="relative">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  disabled={isUploading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] gap-1.5"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Fayl əlavə et
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {attachments.length === 0 ? (
                <div className="text-[10px] text-muted-foreground italic text-center py-2">
                  Heç bir fayl yüklənilməyib.
                </div>
              ) : (
                attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-background border rounded-md group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 bg-primary/5 rounded-md">
                        {file.file_type?.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">{file.original_filename}</span>
                        <span className="text-[9px] text-muted-foreground">{(file.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {/* To Implement: Delete Attachment */}}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Yadda saxla
          </Button>
        </div>
      </form>
    </Form>
  );
};
