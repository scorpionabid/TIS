import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  ClipboardList,
  MessageCircle,
  Users,
  Phone
} from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Sürətli Əməliyyatlar
        </CardTitle>
        <CardDescription>
          Psixoloji dəstək xidmətləri üçün tez-tez istifadə olunan funksiyalar
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <div className="text-center">
            <p className="font-medium text-sm">Yeni Qiymətləndirmə</p>
            <p className="text-xs text-muted-foreground">Psixoloji test</p>
          </div>
        </Button>
        
        <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div className="text-center">
            <p className="font-medium text-sm">Məsləhət Sesiyası</p>
            <p className="text-xs text-muted-foreground">Fərdi görüş</p>
          </div>
        </Button>
        
        <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
          <Users className="h-5 w-5" />
          <div className="text-center">
            <p className="font-medium text-sm">Qrup Terapiyası</p>
            <p className="text-xs text-muted-foreground">Qrup işi</p>
          </div>
        </Button>
        
        <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
          <Phone className="h-5 w-5" />
          <div className="text-center">
            <p className="font-medium text-sm">Valideyn Görüşü</p>
            <p className="text-xs text-muted-foreground">Ailə məsləhəti</p>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};