import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Layers, MapPin } from "lucide-react";

export default function Sectors() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sektorlar</h1>
          <p className="text-muted-foreground">Regional sektorların idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Sektor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle>Orta təhsil sektoru</CardTitle>
            </div>
            <CardDescription>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Bakı regionu
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Məktəblər:</span>
                <span className="font-medium">234</span>
              </div>
              <div className="flex justify-between">
                <span>Şagirdlər:</span>
                <span className="font-medium">45,678</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Ətraflı
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle>Məktəbəqədər sektoru</CardTitle>
            </div>
            <CardDescription>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Gəncə regionu
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Uşaq bağçaları:</span>
                <span className="font-medium">89</span>
              </div>
              <div className="flex justify-between">
                <span>Uşaqlar:</span>
                <span className="font-medium">12,456</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Ətraflı
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Yeni sektor əlavə et</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}