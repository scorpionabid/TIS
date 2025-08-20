import React from 'react';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface BSQAssessmentsTabProps {
  assessmentData: any;
  handleApproveAssessment: (type: 'ksq' | 'bsq', id: number) => void;
  getScoreColor: (score: number) => string;
}

export const BSQAssessmentsTab: React.FC<BSQAssessmentsTabProps> = ({
  assessmentData,
  handleApproveAssessment,
  getScoreColor
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Təsdiqlənib</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Layihə</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><AlertTriangle className="h-3 w-3 mr-1" />Rədd edilib</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>BSQ Qiymətləndirmə Nəticələri</CardTitle>
        <CardDescription>Beynəlxalq Standartlar Qiymətləndirməsi məlumatları</CardDescription>
      </CardHeader>
      <CardContent>
        {assessmentData?.data?.bsq_results?.data?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarix</TableHead>
                <TableHead>Standart</TableHead>
                <TableHead>Orqan</TableHead>
                <TableHead>Nəticə</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessmentData.data.bsq_results.data.map((assessment: any) => (
                <TableRow key={assessment.id}>
                  <TableCell>
                    {new Date(assessment.assessment_date).toLocaleDateString('az-AZ')}
                  </TableCell>
                  <TableCell>{assessment.international_standard}</TableCell>
                  <TableCell>{assessment.assessment_body}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getScoreColor(assessment.percentage_score)}`}>
                      {assessment.percentage_score}%
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                  <TableCell>
                    {assessment.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveAssessment('bsq', assessment.id)}
                      >
                        Təsdiqlə
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Hələ BSQ qiymətləndirməsi əlavə edilməyib</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};