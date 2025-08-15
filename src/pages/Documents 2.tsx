import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, FileText, Download, Eye } from "lucide-react";

export default function Documents() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sənədlər</h1>
          <p className="text-muted-foreground">Sistem sənədlərinin idarə edilməsi və saxlanması</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Sənəd
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Sənəd axtarın..."
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Müəllim əmək müqaviləsi şablonu</CardTitle>
            </div>
            <CardDescription>PDF • 2.3 MB • 15 mart 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Bax
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Yüklə
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Şagird qəbul qaydaları</CardTitle>
            </div>
            <CardDescription>DOCX • 1.8 MB • 10 mart 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Bax
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Yüklə
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Yeni sənəd əlavə et</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Sənədlər</CardTitle>
          <CardDescription>Ən son əlavə edilmiş sənədlər</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">Təhsil Nazirliyi əmri №125</div>
                  <div className="text-sm text-muted-foreground">25 dekabr 2024</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Bax</Button>
                <Button variant="outline" size="sm">Yüklə</Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">2024-2025 tədris ili qaydalari</div>
                  <div className="text-sm text-muted-foreground">20 dekabr 2024</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Bax</Button>
                <Button variant="outline" size="sm">Yüklə</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}