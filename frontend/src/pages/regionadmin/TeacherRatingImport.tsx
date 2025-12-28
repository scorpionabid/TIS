/**
 * TeacherRatingImport Page
 *
 * Excel import wizard page for teacher rating data
 * Features: 3-tab wizard for awards, certificates, and academic results
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ExcelImportWizard } from '../../components/teacher-rating';
import { ArrowLeft, Info } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { ImportResult } from '../../types/teacherRating';

export default function TeacherRatingImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleImportComplete = (result: ImportResult) => {
    // Show success toast
    toast({
      title: 'İdxal tamamlandı',
      description: `${result.successful_rows} sətir uğurla idxal edildi`,
    });

    // Invalidate related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['teacher-ratings'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-rating-profile'] });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/regionadmin/teacher-rating')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Məlumat İdxalı</h1>
        <p className="text-muted-foreground mt-1">
          Excel fayllarından müəllim reytinq məlumatlarını idxal edin
        </p>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">İdxal prosesi:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Lazımi kateqoriya üçün Excel şablonunu yükləyin</li>
              <li>Şablonu doldurun və yadda saxlayın</li>
              <li>Doldurulmuş faylı yükləyin və idxal edin</li>
              <li>Xətalar olarsa, onları düzəldin və yenidən cəhd edin</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      {/* Import Wizard */}
      <ExcelImportWizard onImportComplete={handleImportComplete} />

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Vacib Qeydlər</CardTitle>
          <CardDescription>
            İdxal prosesi zamanı nəzərə alınmalı məlumatlar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">UTIS Kod</h4>
            <p className="text-sm text-muted-foreground">
              Hər müəllim öz unikal UTIS kodu ilə tanınır. İdxal zamanı düzgün UTIS kod
              istifadə etdiyinizdən əmin olun. UTIS kod sistemdə mövcud olmalıdır.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Tarix Formatı</h4>
            <p className="text-sm text-muted-foreground">
              Tarixlər <code className="bg-muted px-1 rounded">YYYY-MM-DD</code> formatında
              olmalıdır. Məsələn: 2024-01-15
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Mükafat və Sertifikat Növləri</h4>
            <p className="text-sm text-muted-foreground">
              Mükafat və sertifikat növləri sistemdə əvvəlcədən müəyyən edilmiş olmalıdır.
              Yeni növ əlavə etmək üçün sistem adminə müraciət edin.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Akademik Nəticələr</h4>
            <p className="text-sm text-muted-foreground">
              Akademik nəticələr idxal edərkən tədris ili və fənn sistemdə mövcud olmalıdır.
              Orta qiymət 0-100 arası, uğur faizi isə 0-100% arası olmalıdır.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Təsdiqləmə</h4>
            <p className="text-sm text-muted-foreground">
              İdxal olunan məlumatlar avtomatik olaraq "Təsdiqlənməmiş" statusunda olacaq.
              Məlumatları yoxlayıb təsdiq etmək lazımdır.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Xəta Bildirişləri</h4>
            <p className="text-sm text-muted-foreground">
              İdxal zamanı xəta baş verərsə, xətalı sətirlərin nömrələri və xəta mesajları
              göstəriləcək. Xətaları düzəldib yenidən idxal edə bilərsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Kömək lazımdır?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            İdxal prosesi ilə bağlı problem yaşayırsınızsa və ya suallarınız varsa,
            aşağıdakı qaynaqlardan istifadə edə bilərsiniz:
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              İstifadəçi Təlimatı
            </Button>
            <Button variant="outline" size="sm">
              Video Təlimat
            </Button>
            <Button variant="outline" size="sm">
              Dəstək
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
