import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Building, Users } from "lucide-react";

export default function Regions() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Regionlar</h1>
          <p className="text-muted-foreground">Regional strukturların idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Region
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Bakı Region</CardTitle>
            </div>
            <CardDescription>Paytaxt regionu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Departmentlər:</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span>Müəssisələr:</span>
                <span className="font-medium">456</span>
              </div>
              <div className="flex justify-between">
                <span>İstifadəçilər:</span>
                <span className="font-medium">2,341</span>
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
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Gəncə-Qazax Region</CardTitle>
            </div>
            <CardDescription>Qərb regionu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Departmentlər:</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span>Müəssisələr:</span>
                <span className="font-medium">298</span>
              </div>
              <div className="flex justify-between">
                <span>İstifadəçilər:</span>
                <span className="font-medium">1,567</span>
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
            <p className="text-sm text-muted-foreground">Yeni region əlavə et</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}