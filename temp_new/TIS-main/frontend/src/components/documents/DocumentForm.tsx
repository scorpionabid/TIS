import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateDocumentData } from '@/services/documents';

interface DocumentFormProps {
  form: UseFormReturn<any>;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
}

export const DocumentForm = ({ form, isPublic, setIsPublic }: DocumentFormProps) => {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sənəd Məlumatları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Başlıq *</Label>
          <Input
            id="title"
            {...register('title', { required: 'Başlıq məcburidir' })}
            placeholder="Sənəd başlığını daxil edin"
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Təsvir</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Sənəd haqqında qısa məlumat"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Kateqoriya</Label>
            <Select value={watch('category')} onValueChange={(value) => setValue('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Kateqoriya seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Ümumi</SelectItem>
                <SelectItem value="academic">Akademik</SelectItem>
                <SelectItem value="administrative">İnzibati</SelectItem>
                <SelectItem value="financial">Maliyyə</SelectItem>
                <SelectItem value="hr">İnsan resursları</SelectItem>
                <SelectItem value="legal">Hüquqi</SelectItem>
                <SelectItem value="technical">Texniki</SelectItem>
                <SelectItem value="policy">Siyasət</SelectItem>
                <SelectItem value="report">Hesabat</SelectItem>
                <SelectItem value="form">Forma</SelectItem>
                <SelectItem value="manual">Təlimat</SelectItem>
                <SelectItem value="other">Digər</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_level">Giriş səviyyəsi</Label>
            <Select value={watch('access_level')} onValueChange={(value) => setValue('access_level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Giriş səviyyəsini seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Hamı</SelectItem>
                <SelectItem value="institution">Müəssisə</SelectItem>
                <SelectItem value="department">Şöbə</SelectItem>
                <SelectItem value="role">Rol</SelectItem>
                <SelectItem value="private">Şəxsi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry_date">Son istifadə tarixi</Label>
          <Input
            id="expiry_date"
            type="datetime-local"
            {...register('expiry_date')}
          />
          <p className="text-xs text-muted-foreground">
            Bu tarixdən sonra sənəd avtomatik olaraq gizlədiləcək
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Etiketlər</Label>
          <Input
            id="tags"
            {...register('tags')}
            placeholder="Vergüllə ayırın: etiket1, etiket2, etiket3"
          />
          <p className="text-xs text-muted-foreground">
            Axtarışı asanlaşdırmaq üçün etiketlər əlavə edin
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
          <Label htmlFor="is_public" className="text-sm">
            İctimai sənəd (hamı görə bilər)
          </Label>
        </div>

        {isPublic && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Qeyd:</strong> İctimai sənədlər sistemdəki bütün istifadəçilər tərəfindən görülə bilər.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};