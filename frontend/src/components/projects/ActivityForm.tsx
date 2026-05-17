import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save, Calendar as CalendarIcon, Clock, X, Paperclip, FileText, Image as ImageIcon, Plus, AlertTriangle, Target, MapPin, BarChart2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
import { ResponsibleUserSelector } from '@/components/tasks/ResponsibleUserSelector';

const activitySchema = z.object({
  name:                       z.string().min(3, 'Fəaliyyət adı ən az 3 simvol olmalıdır'),
  description:                z.string().optional(),
  start_date:                 z.date().optional(),
  end_date:                   z.date().optional(),
  planned_hours:              z.any().transform((v) => Number(v) || 0),
  priority:                   z.enum(['low', 'medium', 'high', 'critical']),
  category:                   z.string().optional(),
  notes:                      z.string().optional(),
  status:                     z.enum(['pending', 'in_progress', 'checking', 'completed', 'stuck']).optional(),
  user_id:                    z.number().nullable().optional(),
  goal_contribution_percentage: z.any().transform((v) => Number(v) || 0).optional(),
  goal_target:                z.string().optional(),
  expected_outcome:           z.string().optional(),
  kpi_metrics:                z.string().optional(),
  risks:                      z.string().optional(),
  location_platform:          z.string().optional(),
  monitoring_mechanism:       z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  initialData?: ProjectActivity;
  activities?: ProjectActivity[];
  onSubmit: (data: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const { toast } = useToast();
  const [attachments, setAttachments]   = useState<ProjectAttachment[]>(initialData?.attachments || []);
  const [isUploading, setIsUploading]   = useState(false);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name:                         initialData?.name                         || '',
      description:                  initialData?.description                  || '',
      start_date:                   initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date:                     initialData?.end_date   ? new Date(initialData.end_date)   : undefined,
      planned_hours:                (initialData?.planned_hours                || 0) as never,
      priority:                     initialData?.priority                     || 'medium',
      category:                     initialData?.category                     || '',
      notes:                        initialData?.notes                        || '',
      status:                       initialData?.status                       || 'pending',
      user_id:                      initialData?.user_id                      || null,
      goal_contribution_percentage: (initialData?.goal_contribution_percentage || 0) as never,
      goal_target:                  initialData?.goal_target                  || '',
      expected_outcome:             initialData?.expected_outcome             || '',
      kpi_metrics:                  initialData?.kpi_metrics                  || '',
      risks:                        initialData?.risks                        || '',
      location_platform:            initialData?.location_platform            || '',
      monitoring_mechanism:         initialData?.monitoring_mechanism         || '',
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData) return;
    try {
      setIsUploading(true);
      const att = await projectService.uploadAttachment(initialData.id, file);
      setAttachments(prev => [...prev, att]);
      toast({ title: 'Uğurlu', description: 'Fayl yükləndi.' });
    } catch {
      toast({ title: 'Xəta', description: 'Fayl yüklənərkən xəta.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    try {
      setDeletingId(id);
      await projectService.deleteAttachment(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Silindi', description: 'Fayl silindi.' });
    } catch {
      toast({ title: 'Xəta', description: 'Fayl silinərkən xəta.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const DateField = ({ name, label }: { name: 'start_date' | 'end_date'; label: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                >
                  {field.value ? format(field.value, 'PP', { locale: az }) : <span>Seçin</span>}
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
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="general"  className="flex-1 text-xs">Ümumi</TabsTrigger>
            <TabsTrigger value="detail"   className="flex-1 text-xs">Detallar</TabsTrigger>
            <TabsTrigger value="files"    className="flex-1 text-xs">Fayllar {attachments.length > 0 && `(${attachments.length})`}</TabsTrigger>
          </TabsList>

          {/* ── Ümumi ── */}
          <TabsContent value="general" className="space-y-4 pt-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Fəaliyyətin Adı <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Məs: Hesabatın hazırlanması" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Açıqlama</FormLabel>
                <FormControl><Textarea placeholder="Fəaliyyət haqqında qısa məlumat..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="user_id" render={({ field }) => (
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
            )} />

            <div className="grid grid-cols-2 gap-4">
              <DateField name="start_date" label="Başlanğıc" />
              <DateField name="end_date"   label="Bitmə" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="planned_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel><Clock className="inline w-3 h-3 mr-1" />Plan Saat</FormLabel>
                  <FormControl><Input type="number" step="0.5" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="goal_contribution_percentage" render={({ field }) => (
                <FormItem>
                  <FormLabel><Target className="inline w-3 h-3 mr-1" />Hədəf Payı (%)</FormLabel>
                  <FormControl><Input type="number" min="0" max="100" placeholder="0-100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="goal_target" render={({ field }) => (
              <FormItem>
                <FormLabel>Hədəf Detalları</FormLabel>
                <FormControl><Input placeholder="Məs: 50 sənəd" {...field} /></FormControl>
                <FormDescription className="text-[10px]">Kəmiyyət və ya keyfiyyət ölçüsü</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </TabsContent>

          {/* ── Detallar ── */}
          <TabsContent value="detail" className="space-y-4 pt-3">
            <FormField control={form.control} name="expected_outcome" render={({ field }) => (
              <FormItem>
                <FormLabel><Target className="inline w-3 h-3 mr-1" />Gözlənilən Nəticə</FormLabel>
                <FormControl><Textarea placeholder="Bu fəaliyyətin tamamlanmasından sonra nə əldə ediləcək..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="kpi_metrics" render={({ field }) => (
              <FormItem>
                <FormLabel><BarChart2 className="inline w-3 h-3 mr-1" />KPI Metriklər</FormLabel>
                <FormControl><Textarea placeholder="Məs: İstifadəçi məmnuniyyəti 85%+ olmalıdır..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="risks" render={({ field }) => (
              <FormItem>
                <FormLabel><AlertTriangle className="inline w-3 h-3 mr-1" />Risklər</FormLabel>
                <FormControl><Textarea placeholder="Mövcud risklər və onların minimuma endirilməsi yolları..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location_platform" render={({ field }) => (
              <FormItem>
                <FormLabel><MapPin className="inline w-3 h-3 mr-1" />Platforma / Yer</FormLabel>
                <FormControl><Input placeholder="Məs: Zoom, Google Meet, Bakı şəhər idarəsi..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="monitoring_mechanism" render={({ field }) => (
              <FormItem>
                <FormLabel>Monitorinq Mexanizmi</FormLabel>
                <FormControl><Textarea placeholder="Nəticənin necə izlənəcəyi, hesabat forması..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Qeydlər</FormLabel>
                <FormControl><Textarea placeholder="Əlavə qeydlər..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </TabsContent>

          {/* ── Fayllar ── */}
          <TabsContent value="files" className="pt-3">
            {!initialData ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Fəaliyyət saxlandıqdan sonra fayl əlavə edə bilərsiniz.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                    <Paperclip className="w-3.5 h-3.5" /> Qoşmalar
                  </span>
                  <div className="relative">
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    <Button
                      type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1.5"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Fayl əlavə et
                    </Button>
                  </div>
                </div>

                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground italic">
                    Heç bir fayl yüklənməyib.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2.5 bg-muted/20 border rounded-lg group">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="p-1.5 bg-background border rounded">
                            {file.file_type?.includes('pdf')
                              ? <FileText className="w-4 h-4 text-red-500" />
                              : <ImageIcon className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{file.original_filename}</p>
                            <p className="text-[10px] text-muted-foreground">{(file.file_size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteAttachment(file.id)}
                          disabled={deletingId === file.id}
                        >
                          {deletingId === file.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <X className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="ghost" onClick={onCancel}>Ləğv et</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Yadda saxla
          </Button>
        </div>
      </form>
    </Form>
  );
};
