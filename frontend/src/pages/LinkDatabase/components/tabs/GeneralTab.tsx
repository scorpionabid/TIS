import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LinkFormValues } from '../../schemas/linkForm.schema';

interface GeneralTabProps {
  register: UseFormRegister<LinkFormValues>;
  control: Control<LinkFormValues>;
  errors: FieldErrors<LinkFormValues>;
  isLoading: boolean;
  watchedUrl: string;
  onClearExpiry: () => void;
  watchedExpiry: string;
}

export function GeneralTab({
  register,
  control,
  errors,
  isLoading,
  watchedUrl,
  onClearExpiry,
  watchedExpiry,
}: GeneralTabProps) {
  const isUrlValid = (() => {
    try { return watchedUrl ? !!new URL(watchedUrl) : false; }
    catch { return false; }
  })();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="space-y-2">
        <Label htmlFor="u-title" className="text-[13px] font-bold text-gray-700">
          Keçid Başlığı <span className="text-destructive">*</span>
        </Label>
        <Input
          id="u-title"
          placeholder="Məsələn: Elektron Jurnal Sistemi"
          {...register('title')}
          disabled={isLoading}
          className="h-12 rounded-xl border-gray-200 focus:border-primary transition-all font-medium bg-gray-50/30"
        />
        {errors.title && (
          <p className="text-[11px] text-destructive font-bold">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="u-url" className="text-[13px] font-bold text-gray-700">
          URL Ünvanı <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="u-url"
            type="url"
            placeholder="https://example.com"
            {...register('url')}
            disabled={isLoading}
            className={cn(
              'h-12 rounded-xl border-gray-200 focus:border-primary transition-all font-medium bg-gray-50/30',
              isUrlValid && 'pr-10 border-green-400/50'
            )}
          />
          {isUrlValid && (
            <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
        </div>
        {errors.url && (
          <p className="text-[11px] text-destructive font-bold">{errors.url.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[13px] font-bold text-gray-700">Resurs Növü</Label>
          <Controller
            control={control}
            name="link_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50/30 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="external" className="rounded-lg">🔗 Xarici Link</SelectItem>
                  <SelectItem value="video" className="rounded-lg">🎬 Video Resurs</SelectItem>
                  <SelectItem value="form" className="rounded-lg">📋 Sorğu / Form</SelectItem>
                  <SelectItem value="document" className="rounded-lg">📄 Sənəd / Fayl</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="u-expires" className="text-[13px] font-bold text-gray-700 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            Bitmə Tarixi
          </Label>
          <div className="relative">
            <Input
              id="u-expires"
              type="date"
              {...register('expires_at')}
              disabled={isLoading}
              min={new Date().toISOString().split('T')[0]}
              className="h-12 rounded-xl border-gray-200 bg-gray-50/30 font-medium"
            />
            {watchedExpiry && (
              <button
                type="button"
                onClick={onClearExpiry}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="u-desc" className="text-[13px] font-bold text-gray-700">Qısa Təsvir</Label>
        <Textarea
          id="u-desc"
          placeholder="Link haqqında əlavə məlumat..."
          rows={3}
          {...register('description')}
          disabled={isLoading}
          className="rounded-xl border-gray-200 focus:border-primary transition-all font-medium bg-white shadow-sm resize-none"
        />
        {errors.description && (
          <p className="text-[11px] text-destructive font-bold">{errors.description.message}</p>
        )}
      </div>
    </div>
  );
}
