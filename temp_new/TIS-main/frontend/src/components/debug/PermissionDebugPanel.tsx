/**
 * Permission Debug Panel
 * Only visible in development mode
 * Shows current user permissions and role info
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User, CheckCircle, XCircle } from 'lucide-react';

export function PermissionDebugPanel() {
  const { currentUser } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!currentUser) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permission Debug (Dev Mode)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No user logged in</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendancePermissions = [
    'attendance.read',
    'attendance.create',
    'attendance.update',
    'attendance.manage',
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card className="bg-blue-50 border-blue-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permission Debug (Dev Mode)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* User Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3 w-3" />
              <span className="font-semibold">{currentUser.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Role:</span>
              <Badge variant="outline" className="text-xs">
                {currentUser.role}
              </Badge>
            </div>
          </div>

          {/* Permissions Count */}
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold mb-2">
              Total Permissions: {currentUser.permissions?.length || 0}
            </p>

            {/* Attendance Permissions */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-purple-700">Attendance Permissions:</p>
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

          {/* All Permissions (scrollable) */}
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold mb-1">All Permissions:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
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
          </div>

          {/* Debug Actions */}
          <div className="pt-2 border-t space-y-1">
            <button
              onClick={() => {
                console.clear();
                console.log('🔐 Current User Full Object:', currentUser);
                console.log('🔐 Permissions Array:', currentUser.permissions);
                console.log('🔐 Has attendance.read?', currentUser.permissions?.includes('attendance.read'));
              }}
              className="w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Log User to Console
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('atis_current_user');
                localStorage.removeItem('atis_auth_token');
                window.location.reload();
              }}
              className="w-full text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
            >
              Clear Cache & Reload
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
