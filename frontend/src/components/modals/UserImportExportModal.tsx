import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  GraduationCap,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  FileText,
  Save,
  RefreshCw
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

interface UserImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  teachers: number;
  students: number;
  staff: number;
  by_role: Record<string, number>;
  by_institution: Record<string, number>;
}

type ImportStep = 'role' | 'upload' | 'confirm' | 'result';

export const UserImportExportModal: React.FC<UserImportExportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [step, setStep] = useState<ImportStep>('role');
  
  // Import States
  const [selectedRoleType, setSelectedRoleType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Export States
  const [exportFilters, setExportFilters] = useState({
    role: '',
    institution_id: (currentUser?.institution?.id || 'all') as any,
    is_active: 'all',
    format: 'xlsx' as 'xlsx' | 'csv'
  });

  const queryClient = useQueryClient();

  // Translate error attribute names to Azerbaijani
  const translateAttribute = (attr: string): string => {
    const map: Record<string, string> = {
      first_name: 'Ad',
      last_name: 'Soyad',
      email: 'E-poçt',
      utis_code: 'UTİS kodu',
      date_of_birth: 'Doğum tarixi',
      gender: 'Cins',
      phone: 'Telefon',
      position: 'Vəzifə',
      department_name: 'Şöbə adı',
      grade_name: 'Sinif adı',
      enrollment_date: 'Qeydiyyat tarixi',
      address: 'Ünvan',
      password: 'Şifrə',
      username: 'İstifadəçi adı',
      national_id: 'FİN kod',
      role_id: 'Rol',
      institution_id: 'Təşkilat ID',
      notes: 'Qeydlər',
      status: 'Status',
    };
    return map[attr] ?? attr;
  };

  // Roles Metadata
  const { data: availableRoles } = useQuery({
    queryKey: ['available-roles', currentUser?.id],
    queryFn: () => userService.getAvailableRoles(),
    enabled: isOpen && !!currentUser,
  });

  // Export Stats
  const { data: exportStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ExportStats>({
    queryKey: ['user-export-stats', exportFilters],
    queryFn: () => userService.getExportStats(exportFilters),
    enabled: isOpen && activeTab === 'export',
  });

  // Mutations
  const templateMutation = useMutation({
    mutationFn: (roleType: string) => userService.downloadRoleTemplate(roleType),
    onSuccess: (blob) => {
      const filename = `${selectedRoleType}_import_template.xlsx`;
      userService.downloadFileBlob(blob, filename);
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, roleType }: { file: File, roleType: string }) => 
      userService.importUsersByRole(file, roleType),
    onSuccess: (result) => {
      setImportResult(result);
      setStep('result');
      
      const hasErrors = result.errors && result.errors.length > 0;
      const totalProcessed = (result.created || 0) + (result.updated || 0);

      if (totalProcessed === 0 && hasErrors) {
        toast({
          title: "İdxal uğursuz oldu",
          description: "Heç bir qeyd idxal edilmədi. Zəhmət olmasa UTİS kodlarını və fayl formatını yoxlayın.",
          variant: "destructive",
        });
      } else if (hasErrors) {
        toast({
          title: "İdxal qismən tamamlandı",
          description: `${result.created} yaradıldı, ${result.updated || 0} yeniləndi, lakin ${result.errors.length} xəta aşkarlandı.`,
          variant: "default",
          className: "bg-amber-50 border-amber-200 text-amber-900",
        });
      } else {
        toast({
          title: "Uğurlu İdxal",
          description: `${result.created} yeni istifadəçi yaradıldı, ${result.updated || 0} məlumat yeniləndi.`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      refetchStats();
    },
    onError: (error: any) => {
      // If it's a validation error (422), we want to show the results step with errors
      if (error.errors && error.errors.length > 0) {
        setImportResult({
          created: 0,
          updated: 0,
          errors: error.errors,
          message: error.message
        });
        setStep('result');
      }

      toast({
        title: "İdxal xətası",
        description: error.message || "Bilinməyən xəta baş verdi. Zəhmət olmasa internet bağlantısını və fayl formatını yoxlayın.",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      if (exportFilters.role && exportFilters.role !== 'all') {
        return userService.exportUsersByRole(exportFilters.role, exportFilters);
      } else {
        return userService.exportUsers(exportFilters);
      }
    },
    onSuccess: (blob) => {
      const roleName = exportFilters.role && exportFilters.role !== 'all' ? exportFilters.role : 'users';
      const filename = `${roleName}_export_${new Date().toISOString().slice(0, 10)}.${exportFilters.format}`;
      userService.downloadFileBlob(blob, filename);
       toast({ title: "Uğur", description: "Çıxarış (Export) hazırlandı" });
    },
  });

  // Helper Functions
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = userService.validateFile(file);
      if (!validation.valid) {
        toast({ title: "Fayl Xətası", description: validation.error, variant: "destructive" });
        return;
      }

      setSelectedFile(file);
      
      // Parse first 5 rows for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Filter empty rows and get headers + first 5 data rows
        const cleanRows = json.filter((row: any) => row.length > 0).slice(0, 6);
        setPreviewData(cleanRows);
      };
      reader.readAsArrayBuffer(file);
      setStep('upload');
    }
  };

  const handleImportStart = () => {
    if (selectedFile && selectedRoleType) {
      importMutation.mutate({ file: selectedFile, roleType: selectedRoleType });
    }
  };

  const resetImport = () => {
    setStep('role');
    setSelectedFile(null);
    setPreviewData([]);
    setImportResult(null);
  };

  const importCategories = [
    {
      id: 'staff',
      name: 'Rəhbərlik',
      description: 'Məktəb müdiri, məktəbəqədər müdir, region operatoru, sektor admini və region admini.',
      icon: Users,
      roles: ['Məktəb müdiri', 'Məktəbəqədər müdir', 'Region operatoru', 'Sektor admini'],
      color: 'blue',
    },
    {
      id: 'teachers',
      name: 'Pedaqoji Heyət',
      description: 'Müəllimlər, müavinlər, psixoloqlar, təşkilatçılar və təsərrüfat müdirləri.',
      icon: GraduationCap,
      roles: ['Müəllim', 'Müavin', 'Psixoloq', 'Təşkilatçı', 'Təsərrüfat'],
      color: 'green',
    },
    {
      id: 'students',
      name: 'Şagirdlər',
      description: 'Məktəb şagirdlərinin kütləvi idxalı. UTİS kodu və sinif məlumatları daxil edilir.',
      icon: UserCheck,
      roles: ['Şagird'],
      color: 'purple',
    },
  ];

  const currentRoleLabel = useMemo(() => {
    return importCategories.find(c => c.id === selectedRoleType)?.name ?? selectedRoleType ?? 'İstifadəçi';
  }, [selectedRoleType]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <RefreshCw className={`h-6 w-6 ${activeTab === 'import' ? 'text-primary' : 'text-blue-600'}`} />
            Sistem İdxal və İxrac (Import/Export)
          </DialogTitle>
          <DialogDescription>
            İstifadəçiləri toplu şəkildə idarə edin. Yeni istifadəçilər yaradın və ya mövcud olanları yeniləyin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> İdxal (Import)
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" /> İxrac (Export)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import" className="mt-0">
              {/* Wizard Progress */}
              <div className="flex justify-between items-center mb-8 px-10 relative">
                <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-muted -translate-y-1/2 z-0" />
                {['role', 'upload', 'confirm', 'result'].map((s, i) => (
                  <div key={s} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                      step === s ? 'bg-primary border-primary text-white shadow-md' : 
                      ['role', 'upload', 'confirm', 'result'].indexOf(step) > i ? 'bg-green-500 border-green-500 text-white' : 
                      'bg-background border-muted text-muted-foreground'
                    }`}>
                      {['role', 'upload', 'confirm', 'result'].indexOf(step) > i ? <CheckCircle className="h-5 w-5" /> : i + 1}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                      {s === 'role' ? 'Rol' : s === 'upload' ? 'Fayl' : s === 'confirm' ? 'Təsdiq' : 'Nəticə'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step 1: Category Selection */}
              {step === 'role' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {importCategories.map((category) => {
                      const Icon = category.icon;
                      const isSelected = selectedRoleType === category.id;
                      return (
                        <Card
                          key={category.id}
                          className={`cursor-pointer transition-all hover:shadow-md border-2 relative ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                          onClick={() => setSelectedRoleType(category.id)}
                        >
                          {isSelected && <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-primary" />}
                          <CardHeader className="p-4 flex flex-col items-center text-center gap-3 space-y-0">
                            <div className={`p-3 rounded-full ${isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                              <Icon className="h-7 w-7" />
                            </div>
                            <div className="w-full">
                              <CardTitle className="text-base">{category.name}</CardTitle>
                              <CardDescription className="text-xs mt-1 leading-relaxed">
                                {category.description}
                              </CardDescription>
                              <div className="flex flex-wrap gap-1 mt-3 justify-center">
                                {category.roles.map((role) => (
                                  <span
                                    key={role}
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>

                  <Alert variant="default" className="bg-blue-50 border-blue-200 mt-6 animate-in fade-in zoom-in duration-300">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 text-sm font-bold uppercase tracking-tight">Tələb: UTİS Kod</AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                      Bütün idxal əməliyyatlarında <strong>UTİS kodu</strong> mütləqdir. Excel şablonunu yükləyib nümunəyə uyğun doldurun.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col items-center gap-4 mt-4 pt-6 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      {selectedRoleType
                        ? `"${importCategories.find(c => c.id === selectedRoleType)?.name}" kateqoriyası seçildi. Şablon yükləyin və ya faylı seçin.`
                        : 'Davam etmək üçün yuxarıdan müvafiq kateqoriyanı seçin.'}
                    </p>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        disabled={!selectedRoleType || templateMutation.isPending}
                        onClick={() => templateMutation.mutate(selectedRoleType)}
                      >
                        {templateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Şablon (Template) Yüklə
                      </Button>
                      <Button
                        className="w-40"
                        disabled={!selectedRoleType}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.xlsx,.xls,.csv';
                          input.onchange = (e) => handleFileSelect(e as any);
                          input.click();
                        }}
                      >
                        Faylı Seç <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Upload & Preview */}
              {step === 'upload' && selectedFile && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-700 rounded">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{selectedFile.name}</h4>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB • {currentRoleLabel} idxalı</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep('role')}>Faylı Dəyiş</Button>
                  </div>

                  <Card>
                    <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Önbaxış (İlk 5 sətir)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData[0]?.map((header: any, i: number) => (
                                <TableHead key={i} className="whitespace-nowrap text-xs bg-muted/20">{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.slice(1).map((row: any, i: number) => (
                              <TableRow key={i}>
                                {row.map((cell: any, j: number) => (
                                  <TableCell key={j} className="text-xs whitespace-nowrap">{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 text-sm font-semibold">Duplikat yoxlaması</AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                      Sistem əvvəlcə <strong>UTİS kodu</strong>, sonra <strong>e-poçt</strong> üzrə yoxlama aparır. Əgər istifadəçi tapılarsa, məlumatları <strong>yenilənəcək</strong>; tapılmasa, <strong>yeni qeyd yaradılacaq</strong>.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep('role')}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Geri
                    </Button>
                    <Button className="w-48" onClick={() => setStep('confirm')}>
                      İlxal Hazırlığı <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 'confirm' && (
                <div className="space-y-8 py-10 flex flex-col items-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Upload className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">İdxala Başlanılsın?</h3>
                    <p className="text-muted-foreground">Seçilmiş fayldakı bütün {currentRoleLabel} məlumatları sistemə ötürüləcək.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                    <div className="p-4 bg-muted rounded-lg text-center border-2 border-dashed">
                      <div className="text-2xl font-bold text-primary">{selectedFile?.name.split('.').pop()?.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Format</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center border-2 border-dashed">
                      <div className="text-2xl font-bold text-primary">{currentRoleLabel}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Hədəf Rol</div>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full max-w-md">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>İmtina</Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleImportStart}
                      disabled={importMutation.isPending}
                    >
                      {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Təsdiqlə və Başla
                    </Button>
                  </div>

                  {importMutation.isPending && (
                    <div className="w-full max-w-md space-y-2">
                      <Progress value={45} className="h-2" />
                      <p className="text-center text-xs text-muted-foreground">Məlumatlar serverə ötürülür və validasiya edilir...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Results */}
              {step === 'result' && importResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  {(() => {
                    const created   = importResult.created  || 0;
                    const updated   = importResult.updated  || 0;
                    const errCount  = importResult.errors?.length || 0;
                    const processed = created + updated;
                    const isFail    = processed === 0 && errCount > 0;
                    const isPartial = processed > 0  && errCount > 0;
                    // isSuccess: processed > 0 && errCount === 0

                    const icon = isFail
                      ? <XCircle className="h-10 w-10" />
                      : isPartial
                        ? <AlertTriangle className="h-10 w-10" />
                        : <CheckCircle className="h-10 w-10" />;

                    const iconBg = isFail
                      ? 'bg-red-100 text-red-600'
                      : isPartial
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-green-100 text-green-600';

                    const title = isFail
                      ? 'İdxal Uğursuz Oldu'
                      : isPartial
                        ? 'İdxal Qismən Tamamlandı'
                        : 'İdxal Uğurla Tamamlandı';

                    const subtitle = isFail
                      ? `${errCount} sətirdə xəta aşkarlandı, heç bir qeyd idxal edilmədi. UTİS kodlarını, sütun başlıqlarını və fayl formatını yoxlayın.`
                      : isPartial
                        ? `${created} yeni qeyd yaradıldı, ${updated} mövcud qeyd yeniləndi. ${errCount} sətir xəta ilə keçildi — aşağıdakı hesabata baxın.`
                        : `${created} yeni qeyd yaradıldı${updated > 0 ? `, ${updated} mövcud qeyd yeniləndi` : ''}. Bütün sətirləri uğurla işlədi.`;

                    return (
                      <div className="text-center space-y-2">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${iconBg} mb-2`}>
                          {icon}
                        </div>
                        <h3 className="text-2xl font-bold">{title}</h3>
                        <p className={`text-sm max-w-md mx-auto leading-relaxed ${isFail ? 'text-red-600' : isPartial ? 'text-amber-700' : 'text-muted-foreground'}`}>
                          {subtitle}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-black text-green-700">{importResult.created || 0}</div>
                        <div className="text-sm font-medium text-green-600 uppercase">Yaradıldı</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-black text-blue-700">{importResult.updated || 0}</div>
                        <div className="text-sm font-medium text-blue-600 uppercase">Yeniləndi</div>
                      </CardContent>
                    </Card>
                    <Card className={(importResult.errors?.length || 0) > 0 ? "bg-red-50 border-red-200" : "bg-muted"}>
                      <CardContent className="p-6 text-center">
                        <div className={`text-3xl font-black ${(importResult.errors?.length || 0) > 0 ? "text-red-700" : "text-muted-foreground"}`}>
                          {importResult.errors?.length || 0}
                        </div>
                        <div className={`text-sm font-medium uppercase ${(importResult.errors?.length || 0) > 0 ? "text-red-600" : "text-muted-foreground"}`}>Xəta</div>
                      </CardContent>
                    </Card>
                  </div>

                  {(importResult.errors?.length || 0) > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" /> Xətalı Sətirlər Hesabatı
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-muted sticky top-0">
                              <TableRow>
                                <TableHead className="w-[80px]">Sətir</TableHead>
                                <TableHead className="w-[150px]">Vəziyyət</TableHead>
                                <TableHead>Xəta / Mesaj</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importResult.errors.map((err: any, idx: number) => {
                                const isStringError = typeof err === 'string';
                                const rowNumber = isStringError
                                  ? (err.match(/Sətir (\d+)/)?.[1] ?? String(idx + 2))
                                  : String(err.row ?? idx + 2);
                                const rawField = isStringError ? '' : (err.attribute ?? '');
                                const field = rawField ? translateAttribute(rawField) : 'Xəta';
                                const message = isStringError
                                  ? err
                                  : (Array.isArray(err.errors) ? err.errors.join(', ') : String(err.errors ?? ''));

                                return (
                                  <TableRow key={idx} className="hover:bg-red-50/50">
                                    <TableCell className="font-medium">#{rowNumber}</TableCell>
                                    <TableCell className="text-red-600 text-xs font-semibold">{field}</TableCell>
                                    <TableCell className="text-xs leading-relaxed">{message}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-4 pt-6">
                    <Button variant="outline" onClick={resetImport}>Yeni İdxal</Button>
                    <Button onClick={onClose}>Bağla</Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="export" className="mt-0 space-y-6">
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    İstifadəçi İxracı (Export)
                  </CardTitle>
                  <CardDescription>
                    Mövcud istifadəçi məlumatlarını Excel formatında ixrac edin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stats Summary */}
                  {exportStats && (
                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted/40 rounded-xl border border-muted">
                      <div className="text-center">
                        <div className="text-xl font-bold">{exportStats.total_users}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Cəmi</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{exportStats.active_users}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Aktiv</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-500">{exportStats.inactive_users}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Passiv</div>
                      </div>
                      <div className="text-center">
                         <div className="text-xl font-bold text-primary">{exportStats.teachers}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Müəllim</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Hədəf Rol</Label>
                        <Select 
                          value={exportFilters.role} 
                          onValueChange={(v) => setExportFilters(prev => ({ ...prev, role: v === 'all' ? '' : v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Bütün rollar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Bütün rollar</SelectItem>
                            {availableRoles?.map(r => (
                              <SelectItem key={r.id} value={r.name}>{r.display_name || r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select 
                          value={exportFilters.is_active} 
                          onValueChange={(v) => setExportFilters(prev => ({ ...prev, is_active: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Hamısı</SelectItem>
                            <SelectItem value="true">Yalnız Aktiv</SelectItem>
                            <SelectItem value="false">Yalnız Qeyri-aktiv</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
                      <h5 className="text-sm font-bold flex items-center gap-2 mb-2">
                         <BarChart3 className="h-4 w-4" /> Rol bölgüsü:
                      </h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {exportStats?.by_role && Object.entries(exportStats.by_role).map(([role, count]) => (
                          <div key={role} className="flex justify-between text-xs items-center">
                            <span className="capitalize">{role}:</span>
                            <Badge variant="outline" className="font-mono">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <div className="flex-1">
                      <Label>Format</Label>
                      <Select 
                        value={exportFilters.format} 
                        onValueChange={(v) => setExportFilters(prev => ({ ...prev, format: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                          <SelectItem value="csv">CSV (.csv)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="flex-[2] mt-auto h-10" 
                      onClick={() => exportMutation.mutate()}
                      disabled={exportMutation.isPending || statsLoading}
                    >
                      {exportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      İxracı Başlat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserImportExportModal;