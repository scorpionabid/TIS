import React from 'react';
import { GradeManager } from '@/components/grades/GradeManager';
import { logger } from '@/utils/logger';

interface SchoolClassManagerStandardizedProps {
  className?: string;
}

/**
 * Legacy SchoolClassManagerStandardized - Now redirects to new GradeManager
 * 
 * This component has been updated to use the new unified grade management system:
 * - Migrated from fragmented class controllers to unified GradeUnifiedController
 * - Improved performance with enhanced filtering and caching
 * - Better UX with role-based access control
 * - Modern React patterns with TypeScript safety
 */
export const SchoolClassManagerStandardized: React.FC<SchoolClassManagerStandardizedProps> = ({ 
  className 
}) => {
  logger.info('SchoolClassManagerStandardized redirecting to GradeManager', {
    component: 'SchoolClassManagerStandardized',
    action: 'render',
    data: { migrationComplete: true }
  });

  return <GradeManager className={className} />;
};