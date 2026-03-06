import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, Users } from "lucide-react";
import { VerificationStatistics } from "@/services/teacherVerification";

interface TeacherVerificationStatsProps {
  statistics: VerificationStatistics;
}

export function TeacherVerificationStats({ statistics }: TeacherVerificationStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gözləmədə</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {statistics.total_pending}
          </div>
          <p className="text-xs text-muted-foreground">
            Təsdiq gözləyən müəllimlər
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Təsdiqləndi</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {statistics.total_approved}
          </div>
          <p className="text-xs text-muted-foreground">
            Təsdiqlənmiş müəllimlər
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rədd Edildi</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {statistics.total_rejected}
          </div>
          <p className="text-xs text-muted-foreground">
            Rədd edilmiş müəllimlər
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ümumi Müəllimlər</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {statistics.total_teachers}
          </div>
          <p className="text-xs text-muted-foreground">
            Sektorun bütün müəllimləri
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
