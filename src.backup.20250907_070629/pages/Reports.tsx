import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Eye, Calendar, BarChart3, FileText, TrendingUp } from "lucide-react";

export default function Reports() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-muted-foreground">Analitik hesabatların yaradılması və idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Hesabat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu ay yaradılan</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avtomatik hesabatlar</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <BarChart3 className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi hesabatlar</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Hesabat növü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün hesabatlar</SelectItem>
            <SelectItem value="monthly">Aylıq hesabatlar</SelectItem>
            <SelectItem value="quarterly">Rüblük hesabatlar</SelectItem>
            <SelectItem value="annual">İllik hesabatlar</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            <SelectItem value="ready">Hazır</SelectItem>
            <SelectItem value="pending">Gözləyir</SelectItem>
            <SelectItem value="processing">İşlənir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Son Hesabatlar</CardTitle>
            <CardDescription>Ən son yaradılmış hesabatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">Dekabr ayı davamiyyət hesabatı</div>
                    <Badge variant="default">Hazır</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">25 dekabr 2024</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">Müəllim performans təhlili</div>
                    <Badge variant="secondary">İşlənir</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">20 dekabr 2024</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hesabat Kateqoriyaları</CardTitle>
            <CardDescription>Hesabat növlərinə görə bölgü</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Davamiyyət hesabatları</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Akademik performans</span>
                <span className="text-sm text-muted-foreground">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Maliyyə hesabatları</span>
                <span className="text-sm text-muted-foreground">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>İnzibati hesabatlar</span>
                <span className="text-sm text-muted-foreground">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avtomatik Hesabatlar</CardTitle>
          <CardDescription>Müəyyən vaxtlarda avtomatik yaradılan hesabatlar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">Aylıq davamiyyət hesabatı</div>
                  <div className="text-sm text-muted-foreground">Hər ayın 1-də yaradılır</div>
                </div>
              </div>
              <Badge variant="outline">Aktiv</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-secondary" />
                <div>
                  <div className="font-medium">Rüblük performans təhlili</div>
                  <div className="text-sm text-muted-foreground">Hər rübün sonunda yaradılır</div>
                </div>
              </div>
              <Badge variant="outline">Aktiv</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}