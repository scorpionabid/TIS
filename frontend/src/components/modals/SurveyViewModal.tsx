import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, User, Building2, Eye, Clock, Target, Users, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Survey } from '@/services/surveys';

interface SurveyViewModalProps {
  open: boolean;
  onClose: () => void;
  survey: Survey | null;
}

export function SurveyViewModal({ open, onClose, survey }: SurveyViewModalProps) {
  if (!survey) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, label: string, icon: any }> = {
      'draft': { variant: 'secondary', label: 'Layihə', icon: HelpCircle },
      'active': { variant: 'default', label: 'Aktiv', icon: CheckCircle },
      'paused': { variant: 'outline', label: 'Dayandırıldı', icon: XCircle },
      'completed': { variant: 'success', label: 'Tamamlandı', icon: CheckCircle },
      'archived': { variant: 'destructive', label: 'Arxivləndi', icon: XCircle }
    };
    
    const config = variants[status] || { variant: 'secondary', label: status, icon: HelpCircle };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getQuestionTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      'text': 'Mətn sahəsi',
      'number': 'Rəqəm sahəsi', 
      'date': 'Tarix seçimi',
      'single_choice': 'Tək seçim',
      'multiple_choice': 'Çox seçim',
      'file_upload': 'Fayl yükləmə',
      'rating': 'Qiymətləndirmə',
      'table_matrix': 'Cədvəl/Matris'
    };
    
    return (
      <Badge variant="outline" className="text-xs">
        {types[type] || type}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Təyin edilməyib';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Sorğu məlumatları
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Survey Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{survey.title}</h2>
                {survey.description && (
                  <p className="text-muted-foreground">{survey.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {getStatusBadge(survey.status)}
                {survey.survey_type && (
                  <Badge variant="secondary">{survey.survey_type}</Badge>
                )}
              </div>
            </div>

            {/* Survey Meta Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Yaradan:</span>
                <span>{survey.creator?.full_name || survey.creator?.username || 'Məlum deyil'}</span>
              </div>

              {survey.institution && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Müəssisə:</span>
                  <span>{survey.institution.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Cavablar:</span>
                <span>{survey.response_count || 0}</span>
                {survey.max_responses && (
                  <span className="text-muted-foreground">/ {survey.max_responses}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Yaradılma:</span>
                <span>{formatDate(survey.created_at)}</span>
              </div>

              {survey.published_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Yayımlanma:</span>
                  <span>{formatDate(survey.published_at)}</span>
                </div>
              )}

              {survey.start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Başlama:</span>
                  <span>{formatDate(survey.start_date)}</span>
                </div>
              )}

              {survey.end_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Bitmə:</span>
                  <span>{formatDate(survey.end_date)}</span>
                </div>
              )}
            </div>

            {/* Survey Settings */}
            <div className="flex flex-wrap gap-2">
              {survey.is_anonymous && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Anonim sorğu
                </Badge>
              )}
              {survey.allow_multiple_responses && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Çoxsaylı cavablara icazə
                </Badge>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {/* Survey Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Sorğu Sualları ({(survey.questions || []).length})
              </h3>
              {(survey.questions || []).length === 0 && (
                <Badge variant="outline" className="text-amber-600 bg-amber-50">
                  Sual əlavə edilməyib
                </Badge>
              )}
            </div>

            {(survey.questions || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Bu sorğuda hələlik sual əlavə edilməyib</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(survey.questions || []).map((question, index) => (
                  <div key={question.id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="text-xs">
                          {index + 1}
                        </Badge>
                        {getQuestionTypeBadge(question.type)}
                        {question.required && (
                          <Badge variant="destructive" className="text-xs">
                            Məcburi
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">{question.question}</h4>
                      
                      {question.options && question.options.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Seçim variantları:</p>
                          <div className="pl-4 space-y-1">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.validation && (
                        <div className="text-xs text-muted-foreground">
                          {question.validation.min_length && (
                            <span>Minimum uzunluq: {question.validation.min_length} </span>
                          )}
                          {question.validation.max_length && (
                            <span>Maksimum uzunluq: {question.validation.max_length} </span>
                          )}
                          {question.validation.min_value && (
                            <span>Minimum dəyər: {question.validation.min_value} </span>
                          )}
                          {question.validation.max_value && (
                            <span>Maksimum dəyər: {question.validation.max_value}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Bağla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}