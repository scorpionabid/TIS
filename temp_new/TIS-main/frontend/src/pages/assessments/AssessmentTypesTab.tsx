import React from 'react';
import { Plus, FileText, School, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AssessmentType } from '@/services/assessmentTypes';

interface AssessmentTypesTabProps {
  assessmentTypes: any;
  handleCreateAssessmentType: () => void;
  handleEditAssessmentType: (assessmentType: AssessmentType) => void;
  handleToggleAssessmentTypeStatus: (id: number) => void;
  handleDeleteAssessmentType: (id: number) => void;
}

export const AssessmentTypesTab: React.FC<AssessmentTypesTabProps> = ({
  assessmentTypes,
  handleCreateAssessmentType,
  handleEditAssessmentType,
  handleToggleAssessmentTypeStatus,
  handleDeleteAssessmentType
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Qiymətləndirmə Növləri</CardTitle>
            <CardDescription>KSQ, BSQ və xüsusi qiymətləndirmə növlərini idarə edin</CardDescription>
          </div>
          <Button onClick={handleCreateAssessmentType}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Növ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {assessmentTypes?.data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Kateqoriya</TableHead>
                <TableHead>Maksimum Bal</TableHead>
                <TableHead>Qiymətləndirmə Metodu</TableHead>
                <TableHead>Təşkilat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Yaradılma Tarixi</TableHead>
                <TableHead>Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessmentTypes.data.filter(assessmentType => assessmentType.id && assessmentType.name && assessmentType.id.toString().trim() !== '').map((assessmentType) => (
                <TableRow key={assessmentType.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{assessmentType.name}</p>
                      {assessmentType.description && (
                        <p className="text-sm text-muted-foreground">{assessmentType.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      assessmentType.category === 'ksq' ? 'default' :
                      assessmentType.category === 'bsq' ? 'secondary' : 'outline'
                    }>
                      {assessmentType.category_label}
                    </Badge>
                  </TableCell>
                  <TableCell>{assessmentType.max_score}</TableCell>
                  <TableCell>{assessmentType.scoring_method_label}</TableCell>
                  <TableCell>
                    {assessmentType.institution ? (
                      <div className="flex items-center space-x-1">
                        <School className="h-3 w-3" />
                        <span className="text-sm">{assessmentType.institution.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span className="text-sm">Sistem geneli</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={assessmentType.is_active ? 'default' : 'secondary'}>
                      {assessmentType.is_active ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(assessmentType.created_at).toLocaleDateString('az-AZ')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAssessmentType(assessmentType)}
                      >
                        Redaktə
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAssessmentTypeStatus(assessmentType.id)}
                      >
                        {assessmentType.is_active ? 'Deaktiv et' : 'Aktiv et'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssessmentType(assessmentType.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Qiymətləndirmə növləri yüklənir...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};