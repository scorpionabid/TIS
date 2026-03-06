import { School, Building, Users, Activity, Award, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const getSectorTypeLabel = (type: string) => {
  switch (type) {
    case 'primary': return 'İbtidai təhsil';
    case 'secondary': return 'Orta təhsil';
    case 'preschool': return 'Məktəbəqədər';
    case 'vocational': return 'Peşə təhsili';
    case 'special': return 'Xüsusi təhsil';
    case 'mixed': return 'Qarışıq';
    default: return type;
  }
};

export const getSectorTypeIcon = (type: string) => {
  switch (type) {
    case 'primary': return <School className="h-5 w-5 text-blue-500" />;
    case 'secondary': return <Building className="h-5 w-5 text-green-500" />;
    case 'preschool': return <Users className="h-5 w-5 text-purple-500" />;
    case 'vocational': return <Activity className="h-5 w-5 text-orange-500" />;
    case 'special': return <Award className="h-5 w-5 text-red-500" />;
    case 'mixed': return <Layers className="h-5 w-5 text-gray-500" />;
    default: return <Building className="h-5 w-5 text-gray-500" />;
  }
};

export const getPerformanceBadge = (rate: number) => {
  if (rate >= 85) return <Badge variant="default">Əla ({rate}%)</Badge>;
  if (rate >= 70) return <Badge variant="outline">Yaxşı ({rate}%)</Badge>;
  if (rate >= 50) return <Badge variant="secondary">Orta ({rate}%)</Badge>;
  return <Badge variant="destructive">Zəif ({rate}%)</Badge>;
};