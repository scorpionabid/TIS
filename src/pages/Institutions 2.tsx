import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, School, MapPin, Users, Loader2, Building, Edit, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { institutionService, Institution, CreateInstitutionData } from "@/services/institutions";
import { InstitutionModal } from "@/components/modals/InstitutionModal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Institutions() {
  const [selectedType, setSelectedType] = useState<'all' | 'ministry' | 'regional' | 'sector' | 'school'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: institutions, isLoading, error } = useQuery({
    queryKey: ['institutions', selectedType],
    queryFn: () => selectedType === 'all' 
      ? institutionService.getAll() 
      : institutionService.getByType(selectedType),
  });
  const getInstitutionIcon = (type: string) => {
    switch (type) {
      case 'ministry': return Building;
      case 'regional': return MapPin;
      case 'sector': return Users;
      case 'school': return School;
      default: return School;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ministry': return 'Nazirlik';
      case 'regional': return 'Regional İdarə';
      case 'sector': return 'Sektor';
      case 'school': return 'Məktəb';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Təhsil Müəssisələri</h1>
            <p className="text-muted-foreground">Bütün təhsil müəssisələrinin idarə edilməsi</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Müəssisə
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-48 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Müəssisələr yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Təhsil Müəssisələri</h1>
          <p className="text-muted-foreground">Bütün təhsil müəssisələrinin idarə edilməsi</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Müəssisə
        </Button>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        {['all', 'ministry', 'regional', 'sector', 'school'].map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type as any)}
          >
            {type === 'all' ? 'Hamısı' : getTypeLabel(type)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {institutions?.data?.map((institution: Institution) => {
          const IconComponent = getInstitutionIcon(institution.type);
          
          return (
            <Card key={institution.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm">{institution.name}</CardTitle>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                      {getTypeLabel(institution.type)}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {institution.student_count && (
                    <div className="flex justify-between">
                      <span>Şagirdlər:</span>
                      <span className="font-medium">{institution.student_count.toLocaleString()}</span>
                    </div>
                  )}
                  {institution.teacher_count && (
                    <div className="flex justify-between">
                      <span>Müəllimlər:</span>
                      <span className="font-medium">{institution.teacher_count.toLocaleString()}</span>
                    </div>
                  )}
                  {institution.address && (
                    <div className="flex items-start justify-between">
                      <span>Ünvan:</span>
                      <span className="font-medium text-right text-xs">{institution.address}</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Ətraflı
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Yeni müəssisə əlavə et</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}