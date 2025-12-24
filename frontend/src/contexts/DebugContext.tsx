/**
 * Debug Context Provider
 * Centralized debug control system for development
 *
 * Features:
 * - Always active in development mode
 * - Never active in production
 * - Permission-based debug access
 * - Page-specific debug controls
 * - Module-based debug toggles
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface DebugModule {
  id: string;
  name: string;
  enabled: boolean;
  requiredPermission?: string;
}

interface DebugContextType {
  // Core debug state
  isDebugMode: boolean;
  canAccessDebug: boolean;

  // Module controls
  modules: DebugModule[];
  isModuleEnabled: (moduleId: string) => boolean;
  toggleModule: (moduleId: string) => void;
  enableModule: (moduleId: string) => void;
  disableModule: (moduleId: string) => void;

  // Page-specific debug
  currentPage: string | null;
  setCurrentPage: (page: string | null) => void;
  getPageDebugInfo: () => any;

  // Debug levels
  debugLevel: 'basic' | 'advanced' | 'expert';
  setDebugLevel: (level: 'basic' | 'advanced' | 'expert') => void;

  // Debug panel visibility
  showDebugPanel: boolean;
  toggleDebugPanel: () => void;

  // Debug utilities
  log: (module: string, message: string, data?: any) => void;
  warn: (module: string, message: string, data?: any) => void;
  error: (module: string, message: string, error?: any) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

// Debug modules configuration
const DEFAULT_MODULES: DebugModule[] = [
  { id: 'navigation', name: 'Navigation & Routing', enabled: true },
  { id: 'permissions', name: 'Permissions & Auth', enabled: true },
  { id: 'api', name: 'API Calls', enabled: false },
  { id: 'attendance', name: 'Attendance System', enabled: true, requiredPermission: 'attendance.read' },
  { id: 'approval', name: 'Approval Workflow', enabled: false, requiredPermission: 'approval.read' },
  { id: 'surveys', name: 'Survey System', enabled: false, requiredPermission: 'survey.read' },
  { id: 'tasks', name: 'Task Management', enabled: false, requiredPermission: 'task.read' },
  { id: 'documents', name: 'Document Management', enabled: false, requiredPermission: 'document.read' },
  { id: 'students', name: 'Student Management', enabled: false, requiredPermission: 'student.read' },
  { id: 'performance', name: 'Performance Monitoring', enabled: false },
  { id: 'cache', name: 'Cache & Storage', enabled: false },
];

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const { currentUser } = useAuth();

  // Only enable in development
  const isDebugMode = process.env.NODE_ENV === 'development';

  // Check if user has debug permissions
  const canAccessDebug = isDebugMode && (
    currentUser?.permissions?.includes('debug.view') ||
    currentUser?.role === 'superadmin' ||
    isDebugMode // In dev mode, all users can debug
  );

  // Load modules from localStorage or use defaults
  const [modules, setModules] = useState<DebugModule[]>(() => {
    if (!isDebugMode) return DEFAULT_MODULES;

    try {
      const saved = localStorage.getItem('atis_debug_modules');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load debug modules from localStorage');
    }
    return DEFAULT_MODULES;
  });

  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [debugLevel, setDebugLevel] = useState<'basic' | 'advanced' | 'expert'>(() => {
    if (!isDebugMode) return 'basic';

    try {
      const saved = localStorage.getItem('atis_debug_level');
      return (saved as any) || 'basic';
    } catch {
      return 'basic';
    }
  });

  const [showDebugPanel, setShowDebugPanel] = useState(() => {
    if (!isDebugMode) return false;

    try {
      const saved = localStorage.getItem('atis_debug_panel_visible');
      return saved === 'true';
    } catch {
      return true; // Show by default in dev mode
    }
  });

  // Save modules to localStorage when changed
  useEffect(() => {
    if (isDebugMode) {
      localStorage.setItem('atis_debug_modules', JSON.stringify(modules));
    }
  }, [modules, isDebugMode]);

  // Save debug level to localStorage
  useEffect(() => {
    if (isDebugMode) {
      localStorage.setItem('atis_debug_level', debugLevel);
    }
  }, [debugLevel, isDebugMode]);

  // Save panel visibility
  useEffect(() => {
    if (isDebugMode) {
      localStorage.setItem('atis_debug_panel_visible', String(showDebugPanel));
    }
  }, [showDebugPanel, isDebugMode]);

  // Module controls
  const isModuleEnabled = (moduleId: string): boolean => {
    if (!isDebugMode || !canAccessDebug) return false;

    const module = modules.find(m => m.id === moduleId);
    if (!module) return false;

    // Check permission if required
    if (module.requiredPermission) {
      return module.enabled && currentUser?.permissions?.includes(module.requiredPermission);
    }

    return module.enabled;
  };

  const toggleModule = (moduleId: string) => {
    if (!canAccessDebug) return;

    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const enableModule = (moduleId: string) => {
    if (!canAccessDebug) return;

    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, enabled: true } : m
    ));
  };

  const disableModule = (moduleId: string) => {
    if (!canAccessDebug) return;

    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, enabled: false } : m
    ));
  };

  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };

  // Page debug info
  const getPageDebugInfo = () => {
    if (!isDebugMode || !canAccessDebug) return null;

    return {
      page: currentPage,
      timestamp: new Date().toISOString(),
      user: {
        username: currentUser?.username,
        role: currentUser?.role,
        permissions: currentUser?.permissions?.length || 0,
      },
      modules: modules.filter(m => m.enabled).map(m => m.id),
      debugLevel,
    };
  };

  // Logging utilities
  const log = (module: string, message: string, data?: any) => {
    if (!isModuleEnabled(module)) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] 🔍 [${module.toUpperCase()}]`;

    console.log(`${prefix} ${message}`);
    if (data !== undefined) {
      console.log(data);
    }
  };

  const warn = (module: string, message: string, data?: any) => {
    if (!isModuleEnabled(module)) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] ⚠️ [${module.toUpperCase()}]`;

    console.warn(`${prefix} ${message}`);
    if (data !== undefined) {
      console.warn(data);
    }
  };

  const error = (module: string, message: string, errorData?: any) => {
    // Errors are always logged regardless of module state
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] ❌ [${module.toUpperCase()}]`;

    console.error(`${prefix} ${message}`);
    if (errorData !== undefined) {
      console.error(errorData);
    }
  };

  const value: DebugContextType = {
    isDebugMode,
    canAccessDebug,
    modules,
    isModuleEnabled,
    toggleModule,
    enableModule,
    disableModule,
    currentPage,
    setCurrentPage,
    getPageDebugInfo,
    debugLevel,
    setDebugLevel,
    showDebugPanel,
    toggleDebugPanel,
    log,
    warn,
    error,
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

// Hook for page-specific debug
export function usePageDebug(pageName: string) {
  const debug = useDebug();

  useEffect(() => {
    debug.setCurrentPage(pageName);

    return () => {
      debug.setCurrentPage(null);
    };
  }, [pageName, debug]);

  return {
    log: (message: string, data?: any) => debug.log(pageName, message, data),
    warn: (message: string, data?: any) => debug.warn(pageName, message, data),
    error: (message: string, error?: any) => debug.error(pageName, message, error),
    isEnabled: debug.isModuleEnabled(pageName),
  };
}

// Hook for module-specific debug
export function useModuleDebug(moduleName: string) {
  const debug = useDebug();

  return {
    log: (message: string, data?: any) => debug.log(moduleName, message, data),
    warn: (message: string, data?: any) => debug.warn(moduleName, message, data),
    error: (message: string, error?: any) => debug.error(moduleName, message, error),
    isEnabled: debug.isModuleEnabled(moduleName),
    enable: () => debug.enableModule(moduleName),
    disable: () => debug.disableModule(moduleName),
    toggle: () => debug.toggleModule(moduleName),
  };
}
