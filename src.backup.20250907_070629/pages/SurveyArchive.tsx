import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Archive, Calendar, Download } from "lucide-react";

export default function SurveyArchive() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğu Arxivi</h1>
          <p className="text-muted-foreground">Keçmiş sorğuların arxivi və məlumat bazası</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Arxivdə axtarın..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <select className="px-3 py-2 border border-border rounded-md">
          <option>Bütün illər</option>
          <option>2024</option>
          <option>2023</option>
          <option>2022</option>
        </select>
        <select className="px-3 py-2 border border-border rounded-md">
          <option>Bütün kateqoriyalar</option>
          <option>Müəllim sorğuları</option>
          <option>Şagird sorğuları</option>
          <option>Valideyn sorğuları</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Arxivdə ümumi</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Archive className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">2024-cü il</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">2023-cü il</p>
                <p className="text-2xl font-bold">63</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">2022-ci il</p>
                <p className="text-2xl font-bold">46</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arxiv Siyahısı</CardTitle>
          <CardDescription>
            Kronoloji sıra ilə arxivlənmiş sorğular
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">2023 İl Sonu Müəllim Qiymətləndirməsi</h3>
                  <Badge variant="outline">2023</Badge>
                  <Badge variant="secondary">Müəllim</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Tarix: 25 Dekabr 2023 • Cavablar: 1,234 • Müəssisələr: 45
                </p>
                <p className="text-sm">
                  İllik müəllim performansı və məmnuniyyət səviyyəsinin qiymətləndirilməsi
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Yüklə
                </Button>
                <Button variant="outline" size="sm">
                  Ətraflı
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">Şagird Məmnuniyyəti Sorğusu - Yaz</h3>
                  <Badge variant="outline">2023</Badge>
                  <Badge variant="secondary">Şagird</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Tarix: 15 May 2023 • Cavablar: 2,567 • Məktəblər: 78
                </p>
                <p className="text-sm">
                  Yaz dönəmində şagirdlərin təhsil keyfiyyətindən məmnuniyyəti
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Yüklə
                </Button>
                <Button variant="outline" size="sm">
                  Ətraflı
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">Valideyn Rəyi - İnfrastruktur</h3>
                  <Badge variant="outline">2023</Badge>
                  <Badge variant="secondary">Valideyn</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Tarix: 10 Mart 2023 • Cavablar: 856 • Müəssisələr: 23
                </p>
                <p className="text-sm">
                  Məktəb infrastrukturu və fiziki şəraitin qiymətləndirilməsi
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Yüklə
                </Button>
                <Button variant="outline" size="sm">
                  Ətraflı
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}