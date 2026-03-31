import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Baby,
  Filter,
} from "lucide-react";
import { preschoolsService } from "@/services/preschools";
import { useInstitutionTypes } from "@/hooks/useInstitutionTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { ImportResultModal } from "./ImportResultModal";
import { ImportProgress } from "@/components/ui/import-progress";
import { Skeleton } from "@/components/ui/skeleton";

interface PreschoolsImportExportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

// Level 5 institution types (preschools only)
const PRESCHOOL_LEVEL = 5;

export function PreschoolsImportExportModal({
  open,
  onClose,
  onImportComplete,
}: PreschoolsImportExportModalProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("template");
  const [selectedType, setSelectedType] = useState<string>("kindergarten");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<
    "uploading" | "processing" | "validating" | "complete" | "error"
  >("uploading");
  const [importResult, setImportResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Load institution types for level 5 (preschools only)
  const { data: institutionTypesResponse, isLoading: isLoadingTypes } =
    useInstitutionTypes({
      userRole: currentUser?.role,
      enabled: !!currentUser && open,
    });

  // Filter only level 5 institution types (preschools)
  const availableTypes = React.useMemo(() => {
    if (!institutionTypesResponse?.institution_types) {
      return [];
    }

    return institutionTypesResponse.institution_types
      .filter((type: any) => type.default_level === PRESCHOOL_LEVEL)
      .map((type: any) => ({
        key: type.key,
        label: type.label_az || type.label,
        level: type.default_level,
        color: type.color || "#f59e0b",
        icon: type.icon || "🏫",
      }));
  }, [institutionTypesResponse]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab("template");
      setSelectedType("kindergarten");
      setUploadFile(null);
      setImportProgress(0);
      setImportStatus("uploading");
      setImportResult(null);
      setShowResultModal(false);
    }
  }, [open]);

  // Generate and download template
  const handleDownloadTemplate = async () => {
    try {
      setGenerating(true);

      const templateBlob =
        await preschoolsService.downloadImportTemplate(selectedType);
      const selectedTypeInfo = availableTypes.find(
        (t) => t.key === selectedType,
      );

      // Create download link
      const url = window.URL.createObjectURL(templateBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTypeInfo?.label || selectedType}_template_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Uğurlu",
        description: "Template uğurla yükləndi",
      });
    } catch (error) {
      console.error("Template download error:", error);
      toast({
        title: "Xəta",
        description: "Template yüklənərkən xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Export preschools
  const handleExport = async () => {
    try {
      setGenerating(true);

      const exportBlob = await preschoolsService.exportPreschools(selectedType);
      const selectedTypeInfo = availableTypes.find(
        (t) => t.key === selectedType,
      );

      // Create download link
      const url = window.URL.createObjectURL(exportBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedTypeInfo?.label || selectedType}_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Uğurlu",
        description: "Məktəbəqədər müəssisələr uğurla ixrac edildi",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Xəta",
        description: "Ixrac zamanı xəta baş verdi",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Xəta",
        description: "Zəhmət olmasa fayl seçin",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setImportProgress(0);
      setImportStatus("uploading");

      // Simulate progress updates
      const progressTimer = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      // Update status steps
      setTimeout(() => setImportStatus("processing"), 500);
      setTimeout(() => setImportStatus("validating"), 1500);

      const result = await preschoolsService.importPreschools(
        uploadFile,
        selectedType,
      );

      clearInterval(progressTimer);
      setImportProgress(100);
      setImportStatus("complete");

      // Store result for detailed modal
      setImportResult(result.data);

      // Brief success toast
      const hasErrors =
        result.data?.data?.errors && result.data.data.errors.length > 0;
      const duplicateCount = result.data?.data?.duplicate_count || 0;
      toast({
        title: hasErrors ? "İdxal tamamlandı (xətalarla)" : "Uğurlu idxal",
        description: hasErrors
          ? `${result.data?.data?.success || 0} uğurlu, ${result.data.data.errors.length} xəta`
          : `${result.data?.data?.success || 0} məktəbəqədər müəssisə əlavə edildi${duplicateCount > 0 ? ` (${duplicateCount} duplikat)` : ""}`,
        variant: hasErrors ? "default" : "default",
      });

      // Show detailed result modal after brief delay
      setTimeout(() => {
        setShowResultModal(true);
      }, 800);

      onImportComplete?.();
    } catch (error: any) {
      setImportStatus("error");
      setImportProgress(0);

      console.error("Import error:", error);

      // Extract detailed error message
      let errorMessage = "Fayl idxal edilərkən xəta baş verdi";

      if (error.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.errors) {
        errorMessage = Array.isArray(error.response.data.errors)
          ? error.response.data.errors.join(", ")
          : error.response.data.errors;
      }

      // Store error result for modal
      setImportResult({
        success: 0,
        errors: [errorMessage],
        created_institutions: [],
      });

      toast({
        title: "İdxal xətası",
        description: errorMessage,
        variant: "destructive",
      });

      // Show error result modal
      setTimeout(() => {
        setShowResultModal(true);
      }, 500);
    } finally {
      setUploading(false);
      // Reset progress after delay
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus("uploading");
      }, 3000);
    }
  };

  const selectedTypeInfo = availableTypes.find((t) => t.key === selectedType);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Məktəbəqədər Müəssisə İdxal/İxrac
          </DialogTitle>
          <DialogDescription>
            Məktəbəqədər müəssisələri idxal və ixrac etmək üçün modal pəncərə
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template İdarəsi
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Fayl Yükləmə
            </TabsTrigger>
          </TabsList>

          {/* Type Selection */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                Müəssisə Növü Seçimi
              </span>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Müəssisə növünü seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeInfo && (
              <div className="mt-3 text-sm text-blue-600">
                <p>
                  • Seçilən növ: <strong>{selectedTypeInfo.label}</strong>
                </p>
                <p>• Template bu növün sahələri üçün hazırlanacaq</p>
                <p>
                  • Admin avtomatik <strong>preschooladmin</strong> rolunda
                  yaradılacaq
                </p>
              </div>
            )}
          </div>

          {/* Template Management Tab */}
          <TabsContent value="template" className="mt-6">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Download Template */}
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Template Yüklə</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seçilmiş müəssisə növü üçün idxal templatesi yükləyin.
                    Template-də düzgün format və nümunə məlumatlar göstəriləcək.
                  </p>
                  <Button
                    onClick={handleDownloadTemplate}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? "Hazırlanır..." : "Template Yüklə"}
                  </Button>
                </div>

                {/* Export Data */}
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">Məlumatları İxrac Et</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seçilmiş növdəki mövcud məktəbəqədər müəssisələrini Excel
                    formatında ixrac edin.
                  </p>
                  <Button
                    onClick={handleExport}
                    disabled={generating}
                    variant="outline"
                    className="w-full"
                  >
                    {generating ? "İxrac edilir..." : "İxrac Et"}
                  </Button>
                </div>
              </div>

              {/* Template Instructions */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">
                  Template istifadə qaydaları:
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>
                    • Template-də yalnız seçilmiş müəssisə növünə aid sətirlər
                    olacaq
                  </li>
                  <li>
                    • Admin məlumatları (email, username, ad, soyad) daxil edin
                  </li>
                  <li>• Admin parolu boş buraxsanız avtomatik yaradılacaq</li>
                  <li>• Sütun başlıqlarını dəyişdirməyin</li>
                  <li>• Səviyyə avtomatik 5 (məktəbəqədər müəssisə) olacaq</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-6">
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="mb-4">
                  <Label htmlFor="upload-file" className="cursor-pointer">
                    <span className="text-blue-600 hover:underline">
                      Fayl seçin
                    </span>{" "}
                    və ya buraya sürüşdürün
                  </Label>
                  <Input
                    id="upload-file"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Yalnız Excel faylları (.xlsx, .xls) qəbul edilir
                </p>
              </div>

              {uploadFile && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Seçilmiş fayl:</span>
                    <span>{uploadFile.name}</span>
                    <Badge variant="secondary">{selectedTypeInfo?.label}</Badge>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {uploading && (
                <ImportProgress
                  isUploading={uploading}
                  progress={importProgress}
                  status={importStatus}
                  fileName={uploadFile?.name}
                />
              )}

              <Button
                onClick={handleFileUpload}
                disabled={!uploadFile || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? "İdxal edilir..." : "İdxal Et"}
              </Button>

              {!uploadFile && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Xəbərdarlıq</p>
                  <p className="text-red-600 text-sm">
                    İdxal etmək üçün əvvəlcə fayl seçin.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Import Result Modal */}
        <ImportResultModal
          open={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setImportResult(null);
            if (
              importResult &&
              (importResult.success > 0 ||
                (importResult.errors && importResult.errors.length === 0))
            ) {
              onClose(); // Close main modal on successful import
            }
          }}
          result={importResult}
          institutionType={selectedTypeInfo?.label}
          fileName={uploadFile?.name}
        />
      </DialogContent>
    </Dialog>
  );
}
