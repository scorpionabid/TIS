import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export default function SurveyApproval() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğular üçün Təsdiq</h1>
          <p className="text-muted-foreground">Sorğuların təsdiqlənməsi və rədd edilməsi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Təsdiqlənmiş</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rədd edilmiş</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yenidən baxılmalı</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Təsdiq Gözləyən Sorğular</CardTitle>
          <CardDescription>
            Təsdiqlənməsi gözləyən sorğuların siyahısı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">Müəllim məmnuniyyəti sorğusu 2024</h3>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Gözləyir
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Yaradıcı: Elnur Məmmədov • 3 gün əvvəl
                </p>
                <p className="text-sm">
                  Müəllimlərin iş şəraitindən məmnuniyyət dərəcəsini ölçmək üçün sorğu
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  Ətraflı
                </Button>
                <Button variant="destructive" size="sm">
                  Rədd et
                </Button>
                <Button size="sm">
                  Təsdiqlə
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">Şagird davamiyyəti analizi</h3>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Gözləyir
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Yaradıcı: Leyla Həsənova • 1 gün əvvəl
                </p>
                <p className="text-sm">
                  Şagirdlərin davamiyyət vəziyyətinin təhlili üçün məlumat toplama
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  Ətraflı
                </Button>
                <Button variant="destructive" size="sm">
                  Rədd et
                </Button>
                <Button size="sm">
                  Təsdiqlə
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}