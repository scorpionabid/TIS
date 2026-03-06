/**
 * Debug Console Page
 * Real-time view of permission debugging logs
 * Access at: /debug
 */

import { useState, useEffect } from 'react';
import { debugLogger, type DebugLog } from '@/utils/debugLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RefreshCw, Power, PowerOff } from 'lucide-react';

export default function DebugConsole() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadLogs = () => {
    setLogs(debugLogger.getLogs());
  };

  useEffect(() => {
    loadLogs();
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClear = () => {
    debugLogger.clearLogs();
    setLogs([]);
  };

  const handleToggleDebug = () => {
    if (debugLogger.isEnabled()) {
      debugLogger.disable();
    } else {
      debugLogger.enable();
    }
    window.location.reload();
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'permission') return log.category.toLowerCase().includes('permission');
    if (filter === 'user') return log.category.toLowerCase().includes('user');
    if (filter === 'transform') return log.category.toLowerCase().includes('transform');
    return log.level === filter;
  });

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'warning';
      case 'success':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return '🔍';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🐛</span>
              ATİS Debug Console
              {debugLogger.isEnabled() && (
                <Badge variant="default" className="ml-2">
                  ACTIVE
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleDebug}
                className={debugLogger.isEnabled() ? 'bg-green-50' : 'bg-red-50'}
              >
                {debugLogger.isEnabled() ? (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Disable Debug
                  </>
                ) : (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Enable Debug
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={autoRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({logs.length})
            </Button>
            <Button
              variant={filter === 'permission' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('permission')}
            >
              Permissions
            </Button>
            <Button
              variant={filter === 'user' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('user')}
            >
              Users
            </Button>
            <Button
              variant={filter === 'transform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('transform')}
            >
              Transforms
            </Button>
            <Button
              variant={filter === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('error')}
            >
              Errors
            </Button>
            <Button
              variant={filter === 'warn' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('warn')}
            >
              Warnings
            </Button>
          </div>

          {/* Auto-refresh toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (1s)
            </label>
          </div>

          {/* Logs */}
          <ScrollArea className="h-[600px] border rounded-lg p-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No logs yet. Debug mode is{' '}
                {debugLogger.isEnabled() ? 'enabled' : 'disabled'}.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border-l-4 pl-4 py-2 rounded hover:bg-muted/50"
                    style={{
                      borderLeftColor:
                        log.level === 'error'
                          ? '#ef4444'
                          : log.level === 'warn'
                          ? '#f59e0b'
                          : log.level === 'success'
                          ? '#10b981'
                          : '#6b7280',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getLevelEmoji(log.level)}</span>
                          <Badge variant={getLevelBadgeVariant(log.level) as any}>
                            {log.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{log.message}</p>
                        {log.data && (
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
