import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Edit, User, Calendar, FileText, Loader2, Filter, MessageSquare, History, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalService, ApprovalFilters, SurveyApproval } from "@/services/approval";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";

export default function SurveyApproval() {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApproval, setSelectedApproval] = useState<SurveyApproval | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [actionComments, setActionComments] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build filters
  const filters: ApprovalFilters = useMemo(() => {
    const f: ApprovalFilters = {};
    if (selectedStatus !== 'all') f.status = selectedStatus;
    if (selectedPriority !== 'all') f.priority = selectedPriority;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [selectedStatus, selectedPriority, searchQuery]);

  // Load approvals
  const { data: approvalsResponse, isLoading: approvalsLoading, error } = useQuery({
    queryKey: ['approvals', filters],
    queryFn: () => approvalService.getAllApprovals(filters),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Load pending approvals specifically
  const { data: pendingResponse, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => approvalService.getPendingApprovals({ status: 'pending' }),
    staleTime: 1000 * 60 * 1, // Cache for 1 minute
  });

  // Load approval statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['approval-statistics'],
    queryFn: () => approvalService.getApprovalStatistics(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use real data or fallback to mock data
  const approvals = approvalsResponse?.data || approvalService.getMockApprovals();
  const pendingApprovals = pendingResponse?.data || approvalService.getMockApprovals().filter(a => a.status === 'pending');
  const stats = statsResponse?.data || approvalService.getMockStatistics();

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (data: { id: number; comments?: string }) => 
      approvalService.approveSurvey(data.id, { comments: data.comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-statistics'] });
      setSelectedApproval(null);
      setApprovalAction(null);
      setActionComments('');
      toast({
        title: "Uğurlu",
        description: "Sorğu təsdiqləndi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sorğu təsdiqləniərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { id: number; rejection_reason: string; comments?: string }) => 
      approvalService.rejectSurvey(data.id, { rejection_reason: data.rejection_reason, comments: data.comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-statistics'] });
      setSelectedApproval(null);
      setApprovalAction(null);
      setActionComments('');
      setRejectionReason('');
      toast({
        title: "Uğurlu",
        description: "Sorğu rədd edildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Sorğu rədd edilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  const revisionMutation = useMutation({
    mutationFn: (data: { id: number; comments: string }) => 
      approvalService.requestRevision(data.id, { comments: data.comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-statistics'] });
      setSelectedApproval(null);
      setApprovalAction(null);
      setActionComments('');
      toast({
        title: "Uğurlu",
        description: "Yenidən baxılma tələbi göndərildi.",
      });
    },
    onError: () => {
      toast({
        title: "Xəta",
        description: "Yenidən baxılma tələbi göndərilərkən xəta baş verdi.",
        variant: "destructive",
      });
    }
  });

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'needs_revision': return 'outline';
      default: return 'outline';
    }
  };

  // Priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Gözləyir';
      case 'approved': return 'Təsdiqləndi';
      case 'rejected': return 'Rədd edildi';
      case 'needs_revision': return 'Yenidən baxılmalı';
      default: return status;
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Təcili';
      case 'high': return 'Yüksək';
      case 'medium': return 'Orta';
      case 'low': return 'Aşağı';
      default: return priority;
    }
  };

  const handleAction = () => {
    if (!selectedApproval || !approvalAction) return;

    switch (approvalAction) {
      case 'approve':
        approveMutation.mutate({ id: selectedApproval.id, comments: actionComments });
        break;
      case 'reject':
        if (!rejectionReason.trim()) {
          toast({
            title: "Xəta",
            description: "Rədd səbəbi qeyd edilməlidir.",
            variant: "destructive",
          });
          return;
        }
        rejectMutation.mutate({ 
          id: selectedApproval.id, 
          rejection_reason: rejectionReason, 
          comments: actionComments 
        });
        break;
      case 'revision':
        if (!actionComments.trim()) {
          toast({
            title: "Xəta",
            description: "Yenidən baxılma səbəbi qeyd edilməlidir.",
            variant: "destructive",
          });
          return;
        }
        revisionMutation.mutate({ id: selectedApproval.id, comments: actionComments });
        break;
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Təsdiq məlumatları yüklənərkən problem yarandı.</p>
        <p className="text-sm text-muted-foreground mt-2">Mock məlumatlarla davam edilir</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sorğular üçün Təsdiq</h1>
          <p className="text-muted-foreground">Sorğuların təsdiqlənməsi və rədd edilməsi</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gözləyən</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.pending_approvals
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu gün təsdiqləndi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.approved_today
                  )}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bu gün rədd edildi</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.rejected_today
                  )}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Yenidən baxılmalı</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.needs_revision
                  )}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filterlər
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="pending">Gözləyən</SelectItem>
                <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
                <SelectItem value="rejected">Rədd edilmiş</SelectItem>
                <SelectItem value="needs_revision">Yenidən baxılmalı</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün prioritetlər</SelectItem>
                <SelectItem value="urgent">Təcili</SelectItem>
                <SelectItem value="high">Yüksək</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Aşağı</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Sorğu axtar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>Təsdiq Siyahısı</CardTitle>
          <CardDescription>
            {approvals.length} təsdiq tapıldı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Təsdiqlər yüklənir...</span>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Seçilmiş kriteriiyalara uyğun təsdiq tapılmadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval: SurveyApproval) => (
                <div 
                  key={approval.id} 
                  className={`p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                    approval.status === 'pending' ? 'border-orange-200 bg-orange-50/50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground">{approval.survey.title}</h3>
                        <Badge variant={getStatusVariant(approval.status)}>
                          {getStatusLabel(approval.status)}
                        </Badge>
                        <Badge variant={getPriorityVariant(approval.priority)}>
                          {getPriorityLabel(approval.priority)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {approval.survey.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Tələb edən:</strong> {approval.requester.first_name} {approval.requester.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Tarix:</strong> {formatDistanceToNow(new Date(approval.requested_at), { 
                              addSuffix: true, 
                              locale: az 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>Hədəf:</strong> {approval.survey.target_audience}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>İş axını:</strong> {approval.workflow_step.step_name} 
                            {approval.workflow_step.is_current && (
                              <span className="text-orange-600 ml-1">(Cari mərhələ)</span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {approval.comments && (
                        <div className="mt-3 p-3 bg-accent/30 rounded text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4" />
                            <strong>Şərh:</strong>
                          </div>
                          <p>{approval.comments}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Ətraflı bax"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {approval.status === 'pending' && (
                        <>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setApprovalAction('reject');
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rədd et
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Sorğunu rədd et</DialogTitle>
                                <DialogDescription>
                                  Bu sorğunu rədd etmək istədiyinizə əminsiniz?
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Rədd səbəbi *</label>
                                  <Textarea 
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Sorğunun rədd edilmə səbəbini qeyd edin..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Əlavə şərh</label>
                                  <Textarea 
                                    value={actionComments}
                                    onChange={(e) => setActionComments(e.target.value)}
                                    placeholder="Əlavə məlumat və ya tövsiyələr..."
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                  setSelectedApproval(null);
                                  setApprovalAction(null);
                                  setActionComments('');
                                  setRejectionReason('');
                                }}>
                                  Ləğv et
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={handleAction}
                                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                                >
                                  {rejectMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Rədd et
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setApprovalAction('approve');
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Təsdiqlə
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Sorğunu təsdiqlə</DialogTitle>
                                <DialogDescription>
                                  Bu sorğunu təsdiqləmək istədiyinizə əminsiniz?
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Təsdiq şərhi</label>
                                  <Textarea 
                                    value={actionComments}
                                    onChange={(e) => setActionComments(e.target.value)}
                                    placeholder="Təsdiq haqqında əlavə qeydlər..."
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                  setSelectedApproval(null);
                                  setApprovalAction(null);
                                  setActionComments('');
                                }}>
                                  Ləğv et
                                </Button>
                                <Button 
                                  onClick={handleAction}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Təsdiqlə
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      
                      {approval.status === 'approved' && approval.approver && (
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {approval.approver.first_name} {approval.approver.last_name}
                          </div>
                          <div>{format(new Date(approval.approved_at!), 'dd.MM.yyyy HH:mm')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}