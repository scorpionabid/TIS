import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react';

export const ReportsGrid: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Psixoloji Hesabatlar</CardTitle>
        <CardDescription>Şagird inkişafı və dəstək proqramları hesabatları</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            <div className="text-center">
              <p className="font-medium">İnkişaf Hesabatı</p>
              <p className="text-sm text-muted-foreground">Şagird proqresi</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            <div className="text-center">
              <p className="font-medium">Müdaxilə Nəticələri</p>
              <p className="text-sm text-muted-foreground">Terapevtik uğur</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Users className="h-8 w-8" />
            <div className="text-center">
              <p className="font-medium">Valideyn Rəyi</p>
              <p className="text-sm text-muted-foreground">Ailə geri bildirimi</p>
            </div>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <FileText className="h-8 w-8" />
            <div className="text-center">
              <p className="font-medium">Risk Qiymətləndirməsi</p>
              <p className="text-sm text-muted-foreground">Psixoloji risk analizi</p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};