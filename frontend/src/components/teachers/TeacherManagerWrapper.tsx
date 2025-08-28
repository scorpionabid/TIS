// Teacher Manager Wrapper - A/B Testing Component

import React from 'react';
import { useFeatureFlags, isUserInTestGroup } from '@/utils/featureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolTeacherManagerV2 } from './SchoolTeacherManagerV2';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Settings } from 'lucide-react';

// Dynamic import for the original component to avoid bundling both
const SchoolTeacherManagerV1 = React.lazy(() => 
  import('./SchoolTeacherManager').then(module => ({ default: module.default }))
);

interface TeacherManagerWrapperProps {
  className?: string;
}

export const TeacherManagerWrapper: React.FC<TeacherManagerWrapperProps> = (props) => {
  const featureFlags = useFeatureFlags();
  const { currentUser } = useAuth();
  
  // Debug information for development
  const debugInfo = React.useMemo(() => {
    const userInTestGroup = isUserInTestGroup(currentUser?.id, 'teacher-manager-v2');
    
    return {
      userId: currentUser?.id,
      userRole: currentUser?.role,
      flagEnabled: featureFlags.useNewTeacherManager,
      genericV2Enabled: featureFlags.enableGenericManagerV2,
      userInTestGroup,
      shouldUseV2: featureFlags.useNewTeacherManager || (featureFlags.enableGenericManagerV2 && userInTestGroup),
      environment: import.meta.env.MODE,
    };
  }, [featureFlags, currentUser]);

  // Determine which component to use
  const shouldUseV2 = React.useMemo(() => {
    // Override: Direct flag
    if (featureFlags.useNewTeacherManager) {
      console.log('🏁 Using TeacherManagerV2: Direct flag enabled');
      return true;
    }
    
    // A/B testing: Only if generic V2 enabled and user in test group
    if (featureFlags.enableGenericManagerV2 && currentUser?.id) {
      const inTestGroup = isUserInTestGroup(currentUser.id, 'teacher-manager-v2');
      console.log('🏁 A/B Test result:', { inTestGroup, userId: currentUser.id });
      return inTestGroup;
    }
    
    console.log('🏁 Using TeacherManagerV1: Default fallback');
    return false;
  }, [featureFlags, currentUser?.id]);



  // Render the appropriate component
  return (
    <div className="space-y-4">
      
      {shouldUseV2 ? (
        <SchoolTeacherManagerV2 {...props} />
      ) : (
        <React.Suspense fallback={
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Müəllim idarəetməsi yüklənir...</p>
          </div>
        }>
          <SchoolTeacherManagerV1 {...props} />
        </React.Suspense>
      )}
    </div>
  );
};

export default TeacherManagerWrapper;