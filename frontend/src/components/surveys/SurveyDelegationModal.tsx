import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck2, 
  Calendar, 
  MessageSquare, 
  AlertTriangle,
  Users,
  Building,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SurveyDelegationModalProps {
  open: boolean;
  onClose: () => void;
  approvalRequest: {
    id: number;
    request_title: string;
    survey_info?: {
      survey_title: string;
      survey_category: string;
      institution_name: string;
      respondent_name: string;
      progress_percentage: number;
    };
    current_status: string;
    priority: string;
    created_at: string;
  } | null;
}

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  institution?: {
    id: number;
    name: string;
    type: string;
  };
  avatar?: string;
}

interface DelegationFormData {
  delegate_to: number | null;
  reason: string;
  expiration_days: number;
  include_comments: boolean;
  urgent: boolean;
}

export function SurveyDelegationModal({ open, onClose, approvalRequest }: SurveyDelegationModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<DelegationFormData>({
    delegate_to: null,
    reason: '',
    expiration_days: 7,
    include_comments: true,
    urgent: false,
  });

  // Həvalə edilə bilən istifadəçiləri əldə et
  const { data: availableUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['delegation-users', currentUser?.role, searchTerm],
    queryFn: async () => {
      const response = await apiClient.get('/users/for-delegation', {
        params: {
          role_level: currentUser?.role,
          search: searchTerm,
          per_page: 50,
        },
      });
      return response.data?.users || [];
    },
    enabled: open && !!currentUser,
  });

  // Həvalə etmə mutation
  const delegateMutation = useMutation({
    mutationFn: async (data: DelegationFormData) => {
      if (!approvalRequest) throw new Error('Approval request tapılmadı');
      
      const response = await apiClient.post(`/survey-approval/requests/${approvalRequest.id}/delegate`, {
        delegate_to: data.delegate_to,
        reason: data.reason,
        expiration_days: data.expiration_days,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Uğurlu!",
        description: "Təsdiq səlahiyyəti həvalə edildi",
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Xəta",
        description: error.response?.data?.message || "Həvalə etmə zamanı xəta baş verdi",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      delegate_to: null,
      reason: '',
      expiration_days: 7,
      include_comments: true,
      urgent: false,
    });
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.delegate_to) {
      toast({
        title: "Xəta",
        description: "Həvalə ediləcək istifadəçini seçin",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: "Xəta", 
        description: "Həvalə səbəbini qeyd edin",
        variant: "destructive",
      });
      return;
    }

    delegateMutation.mutate(formData);
  };

  const selectedUser = availableUsers?.find((user: User) => user.id === formData.delegate_to);

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: any, label: string, color: string }> = {
      'low': { variant: 'secondary', label: 'Aşağı', color: 'text-green-600' },
      'normal': { variant: 'outline', label: 'Normal', color: 'text-blue-600' },
      'high': { variant: 'destructive', label: 'Yüksək', color: 'text-red-600' },
    };
    
    const config = variants[priority] || variants['normal'];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string }> = {
      'pending': { variant: 'secondary', label: 'Gözləyir' },
      'in_progress': { variant: 'default', label: 'İcrada' },
      'approved': { variant: 'success', label: 'Təsdiqləndi' },
      'rejected': { variant: 'destructive', label: 'Rədd edildi' },
    };
    
    const config = variants[status] || variants['pending'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!approvalRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck2 className="h-5 w-5" />
            Təsdiq Səlahiyyətini Həvalə Et
          </DialogTitle>
        </DialogHeader>

        {/* Approval Request Info */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h4 className="font-medium">{approvalRequest.request_title}</h4>
              {approvalRequest.survey_info && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {approvalRequest.survey_info.institution_name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cavab verən: {approvalRequest.survey_info.respondent_name}
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Tamamlanma: {approvalRequest.survey_info.progress_percentage}%
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(approvalRequest.current_status)}
              {getPriorityBadge(approvalRequest.priority)}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(approvalRequest.created_at).toLocaleDateString('az-AZ')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {approvalRequest.survey_info?.survey_category || 'Ümumi'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Selection */}
          <div className="space-y-3">
            <Label>Həvalə ediləcək istifadəçi *</Label>
            
            {/* Search Input */}
            <Input
              placeholder="İstifadəçi adı və ya email ilə axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Users List */}
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {usersLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">İstifadəçilər yüklənir...</p>
                </div>
              ) : availableUsers?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Həvalə edilə bilən istifadəçi tapılmadı</p>
                </div>
              ) : (
                <div className="p-2">
                  {availableUsers?.map((user: User) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        formData.delegate_to === user.id ? 'bg-primary/10 border border-primary' : ''
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, delegate_to: user.id }))}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{user.role}</Badge>
                            {user.institution && (
                              <span className="text-xs text-muted-foreground">
                                {user.institution.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {formData.delegate_to === user.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected User Info */}
            {selectedUser && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="text-xs">
                      {selectedUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.role} • {selectedUser.institution?.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delegation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Həvalə səbəbi *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Təsdiq səlahiyyətini həvalə etmə səbəbini qeyd edin..."
              rows={3}
              required
            />
          </div>

          {/* Expiration Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Həvalənin müddəti (gün)</Label>
              <Select
                value={formData.expiration_days.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expiration_days: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 gün</SelectItem>
                  <SelectItem value="3">3 gün</SelectItem>
                  <SelectItem value="7">1 həftə</SelectItem>
                  <SelectItem value="14">2 həftə</SelectItem>
                  <SelectItem value="30">1 ay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioritet</Label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={formData.urgent}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgent: e.target.checked }))}
                />
                <Label htmlFor="urgent" className="text-sm font-normal cursor-pointer">
                  Təcili həvalə (dərhal bildiriş göndər)
                </Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Diqqət:</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Təsdiq səlahiyyətini həvalə etdikdə, sizin bu tələbə giriş icazəniz ləğv olunacaq. 
                Həvalə edilən şəxs müddət ərzində təsdiq və ya rədd cavabı verməlidir.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button 
              type="submit" 
              disabled={delegateMutation.isPending || !formData.delegate_to || !formData.reason.trim()}
            >
              {delegateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Həvalə et
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}