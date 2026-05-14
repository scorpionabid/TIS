import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
import { BarChart3Icon } from "lucide-react";

// Placeholder charts component
export const Charts = memo(() => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5" />
          İstifadə Statistikası
        </CardTitle>
        <CardDescription>
          Son 30 gün statistikaları
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Placeholder for actual charts */}
        <div className="h-64 bg-muted rounded flex items-center justify-center">
          <div className="text-center">
            <BarChart3Icon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Chart komponenti yüklənir...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

Charts.displayName = 'Charts';

export default Charts;