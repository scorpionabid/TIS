import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { 
  FileText, 
  Check, 
  X, 
  Eye, 
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  User,
  Calendar
} from 'lucide-react';
import approvalService from '../../services/approvalService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { toast } from 'sonner';

interface Survey {
  id: number;
  title: string;
  description: string;
  category: string;
  institution: {
    id: number;
    name: string;
    type: string;
  };
  status: string;
  created_at: string;
}

interface SurveyResponse {
  id: number;
  survey: {
    id: number;
    title: string;
    category: string;
  };
  institution: {
    id: number;
    name: string;
    type: string;
    code: string;
  };
  respondent: {
    id: number;
    name: string;
    email: string;
  };
  response_data: any;
  progress_percentage: number;
  is_complete: boolean;
  status: string;
  submitted_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

const SurveyResponsesTab: React.FC = () => {
  const { currentUser: user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponses, setSelectedResponses] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      loadSurveyResponses();
    }
  }, [selectedSurvey, statusFilter]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await approvalService.getSurveysForApproval();
      if (response.success) {
        setSurveys(response.data);
        if (response.data.length > 0) {
          setSelectedSurvey(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading surveys:', error);
      toast.error('Sorğular yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const loadSurveyResponses = async () => {
    if (!selectedSurvey) return;

    try {
      setLoading(true);
      const response = await approvalService.getSurveyResponses(selectedSurvey.id, statusFilter);
      if (response.success) {
        let filteredResponses = response.data;
        
        // Apply search filter
        if (searchTerm) {
          filteredResponses = filteredResponses.filter((response: SurveyResponse) => 
            response.institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            response.respondent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            response.respondent.email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setSurveyResponses(filteredResponses);
      }
    } catch (error) {
      console.error('Error loading survey responses:', error);
      toast.error('Sorğu cavabları yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResponse = async (responseId: number) => {
    try {
      const response = await approvalService.approveSurveyResponse(responseId);
      if (response.success) {
        toast.success('Sorğu cavabı təsdiqləndi');
        loadSurveyResponses();
      }
    } catch (error) {
      console.error('Error approving response:', error);
      toast.error('Təsdiq zamanı xəta baş verdi');
    }
  };

  const handleRejectResponse = async (responseId: number) => {
    const reason = prompt('Rədd səbəbini daxil edin:');
    if (!reason) return;

    try {
      const response = await approvalService.rejectSurveyResponse(responseId, reason);
      if (response.success) {
        toast.success('Sorğu cavabı rədd edildi');
        loadSurveyResponses();
      }
    } catch (error) {
      console.error('Error rejecting response:', error);
      toast.error('Rədd zamanı xəta baş verdi');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedResponses.length === 0) return;

    try {
      const response = await approvalService.bulkApproveSurveyResponses(selectedResponses);
      if (response.success) {
        toast.success(`${response.data.approved_count} sorğu cavabı təsdiqləndi`);
        setSelectedResponses([]);
        loadSurveyResponses();
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Kütləvi təsdiq zamanı xəta baş verdi');
    }
  };

  const handleSelectResponse = (responseId: number) => {
    setSelectedResponses(prev => 
      prev.includes(responseId) 
        ? prev.filter(id => id !== responseId)
        : [...prev, responseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedResponses.length === surveyResponses.length) {
      setSelectedResponses([]);
    } else {
      setSelectedResponses(surveyResponses.map(response => response.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Təqdim edilib';
      case 'approved': return 'Təsdiqlənib';
      case 'rejected': return 'Rədd edilib';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'submitted': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading && surveys.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Survey Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Sorğu Cavablarının Təsdiqi</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Survey Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sorğu seçin
              </label>
              <Select 
                value={selectedSurvey?.id.toString() || ''} 
                onValueChange={(value) => {
                  const survey = surveys.find(s => s.id.toString() === value);
                  setSelectedSurvey(survey || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sorğu seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map(survey => (
                    <SelectItem key={survey.id} value={survey.id.toString()}>
                      {survey.title} ({survey.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Təqdim edilmiş</SelectItem>
                  <SelectItem value="approved">Təsdiqlənmiş</SelectItem>
                  <SelectItem value="rejected">Rədd edilmiş</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Müəssisə və ya istifadəçi adı ilə axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Actions */}
          {selectedResponses.length > 0 && statusFilter === 'submitted' && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                {selectedResponses.length} cavab seçildi
              </span>
              <Button 
                size="sm" 
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Hamısını Təsdiq Et
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Info */}
      {selectedSurvey && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedSurvey.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedSurvey.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>Kateqoriya: {selectedSurvey.category}</span>
                  <span>Yaradılma: {formatDistanceToNow(new Date(selectedSurvey.created_at), { addSuffix: true, locale: az })}</span>
                </div>
              </div>
              <Badge variant="outline">{selectedSurvey.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses List */}
      {selectedSurvey && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Cavablar ({surveyResponses.length})</span>
              </CardTitle>
              
              {statusFilter === 'submitted' && surveyResponses.length > 0 && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedResponses.length === surveyResponses.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                  <label className="text-sm font-medium">Hamısını seç</label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : surveyResponses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Bu status üçün cavab tapılmadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveyResponses.map((response) => (
                  <div key={response.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {statusFilter === 'submitted' && (
                            <input
                              type="checkbox"
                              checked={selectedResponses.includes(response.id)}
                              onChange={() => handleSelectResponse(response.id)}
                              className="rounded border-gray-300"
                            />
                          )}
                          
                          <Badge 
                            variant={getStatusBadgeVariant(response.status) as any}
                            className="flex items-center space-x-1"
                          >
                            {getStatusIcon(response.status)}
                            <span>{getStatusText(response.status)}</span>
                          </Badge>
                          
                          <span className="text-sm text-gray-500">
                            {response.progress_percentage}% tamamlandı
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4" />
                            <span>
                              <span className="font-medium">Müəssisə:</span> {response.institution.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>
                              <span className="font-medium">Cavablayan:</span> {response.respondent.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              <span className="font-medium">Tarix:</span> {formatDistanceToNow(new Date(response.submitted_at), { addSuffix: true, locale: az })}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Email:</span> {response.respondent.email}
                        </div>

                        {response.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <span className="font-medium">Rədd səbəbi:</span> {response.rejection_reason}
                          </div>
                        )}

                        {response.approved_by && (
                          <div className="mt-2 text-sm text-green-600">
                            <span className="font-medium">Təsdiqləyən:</span> {response.approved_by} 
                            {response.approved_at && (
                              <span className="text-gray-500 ml-2">
                                ({formatDistanceToNow(new Date(response.approved_at), { addSuffix: true, locale: az })})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {statusFilter === 'submitted' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleApproveResponse(response.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Təsdiq Et
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejectResponse(response.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rədd Et
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SurveyResponsesTab;