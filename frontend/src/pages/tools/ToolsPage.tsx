import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Calendar } from 'lucide-react';
import ExamSeatingPlan from './components/ExamSeatingPlan';

const ToolsPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Wrench className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Alətlər</h1>
      </div>

      <Tabs defaultValue="exam-plan" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:w-[400px]">
          <TabsTrigger value="exam-plan" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>İmtahan planı</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exam-plan" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>İmtahan Oturma Planı Generatoru</CardTitle>
              <CardDescription>
                Şagirdlərin imtahan mərkəzləri üzrə otaqlara və oturacaqlara paylanması aləti.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExamSeatingPlan />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsPage;
