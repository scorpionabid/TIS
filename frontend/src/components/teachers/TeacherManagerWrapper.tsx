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

  // Development debug panel
  const DebugPanel = () => {
    if (import.meta.env.MODE !== 'development') return null;
    
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Feature Flag Debug Info
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span>Component Version:</span>
              <span className="font-mono">{shouldUseV2 ? 'V2 (Generic)' : 'V1 (Legacy)'}</span>
              
              <span>User ID:</span>
              <span className="font-mono">{debugInfo.userId || 'null'}</span>
              
              <span>User Role:</span>
              <span className="font-mono">{debugInfo.userRole || 'null'}</span>
              
              <span>Direct Flag:</span>
              <span className="font-mono">{debugInfo.flagEnabled.toString()}</span>
              
              <span>Generic V2 Flag:</span>
              <span className="font-mono">{debugInfo.genericV2Enabled.toString()}</span>
              
              <span>Test Group:</span>
              <span className="font-mono">{debugInfo.userInTestGroup.toString()}</span>
              
              <span>Environment:</span>
              <span className="font-mono">{debugInfo.environment}</span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <div className="text-xs text-blue-600">
                Toggle flags via console: <code>featureFlags.toggle('useNewTeacherManager')</code>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Render the appropriate component
  return (
    <div className="space-y-4">
      <DebugPanel />
      
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