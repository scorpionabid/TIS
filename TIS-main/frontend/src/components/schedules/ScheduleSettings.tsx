import React from 'react';
import { Settings, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface ScheduleSettingsProps {
  onExportExcel?: () => void;
  onImportExcel?: () => void;
  className?: string;
}

export const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  onExportExcel,
  onImportExcel,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Cədvəl Tənzimləmələri
        </CardTitle>
        <CardDescription>
          Dərs cədvəli yaratma və konflikt yoxlama parametrləri
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Vaxt Tənzimləmələri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dərs müddəti (dəqiqə)</Label>
                <Select defaultValue="45">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="40">40 dəqiqə</SelectItem>
                    <SelectItem value="45">45 dəqiqə</SelectItem>
                    <SelectItem value="50">50 dəqiqə</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fasilə müddəti (dəqiqə)</Label>
                <Select defaultValue="10">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 dəqiqə</SelectItem>
                    <SelectItem value="10">10 dəqiqə</SelectItem>
                    <SelectItem value="15">15 dəqiqə</SelectItem>
                    <SelectItem value="20">20 dəqiqə</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">Konflikt Yoxlaması</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Avtomatik konflikt yoxlaması</Label>
                  <p className="text-sm text-muted-foreground">
                    Yeni slot əlavə edərkən avtomatik konflikt yoxlanması
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Aktiv
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Müəllim maksimum iş yükü yoxlaması</Label>
                  <p className="text-sm text-muted-foreground">
                    Müəllimlərin həftəlik maksimum saat limitini yoxla
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Aktiv
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">İdxal/İxrac</h3>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onImportExcel}>
                <Upload className="h-4 w-4 mr-2" />
                Excel-dən İdxal Et
              </Button>
              <Button variant="outline" onClick={onExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel-ə İxrac Et
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};