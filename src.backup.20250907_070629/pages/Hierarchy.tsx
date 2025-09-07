import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus, Settings } from "lucide-react";

export default function Hierarchy() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">İerarxiya İdarəetməsi</h1>
          <p className="text-muted-foreground">Strukturun dinamik dəyişdirilməsi və təşkili</p>
        </div>
        <Button className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Strukturu Düzəlt
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <CardTitle>Təşkilati Struktur</CardTitle>
            </div>
            <CardDescription>
              Cari sistem ierarxiyasının vizual təsviri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-md">
                <div className="text-center font-medium text-primary mb-2">Təhsil Nazirliyi</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="font-medium">Regionlar</div>
                    <div className="text-sm text-muted-foreground">8 region</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="font-medium">Departmentlər</div>
                    <div className="text-sm text-muted-foreground">45 departament</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-center">
                    <div className="font-medium">Müəssisələr</div>
                    <div className="text-sm text-muted-foreground">2,156 müəssisə</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Struktur Düzəlişləri</CardTitle>
              <CardDescription>Son dəyişikliklər</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Yeni region əlavə edildi</span>
                  <span className="text-muted-foreground">2 gün əvvəl</span>
                </div>
                <div className="flex justify-between">
                  <span>Departament birləşdirildi</span>
                  <span className="text-muted-foreground">1 həftə əvvəl</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sürətli Əməliyyatlar</CardTitle>
              <CardDescription>Struktur dəyişiklikləri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="h-3 w-3 mr-2" />
                Yeni vahid əlavə et
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <GitBranch className="h-3 w-3 mr-2" />
                Struktur yenidən təşkil et
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}