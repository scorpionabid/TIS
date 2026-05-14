import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Filter, Download, AlertTriangle, User, Calendar, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';

interface AuditLog {
  id: number;
  student_id: number;
  grade_book_column_id: number;
  user_id: number;
  action_type: string;
  old_score: number | null;
  new_score: number | null;
  old_is_present: boolean | null;
  new_is_present: boolean | null;
  ip_address: string;
  notes: string | null;
  created_at: string;
  student: {
    first_name: string;
    last_name: string;
    father_name: string;
  };
  column: {
    column_label: string;
    semester: string;
  };
  user: {
    name: string;
    email: string;
  };
}

interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface SuspiciousActivity {
  bulk_updates: Array<{
    user_id: number;
    update_count: number;
  }>;
  large_changes: Array<{
    student_id: number;
    user_id: number;
    old_score: number;
    new_score: number;
    student: {
      first_name: string;
      last_name: string;
    };
    user: {
      name: string;
    };
  }>;
  has_suspicious_activity: boolean;
}

export function AuditLogViewer() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    student_id: '',
    action_type: '',
    start_date: '',
    end_date: '',
    user_id: '',
  });
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity | null>(null);
  const [showSuspiciousDialog, setShowSuspiciousDialog] = useState(false);

  useEffect(() => {
    loadAuditLogs();
    loadSuspiciousActivity();
  }, [id, currentPage, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([k, v]) => v !== '' && v !== 'all')
        ),
      });

      const response = await apiClient.get<AuditLogResponse>(
        `/grade-books/${id}/audit-logs?${params}`
      );

      setLogs(response.data.data);
      setTotalPages(response.data.meta.last_page);
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Audit logları yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuspiciousActivity = async () => {
    try {
      const response = await apiClient.get<{ data: SuspiciousActivity }>(
        `/grade-books/${id}/audit-logs/suspicious-activity`
      );
      setSuspiciousActivity(response.data.data);
    } catch (error) {
      console.error('Suspicious activity load failed', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get(
        `/grade-books/${id}/audit-logs?export=1`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${id}.csv`;
      a.click();
      
      toast({
        title: 'Uğurlu',
        description: 'Audit loglar export edildi',
      });
    } catch (error) {
      toast({
        title: 'Xəta',
        description: 'Export zamanı xəta baş verdi',
        variant: 'destructive',
      });
    }
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'bulk_update': 'bg-purple-100 text-purple-800',
      'absence_marked': 'bg-orange-100 text-orange-800',
      'presence_marked': 'bg-green-100 text-green-800',
    };
    
    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {action}
      </Badge>
    );
  };

  const getScoreChange = (oldScore: number | null, newScore: number | null) => {
    if (oldScore === null || newScore === null) return null;
    const change = newScore - oldScore;
    const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
    const sign = change > 0 ? '+' : '';
    return <span className={color}>{sign}{change.toFixed(1)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Audit Logları</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {suspiciousActivity?.has_suspicious_activity && (
            <Dialog open={showSuspiciousDialog} onOpenChange={setShowSuspiciousDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Şübhəli fəaliyyət
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Şübhəli fəaliyyət aşkar edildi</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[400px]">
                  {suspiciousActivity.bulk_updates.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Toplu yeniləmələr:</h4>
                      {suspiciousActivity.bulk_updates.map((update, idx) => (
                        <p key={idx} className="text-sm text-red-600">
                          İstifadəçi #{update.user_id}: {update.update_count} dəyişiklik
                        </p>
                      ))}
                    </div>
                  )}
                  {suspiciousActivity.large_changes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Böyük bal dəyişiklikləri:</h4>
                      {suspiciousActivity.large_changes.map((change, idx) => (
                        <p key={idx} className="text-sm text-red-600">
                          {change.student.last_name} {change.student.first_name}: 
                          {' '}{change.old_score} → {change.new_score}
                          {' '}(İstifadəçi: {change.user.name})
                        </p>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Input
              placeholder="Şagird ID"
              value={filters.student_id}
              onChange={(e) => setFilters({ ...filters, student_id: e.target.value })}
            />
            <Select
              value={filters.action_type}
              onValueChange={(value) => setFilters({ ...filters, action_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Əməliyyat tipi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Hamısı</SelectItem>
                <SelectItem value="create">Yaratma</SelectItem>
                <SelectItem value="update">Yeniləmə</SelectItem>
                <SelectItem value="delete">Silmə</SelectItem>
                <SelectItem value="bulk_update">Toplu yeniləmə</SelectItem>
                <SelectItem value="absence_marked">Qayıb</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Başlanğıc tarixi"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Bitiş tarixi"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
            <Button variant="outline" onClick={() => {
              setFilters({
                student_id: '',
                action_type: '',
                start_date: '',
                end_date: '',
                user_id: '',
              });
            }}>
              Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarix</TableHead>
                <TableHead>Şagird</TableHead>
                <TableHead>Sütun</TableHead>
                <TableHead>Əməliyyat</TableHead>
                <TableHead>Köhnə bal</TableHead>
                <TableHead>Yeni bal</TableHead>
                <TableHead>Dəyişiklik</TableHead>
                <TableHead>İstifadəçi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Yüklənir...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Heç bir log tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleDateString('az-AZ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.student.last_name} {log.student.first_name}
                    </TableCell>
                    <TableCell>
                      {log.column.column_label}
                      <Badge variant="outline" className="ml-1 text-xs">
                        {log.column.semester}
                      </Badge>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell>{log.old_score?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell>{log.new_score?.toFixed(1) ?? '-'}</TableCell>
                    <TableCell>{getScoreChange(log.old_score, log.new_score)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user.name}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="my-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
