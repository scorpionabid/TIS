import React from 'react';
import { GradeManager } from '@/components/grades/GradeManager';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

const PRESCHOOL_TYPES = ['kindergarten', 'preschool_center', 'nursery'] as const;

type PreschoolType = (typeof PRESCHOOL_TYPES)[number];

const PreschoolGroups: React.FC = () => {
  const { currentUser } = useAuth();
  const instType = currentUser?.institution?.type ?? '';

  if (!PRESCHOOL_TYPES.includes(instType as PreschoolType)) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Bu səhifə yalnız məktəbəqədər müəssisə idarəçiləri üçündür.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <GradeManager />;
};

export default PreschoolGroups;
