import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList,
  Activity,
  Heart,
  Target,
  Users,
  Brain,
  Star
} from 'lucide-react';

interface AssessmentItem {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: number;
  total: number;
}

export const AssessmentGrid: React.FC = () => {
  const assessments: AssessmentItem[] = [
    {
      name: "Davranış Qiymətləndirməsi",
      description: "Sinif davranışı analizi",
      icon: Activity,
      completed: 12,
      total: 15
    },
    {
      name: "Emosional Zəka Testi",
      description: "EQ səviyyəsinin ölçülməsi",
      icon: Heart,
      completed: 8,
      total: 10
    },
    {
      name: "Akademik Motivasiya",
      description: "Öğrənmə motivasiyası",
      icon: Target,
      completed: 18,
      total: 20
    },
    {
      name: "Sosial Bacarıqlar",
      description: "Ünsiyyət qabiliyyəti",
      icon: Users,
      completed: 6,
      total: 8
    },
    {
      name: "Stress və Narahatlıq",
      description: "Psixoloji təzyiq ölçümü",
      icon: Brain,
      completed: 4,
      total: 6
    },
    {
      name: "Yaradıcılıq Testi",
      description: "Kreativ düşüncə",
      icon: Star,
      completed: 10,
      total: 12
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Psixoloji Qiymətləndirmələr</CardTitle>
        <CardDescription>Standardlaşdırılmış testlər və qiymətləndirmə alətləri</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <assessment.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{assessment.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {assessment.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Tamamlanma</span>
                    <span className="text-xs font-medium">
                      {assessment.completed}/{assessment.total}
                    </span>
                  </div>
                  <Progress 
                    value={(assessment.completed / assessment.total) * 100} 
                    className="h-2" 
                  />
                </div>
                
                <Button variant="ghost" size="sm" className="w-full mt-3">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Başla
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};