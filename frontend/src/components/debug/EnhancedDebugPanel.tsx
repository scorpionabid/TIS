/**
 * Enhanced Debug Panel
 * Centralized debug control interface for development
 *
 * Features:
 * - Module-based debug toggles
 * - Permission-based visibility
 * - Page-specific debug info
 * - Debug level controls
 * - Collapsible sections
 */

import React, { useState } from 'react';
import { useDebug } from '@/contexts/DebugContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  User,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  Activity,
  FileText,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';

export function EnhancedDebugPanel() {
  const debug = useDebug();
  const { currentUser } = useAuth();

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'user' | 'modules' | 'page' | 'settings'>('user');

  // Only show in development and if user can access debug
  if (!debug.isDebugMode || !debug.canAccessDebug || !debug.showDebugPanel) {
    return null;
  }

  const attendancePermissions = [
    'attendance.read',
    'attendance.create',
    'attendance.update',
    'attendance.manage',
  ];

  const debugLevels: Array<'basic' | 'advanced' | 'expert'> = ['basic', 'advanced', 'expert'];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[450px]">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-2xl">
        {/* Header */}
        <CardHeader className="pb-3 border-b bg-blue-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-blue-900">Debug Control Panel</span>
              <Badge variant="outline" className="text-xs bg-green-100 border-green-300">
                DEV MODE
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={debug.toggleDebugPanel}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="p-3 space-y-3">
            {/* Tab Navigation */}
            <div className="flex gap-1 bg-white rounded-lg p-1">
              <button
                onClick={() => setActiveTab('user')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  activeTab === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <User className="h-3 w-3 inline mr-1" />
                User
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  activeTab === 'modules'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Activity className="h-3 w-3 inline mr-1" />
                Modules
              </button>
              <button
                onClick={() => setActiveTab('page')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  activeTab === 'page'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <FileText className="h-3 w-3 inline mr-1" />
                Page
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Settings className="h-3 w-3 inline mr-1" />
                Settings
              </button>
            </div>

            <ScrollArea className="h-[350px]">
              {/* User Tab */}
              {activeTab === 'user' && currentUser && (
                <div className="space-y-3 pr-3">
                  {/* User Info */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3 w-3 text-blue-600" />
                      <span className="font-semibold">{currentUser.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      <Badge variant="outline" className="text-xs">
                        {currentUser.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Institution:</span>
                      <span className="text-xs font-medium">
                        {currentUser.institution_id || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Permissions Summary */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-purple-700">
                      Total Permissions: {currentUser.permissions?.length || 0}
                    </p>

                    {/* Attendance Permissions */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-700">Attendance:</p>
                      {attendancePermissions.map((perm) => {
                        const hasPermission = currentUser.permissions?.includes(perm);
                        return (
                          <div key={perm} className="flex items-center gap-2 text-xs">
                            {hasPermission ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-400" />
                            )}
                            <span className={hasPermission ? 'text-green-700' : 'text-gray-400'}>
                              {perm}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* All Permissions */}
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2">All Permissions:</p>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {currentUser.permissions && currentUser.permissions.length > 0 ? (
                          currentUser.permissions.map((perm) => (
                            <div key={perm} className="text-xs text-gray-600 font-mono">
                              • {perm}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-red-500">⚠️ NO PERMISSIONS FOUND!</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Modules Tab */}
              {activeTab === 'modules' && (
                <div className="space-y-2 pr-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold mb-3 text-purple-700">
                      Debug Modules ({debug.modules.filter(m => m.enabled).length}/
                      {debug.modules.length} active)
                    </p>
                    <div className="space-y-2">
                      {debug.modules.map((module) => {
                        const canToggle =
                          !module.requiredPermission ||
                          currentUser?.permissions?.includes(module.requiredPermission);

                        return (
                          <div
                            key={module.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{module.name}</span>
                                {module.requiredPermission && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    {module.requiredPermission}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {module.id}
                              </span>
                            </div>
                            <Switch
                              checked={module.enabled}
                              onCheckedChange={() => debug.toggleModule(module.id)}
                              disabled={!canToggle}
                              className={!canToggle ? 'opacity-50' : ''}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Page Tab */}
              {activeTab === 'page' && (
                <div className="space-y-3 pr-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2 text-blue-700">Current Page:</p>
                    <div className="bg-gray-50 rounded p-2">
                      <code className="text-xs font-mono">
                        {debug.currentPage || 'No page tracked'}
                      </code>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2 text-purple-700">Page Debug Info:</p>
                    <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(debug.getPageDebugInfo(), null, 2)}
                    </pre>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      console.log('📄 Page Debug Info:', debug.getPageDebugInfo());
                    }}
                  >
                    Log to Console
                  </Button>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-3 pr-3">
                  {/* Debug Level */}
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs font-semibold mb-3 text-purple-700">Debug Level:</p>
                    <div className="space-y-2">
                      {debugLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => debug.setDebugLevel(level)}
                          className={`w-full px-3 py-2 text-xs rounded transition-colors ${
                            debug.debugLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{level}</span>
                            {debug.debugLevel === level && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold mb-2 text-blue-700">Quick Actions:</p>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        console.clear();
                        console.log('🔐 Current User:', currentUser);
                        console.log('🎯 Debug State:', debug.getPageDebugInfo());
                      }}
                    >
                      Log Everything to Console
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        debug.modules.forEach((m) => debug.enableModule(m.id));
                      }}
                    >
                      Enable All Modules
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        debug.modules.forEach((m) => debug.disableModule(m.id));
                      }}
                    >
                      Disable All Modules
                    </Button>

                    <Separator />

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full text-xs"
                      onClick={() => {
                        if (
                          confirm(
                            'Clear all auth data and reload? This will log you out.'
                          )
                        ) {
                          localStorage.removeItem('atis_current_user');
                          localStorage.removeItem('atis_auth_token');
                          localStorage.removeItem('atis_session_meta');
                          window.location.reload();
                        }
                      }}
                    >
                      Clear Cache & Reload
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
