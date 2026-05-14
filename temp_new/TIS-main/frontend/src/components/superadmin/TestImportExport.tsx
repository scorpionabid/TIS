import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TestImportExport: React.FC = () => {
  console.log('🧪 TestImportExport component rendering...');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Import/Export Component</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Bu sadə test komponentidir. Əgər bu görünürsə, component render sistemi işləyir.</p>
        <p>Əsl InstitutionImportExport-da isə problem var.</p>
      </CardContent>
    </Card>
  );
};

export default TestImportExport;