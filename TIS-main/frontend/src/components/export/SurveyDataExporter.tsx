import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// DatePickerWithRange will be implemented separately or use standard date inputs
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { surveyApprovalService } from "@/services/surveyApproval";
import { surveyService } from "@/services/surveys";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Download, FileSpreadsheet, FileText, FileImage, 
  Calendar, Filter, CheckCircle, Clock, XCircle,
  Building, Users, BarChart3, Settings2
} from "lucide-react";
// import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";

interface SurveyDataExporterProps {
  className?: string;
}

interface ExportFilter {
  dateRange: { from: Date; to: Date } | undefined;
  format: 'xlsx' | 'csv' | 'pdf';
  includeFields: {
    responses: boolean;
    analytics: boolean;
    approvalHistory: boolean;
    institutions: boolean;
    demographics: boolean;
    metadata: boolean;
  };
  statusFilter: string[];
  institutionFilter: number[];
  surveyFilter: number[];
  groupBy: 'survey' | 'institution' | 'date' | 'status';
}

const defaultFilters: ExportFilter = {
  dateRange: {
    from: subDays(new Date(), 30),
    to: new Date()
  },
  format: 'xlsx',
  includeFields: {
    responses: true,
    analytics: true,
    approvalHistory: false,
    institutions: true,
    demographics: false,
    metadata: false
  },
  statusFilter: ['active', 'completed'],
  institutionFilter: [],
  surveyFilter: [],
  groupBy: 'survey'
};

export function SurveyDataExporter({ className }: SurveyDataExporterProps) {
  const [filters, setFilters] = useState<ExportFilter>(defaultFilters);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Get available surveys for filtering
  const { data: surveys } = useQuery({
    queryKey: ['surveys-for-export'],
    queryFn: () => surveyService.getAll({ per_page: 100 })
  });

  // Get available institutions for filtering (if user has appropriate permissions)
  const { data: institutions } = useQuery({
    queryKey: ['institutions-for-export'],
    queryFn: () => {
      // This would be an institutions service call
      return Promise.resolve({ data: [] }); // Placeholder
    },
    enabled: ['superadmin', 'regionadmin'].includes(currentUser?.role || '')
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      setIsExporting(true);
      setExportProgress(0);

      const exportParams = {
        format: filters.format,
        date_from: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
        date_to: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
        status: filters.statusFilter.length > 0 ? filters.statusFilter.join(',') : undefined,
        institution_id: filters.institutionFilter.length === 1 ? filters.institutionFilter[0] : undefined,
        survey_ids: filters.surveyFilter.length > 0 ? filters.surveyFilter.join(',') : undefined,
        group_by: filters.groupBy,
        include_fields: Object.keys(filters.includeFields).filter(
          key => filters.includeFields[key as keyof typeof filters.includeFields]
        ).join(',')
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev === null || prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 500);

      try {
        const blob = await surveyApprovalService.exportApprovalData(exportParams);
        
        setExportProgress(100);
        clearInterval(progressInterval);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${filters.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export uğurlu",
          description: `Survey məlumatları ${filters.format.toUpperCase()} formatında yükləndi`,
        });

      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(null);
        }, 1000);
      }
    },
    onError: (error) => {
      console.error('Export failed:', error);
      toast({
        variant: "destructive",
        title: "Export xətası",
        description: "Məlumat export edilərkən xəta baş verdi"
      });
    }
  });

  const updateFilter = <K extends keyof ExportFilter>(
    key: K, 
    value: ExportFilter[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const updateIncludeField = (field: keyof ExportFilter['includeFields'], checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: checked
      }
    }));
  };

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(status)
        ? prev.statusFilter.filter(s => s !== status)
        : [...prev.statusFilter, status]
    }));
  };

  const getEstimatedSize = () => {
    const baseSize = filters.includeFields.responses ? 5 : 1;
    const multiplier = filters.surveyFilter.length || surveys?.data?.data?.length || 10;
    const formatMultiplier = filters.format === 'pdf' ? 3 : 1;
    return Math.round(baseSize * multiplier * formatMultiplier * 0.1); // MB estimate
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Survey Məlumat Export
          </CardTitle>
          <CardDescription>
            Survey cavabları, analitika və təsdiq məlumatlarını müxtəlif formatlarda export edin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Formatı</Label>
            <RadioGroup 
              value={filters.format} 
              onValueChange={(value) => updateFilter('format', value as any)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel (.xlsx)</span>
                  <Badge variant="secondary">Təvsiyə edilir</Badge>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>CSV (.csv)</span>
                  <Badge variant="outline">Sadə format</Badge>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileImage className="h-4 w-4 text-red-600" />
                  <span>PDF (.pdf)</span>
                  <Badge variant="outline">Hesabat formatı</Badge>
                </label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tarix Aralığı
            </Label>
            {/* Simplified date inputs - DatePickerWithRange component to be implemented */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="px-3 py-2 border rounded-md"
                value={filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : ''}
                onChange={(e) => updateFilter('dateRange', {
                  from: new Date(e.target.value),
                  to: filters.dateRange?.to || new Date()
                })}
              />
              <input
                type="date"
                className="px-3 py-2 border rounded-md"
                value={filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : ''}
                onChange={(e) => updateFilter('dateRange', {
                  from: filters.dateRange?.from || subDays(new Date(), 30),
                  to: new Date(e.target.value)
                })}
              />
            </div>
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Status Filtri
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'draft', label: 'Layihə', icon: Clock },
                { key: 'active', label: 'Aktiv', icon: CheckCircle },
                { key: 'completed', label: 'Tamamlandı', icon: CheckCircle },
                { key: 'paused', label: 'Dayandırıldı', icon: XCircle },
                { key: 'archived', label: 'Arxivləndi', icon: XCircle }
              ].map((status) => (
                <Badge
                  key={status.key}
                  variant={filters.statusFilter.includes(status.key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleStatusFilter(status.key)}
                >
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Include Fields */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Daxil ediləcək məlumatlar
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'responses', label: 'Survey cavabları', icon: FileText },
                { key: 'analytics', label: 'Analitika məlumatları', icon: BarChart3 },
                { key: 'approvalHistory', label: 'Təsdiq tarixçəsi', icon: CheckCircle },
                { key: 'institutions', label: 'İnstitut məlumatları', icon: Building },
                { key: 'demographics', label: 'Demoqrafik məlumatlar', icon: Users },
                { key: 'metadata', label: 'Meta məlumatlar', icon: Settings2 }
              ].map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={filters.includeFields[field.key as keyof typeof filters.includeFields]}
                    onCheckedChange={(checked) => 
                      updateIncludeField(field.key as keyof typeof filters.includeFields, checked as boolean)
                    }
                  />
                  <label htmlFor={field.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <field.icon className="h-4 w-4" />
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Group By */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Qruplaşdırma</Label>
            <Select value={filters.groupBy} onValueChange={(value) => updateFilter('groupBy', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="survey">Survey-ə görə</SelectItem>
                <SelectItem value="institution">İnstituta görə</SelectItem>
                <SelectItem value="date">Tarixə görə</SelectItem>
                <SelectItem value="status">Statusa görə</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Export Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Təxmini fayl ölçüsü:</span>
              <span className="font-medium">{getEstimatedSize()} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Seçilmiş formatı:</span>
              <span className="font-medium">{filters.format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tarix aralığı:</span>
              <span className="font-medium">
                {filters.dateRange?.from && filters.dateRange?.to
                  ? `${format(filters.dateRange.from, 'dd.MM.yyyy')} - ${format(filters.dateRange.to, 'dd.MM.yyyy')}`
                  : 'Seçilməyib'
                }
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && exportProgress !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Export prosesi...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} />
            </div>
          )}

          {/* Export Button */}
          <Button 
            onClick={() => exportMutation.mutate()}
            disabled={isExporting || !filters.dateRange?.from || !filters.dateRange?.to}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Settings2 className="h-4 w-4 mr-2 animate-spin" />
                Export edilir...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Məlumatları Export Et
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}