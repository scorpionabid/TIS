import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Edit2,
  Save,
  X,
  Check,
  Undo,
  Users,
  Building,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react';
import approvalService from '../../services/approvalService';
import { formatDistanceToNow } from 'date-fns';
import { az } from 'date-fns/locale';
import { toast } from 'sonner';

interface Survey {
  id: number;
  title: string;
}

interface InstitutionData {
  institution: {
    id: number;
    name: string;
    type: string;
    code: string;
  };
  responses: ResponseData[];
  respondents_count: number;
  can_edit: boolean;
  can_approve: boolean;
}

interface ResponseData {
  id: number;
  respondent: {
    id: number;
    name: string;
    email: string;
  };
  questions: Record<string, QuestionResponse>;
  submitted_at: string;
  status: string;
}

interface QuestionResponse {
  question: {
    id: number;
    title: string;
    type: string;
    is_required: boolean;
    options?: Array<{ id: string; label: string }>;
  };
  value: any;
  is_editable: boolean;
}

interface EditState {
  [responseId: string]: {
    [questionId: string]: any;
  };
}

interface InstitutionResponsesTableProps {
  survey: Survey;
  onUpdate: () => void;
}

const InstitutionResponsesTable: React.FC<InstitutionResponsesTableProps> = ({
  survey,
  onUpdate
}) => {
  const [institutionData, setInstitutionData] = useState<Record<string, InstitutionData>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState>({});
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(new Set());

  // Load table data
  const loadTableData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await approvalService.getTableEditingView(survey.id);

      if (response.success) {
        setInstitutionData(response.data.institutions || {});
        setQuestions(response.data.questions || []);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      toast.error('Table məlumatları yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  }, [survey.id]);

  useEffect(() => {
    if (survey) {
      loadTableData();
    }
  }, [survey, loadTableData]);

  // Edit handlers
  const handleStartEdit = (responseId: string, questionId: string, currentValue: any) => {
    setEditState(prev => ({
      ...prev,
      [responseId]: {
        ...(prev[responseId] || {}),
        [questionId]: currentValue
      }
    }));
  };

  const handleEditChange = (responseId: string, questionId: string, value: any) => {
    setEditState(prev => ({
      ...prev,
      [responseId]: {
        ...(prev[responseId] || {}),
        [questionId]: value
      }
    }));
  };

  const handleSaveInstitutionEdits = async (institutionId: string) => {
    const institution = institutionData[institutionId];
    const updates: Array<{ response_id: number; responses: Record<string, any> }> = [];

    // Collect edits for this institution
    institution.responses.forEach(response => {
      const edits = editState[response.id];
      if (edits && Object.keys(edits).length > 0) {
        updates.push({
          response_id: response.id,
          responses: edits
        });
      }
    });

    if (updates.length === 0) {
      toast.info('Dəyişiklik edilmədi');
      return;
    }

    try {
      const response = await approvalService.batchUpdateResponses(updates);

      if (response.success) {
        toast.success(`${updates.length} cavab yeniləndi`);

        // Clear edit state
        const newEditState = { ...editState };
        institution.responses.forEach(resp => {
          delete newEditState[resp.id];
        });
        setEditState(newEditState);

        // Reload data
        loadTableData();
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      toast.error('Dəyişikliklər saxlanılmadı');
    }
  };

  const handleCancelInstitutionEdits = (institutionId: string) => {
    const institution = institutionData[institutionId];
    const newEditState = { ...editState };

    institution.responses.forEach(response => {
      delete newEditState[response.id];
    });

    setEditState(newEditState);
    toast.info('Dəyişikliklər ləğv edildi');
  };

  // Bulk operations
  const handleBulkApprove = async () => {
    if (selectedInstitutions.length === 0) {
      toast.error('Heç bir müəssisə seçilmədi');
      return;
    }

    const responseIds: number[] = [];
    selectedInstitutions.forEach(institutionId => {
      institutionData[institutionId].responses.forEach(response => {
        responseIds.push(response.id);
      });
    });

    try {
      const response = await approvalService.bulkApprovalOperation({
        response_ids: responseIds,
        action: 'approve',
        comments: 'Kütləvi təsdiq'
      });

      if (response.success) {
        toast.success(`${selectedInstitutions.length} müəssisə təsdiqləndi`);
        setSelectedInstitutions([]);
        onUpdate();
        loadTableData();
      }
    } catch (error) {
      console.error('Bulk approval error:', error);
      toast.error('Kütləvi təsdiq xətası');
    }
  };

  // Render cell content
  const renderEditableCell = (response: ResponseData, questionId: string) => {
    const questionResponse = response.questions[questionId];
    if (!questionResponse) return <span>-</span>;

    const { question, value, is_editable } = questionResponse;
    const editValue = editState[response.id]?.[questionId];
    const isEditing = editValue !== undefined;
    const displayValue = isEditing ? editValue : value;

    if (!is_editable) {
      return (
        <div className="text-gray-600 p-2">
          {formatResponseValue(value, question.type)}
        </div>
      );
    }

    if (!isEditing) {
      return (
        <div
          className="group cursor-pointer p-2 hover:bg-gray-50 rounded border-2 border-transparent hover:border-blue-200 min-h-[40px] flex items-center"
          onClick={() => handleStartEdit(response.id, questionId, value)}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-sm">{formatResponseValue(value, question.type)}</span>
            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-blue-500" />
          </div>
        </div>
      );
    }

    return (
      <div className="p-1">
        {renderEditControl(question, displayValue, (newValue) =>
          handleEditChange(response.id, questionId, newValue)
        )}
      </div>
    );
  };

  const renderEditControl = (question: any, value: any, onChange: (value: any) => void) => {
    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[60px] text-sm"
            placeholder={question.title}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || '')}
            className="text-sm"
          />
        );

      case 'single_choice':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 text-sm border rounded"
          >
            <option value="">Seç...</option>
            {question.options?.map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm"
          />
        );
    }
  };

  const formatResponseValue = (value: any, type: string): string => {
    if (value === null || value === undefined || value === '') return '-';

    switch (type) {
      case 'multiple_choice':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'date':
        return new Date(value).toLocaleDateString('az-AZ');
      case 'rating':
        return `${value}/10`;
      default:
        return String(value);
    }
  };

  const hasEditsForInstitution = (institutionId: string): boolean => {
    return institutionData[institutionId].responses.some(response =>
      editState[response.id] && Object.keys(editState[response.id]).length > 0
    );
  };

  const toggleInstitutionExpansion = (institutionId: string) => {
    setExpandedInstitutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(institutionId)) {
        newSet.delete(institutionId);
      } else {
        newSet.add(institutionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Müəssisə Cavablarını Redaktə Et</h3>
              <p className="text-sm text-gray-600">
                Hər müəssisənin cavablarını düzəliş edin və təsdiq edin
              </p>
            </div>

            {selectedInstitutions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {selectedInstitutions.length} müəssisə seçildi
                </Badge>
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
          </div>
        </CardContent>
      </Card>

      {/* Institution Cards */}
      {Object.entries(institutionData).map(([institutionId, data]) => (
        <Card key={institutionId} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {data.can_approve && (
                  <input
                    type="checkbox"
                    checked={selectedInstitutions.includes(institutionId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInstitutions(prev => [...prev, institutionId]);
                      } else {
                        setSelectedInstitutions(prev => prev.filter(id => id !== institutionId));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                )}

                <div>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>{data.institution.name}</span>
                    <Badge variant="outline">{data.institution.type}</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    <Users className="h-4 w-4 inline mr-1" />
                    {data.respondents_count} cavab •
                    Kod: {data.institution.code}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {hasEditsForInstitution(institutionId) && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSaveInstitutionEdits(institutionId)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Saxla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelInstitutionEdits(institutionId)}
                    >
                      <Undo className="h-4 w-4 mr-1" />
                      Ləğv Et
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleInstitutionExpansion(institutionId)}
                >
                  {expandedInstitutions.has(institutionId) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expandedInstitutions.has(institutionId) && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cavablayan
                      </th>
                      {questions.map(question => (
                        <th
                          key={question.id}
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]"
                        >
                          <div className="break-words">
                            {question.title}
                            {question.is_required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 normal-case mt-1">
                            {question.type}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.responses.map(response => (
                      <tr key={response.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {response.respondent.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {response.respondent.email}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center">
                            {response.status === 'approved' && (
                              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                            )}
                            {response.status === 'rejected' && (
                              <XCircle className="h-3 w-3 text-red-500 mr-1" />
                            )}
                            {response.submitted_at &&
                              formatDistanceToNow(new Date(response.submitted_at), {
                                addSuffix: true,
                                locale: az
                              })
                            }
                          </div>
                        </td>
                        {questions.map(question => (
                          <td key={question.id} className="px-3 py-4 align-top">
                            {renderEditableCell(response, question.id.toString())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {Object.keys(institutionData).length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Bu sorğu üçün heç bir müəssisə cavabı tapılmadı.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstitutionResponsesTable;