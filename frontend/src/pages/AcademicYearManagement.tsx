import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AcademicYearManager } from '@/components/academic-years/AcademicYearManager';

export default function AcademicYearManagement() {
  const { currentUser } = useAuth();

  // Security check - only SuperAdmin can access academic year management
  if (!currentUser || currentUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız SuperAdmin istifadəçiləri daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  return <AcademicYearManager currentUser={currentUser} enableAutoGeneration />;
}
