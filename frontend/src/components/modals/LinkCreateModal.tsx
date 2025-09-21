import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { linkService, CreateLinkData } from '@/services/links';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface LinkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void;
}

const linkSchema = z.object({
  title: z.string().min(3, { message: "Başlıq ən azı 3 hərf olmalıdır." }).max(100),
  url: z.string().url({ message: "Düzgün bir URL daxil edin." }),
  description: z.string().max(255).optional(),
  link_type: z.enum(['external', 'video', 'form', 'document']).default('external'),
  share_scope: z.enum(['public', 'regional', 'sectoral', 'institutional']).default('public'),
  is_featured: z.boolean().default(false),
});

export const LinkCreateModal: React.FC<LinkCreateModalProps> = ({
  isOpen,
  onClose,
  onLinkCreated
}) => {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: '',
      url: '',
      description: '',
      link_type: 'external',
      share_scope: 'public',
      is_featured: false,
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: (data: CreateLinkData) => linkService.create(data),
    onSuccess: () => {
      // The toast is now handled by the parent component's callback
      onLinkCreated?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.message || "Link yaradılarkən xəta baş verdi.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof linkSchema>) => {
    createLinkMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Link Yarat</DialogTitle>
          <DialogDescription>
            Faydalı bir link əlavə edərək başqaları ilə paylaşın.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Form fields remain the same */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlıq</FormLabel>
                  <FormControl>
                    <Input placeholder="Məsələn, Təhsil Nazirliyinin rəsmi saytı" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
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
                  <FormLabel>Qısa Təsvir</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Link haqqında qısa məlumat..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="link_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Növü</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Növünü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="external">Xarici Link</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="form">Forma</SelectItem>
                        <SelectItem value="document">Sənəd</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="share_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paylaşım Əhatəsi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Paylaşım əhatəsini seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Hamı üçün</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="sectoral">Sektor</SelectItem>
                        <SelectItem value="institutional">Təşkilat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Xüsusi Link</FormLabel>
                    <DialogDescription>
                      Bu linki xüsusi (seçilmiş) kimi qeyd et.
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Ləğv et
              </Button>
              <Button type="submit" disabled={createLinkMutation.isPending}>
                {createLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yarat
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
