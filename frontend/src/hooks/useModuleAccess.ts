import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { buildModuleAccess, ModuleAccessResult, ModuleKey } from '@/utils/permissions/moduleAccess';

export function useModuleAccess(module: ModuleKey): ModuleAccessResult {
  const { currentUser, hasPermission } = useAuth();

  return useMemo(
    () => buildModuleAccess(currentUser, module, hasPermission),
    [currentUser, module, hasPermission]
  );
}
