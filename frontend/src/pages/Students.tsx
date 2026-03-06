import React from 'react';
import { StudentManagerV2 } from '@/components/students/StudentManagerV2';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

/**
 * Simplified Students Page - Refactored to use StudentManagerV2
 * 
 * This page has been completely refactored from a monolithic 500+ line component
 * to a clean, maintainable structure using the GenericManagerV2 pattern.
 * 
 * Key improvements:
 * - 500+ lines reduced to ~40 lines (92% reduction)
 * - All logic moved to reusable StudentManagerV2 component
 * - Consistent with grades management architecture
 * - Better separation of concerns
 * - Enhanced error handling and security
 * 
 * Features now handled by StudentManagerV2:
 * - Role-based access control
 * - Advanced filtering and search
 * - Real-time statistics
 * - Bulk operations
 * - Import/Export functionality
 * - Student enrollment management
 * - Enhanced cache invalidation
 */
export default function Students() {
  const { currentUser: user } = useAuth();

  // Security check - only educational administrative roles can access student management
  if (!user || !['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin', 'müəllim'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">
            Bu səhifəyə yalnız təhsil idarəçiləri və müəllimlər daxil ola bilər
          </p>
        </div>
      </div>
    );
  }

  // Main content using unified StudentManagerV2
  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
      <StudentManagerV2 className="space-y-4" />
    </div>
  );
}