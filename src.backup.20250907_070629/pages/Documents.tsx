import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, FileText, Download, Eye, Upload, Share, X, Calendar, User, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { documentService, Document } from "@/services/documents";
import { useState } from "react";
import { DocumentUploadModal } from "@/components/modals/DocumentUploadModal";
import { DocumentViewModal } from "@/components/modals/DocumentViewModal";
import { DocumentShareModal } from "@/components/modals/DocumentShareModal";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>("all");
  const [uploaderFilter, setUploaderFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', searchTerm, categoryFilter, typeFilter, accessLevelFilter, uploaderFilter, dateFilter],
    queryFn: () => documentService.getAll({
      search: searchTerm || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      mime_type: typeFilter === 'all' ? undefined : typeFilter,
      access_level: accessLevelFilter === 'all' ? undefined : accessLevelFilter as any,
      uploaded_by: uploaderFilter === 'all' ? undefined : parseInt(uploaderFilter),
      ...(dateFilter !== 'all' && {
        created_at: dateFilter === 'today' ? new Date().toISOString().split('T')[0] :
                   dateFilter === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                   dateFilter === 'month' ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
      }),
      per_page: 20
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: () => documentService.getStats(),
  });

  const handleDownload = async (document: Document) => {
    try {
      const blob = await documentService.downloadDocument(document.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_filename || document.original_name || document.title;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleView = (document: Document) => {
    setSelectedDocument(document);
    setIsViewModalOpen(true);
  };

  const handleShare = (document: Document) => {
    setSelectedDocument(document);
    setIsShareModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sənədlər</h1>
            <p className="text-muted-foreground">Sistem sənədlərinin idarə edilməsi və saxlanması</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Sənəd
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="h-40 bg-surface rounded-lg border border-border-light animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sənədlər</h1>
          <p className="text-muted-foreground">Regional icazələr əsasında sənədlərin idarə edilməsi və saxlanması</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <Upload className="h-4 w-4" />
          Sənəd Yüklə
        </Button>
      </div>

      <div className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Sənəd axtarın..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter className="h-4 w-4" />
            Filter
            {(categoryFilter !== 'all' || typeFilter !== 'all' || accessLevelFilter !== 'all' || uploaderFilter !== 'all' || dateFilter !== 'all') && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {[categoryFilter, typeFilter, accessLevelFilter, uploaderFilter, dateFilter].filter(f => f !== 'all').length}
              </span>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {isFilterOpen && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kateqoriya</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="administrative">İdarəetmə sənədləri</SelectItem>
                    <SelectItem value="financial">Maliyyə sənədləri</SelectItem>
                    <SelectItem value="educational">Təhsil materialları</SelectItem>
                    <SelectItem value="hr">İnsan resursları</SelectItem>
                    <SelectItem value="technical">Texniki sənədlər</SelectItem>
                    <SelectItem value="legal">Hüquqi sənədlər</SelectItem>
                    <SelectItem value="reports">Hesabatlar</SelectItem>
                    <SelectItem value="forms">Formalar</SelectItem>
                    <SelectItem value="other">Digər</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fayl Tipi</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="image">Şəkil</SelectItem>
                    <SelectItem value="other">Digər</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Access Level Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Giriş Səviyyəsi</Label>
                <Select value={accessLevelFilter} onValueChange={setAccessLevelFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hamısı</SelectItem>
                    <SelectItem value="public">Hamı görə bilər</SelectItem>
                    <SelectItem value="regional">Region daxilində</SelectItem>
                    <SelectItem value="sectoral">Sektor daxilində</SelectItem>
                    <SelectItem value="institution">Müəssisə daxilində</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Yükləmə Tarixi</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Hər zaman</SelectItem>
                    <SelectItem value="today">Bu gün</SelectItem>
                    <SelectItem value="week">Son həftə</SelectItem>
                    <SelectItem value="month">Son ay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Əməliyyatlar</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                    setAccessLevelFilter('all');
                    setUploaderFilter('all');
                    setDateFilter('all');
                    setSearchTerm('');
                  }}
                  className="w-full h-9 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Təmizlə
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ümumi sənədlər</div>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">İctimai sənədlər</div>
            <div className="text-2xl font-bold">{stats?.public_documents || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Bu ay yüklənmiş</div>
            <div className="text-2xl font-bold">{stats?.recent_uploads || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Ümumi ölçü</div>
            <div className="text-2xl font-bold">
              {stats?.total_size ? documentService.formatFileSize(stats.total_size) : '0 MB'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents?.data?.data?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Hələlik sənəd yoxdur</p>
            <Button 
              className="mt-4" 
              variant="outline"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              İlk sənədi yüklə
            </Button>
          </div>
        ) : (
          <>
            {documents?.data?.data?.map((document: Document) => (
              <Card key={document.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{documentService.getFileIcon(document.mime_type)}</span>
                    <CardTitle className="text-base">{document.title}</CardTitle>
                  </div>
                  <CardDescription>
                    {document.mime_type.split('/')[1].toUpperCase()} • 
                    {documentService.formatFileSize(document.file_size)} • 
                    {formatDate(document.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.description && (
                      <p className="text-sm text-muted-foreground">
                        {document.description.length > 100 
                          ? `${document.description.substring(0, 100)}...` 
                          : document.description}
                      </p>
                    )}
                    
                    {/* Access Level Badge */}
                    {document.access_level && (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          document.access_level === 'public' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          document.access_level === 'regional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          document.access_level === 'sectoral' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        }`}>
                          {documentService.getAccessLevelLabel(document.access_level)}
                        </span>
                        {document.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {documentService.getCategoryLabel(document.category)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {document.uploader && (
                        <span>Yükləyən: {document.uploader.first_name ? `${document.uploader.first_name} ${document.uploader.last_name}` : document.uploader.name}</span>
                      )}
                      {document.institution && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {document.institution.name}
                          </span>
                        </>
                      )}
                      {document.download_count > 0 && <span>• {document.download_count} yükləmə</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleView(document)}
                      >
                        <Eye className="h-3 w-3" />
                        Bax
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-3 w-3" />
                        Yüklə
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleShare(document)}
                      >
                        <Share className="h-3 w-3" />
                        Paylaş
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card 
              className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-32">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Yeni sənəd yüklə</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {documents?.data && documents.data.data && documents.data.data.length > 0 && (
        <div className="text-center">
          <div className="text-sm text-muted-foreground">
            {documents.data.data.length} / {documents.data.total} sənəd göstərilir
          </div>
        </div>
      )}

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          // Additional success handling if needed
        }}
      />

      <DocumentViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onDownload={handleDownload}
        onShare={handleShare}
      />

      <DocumentShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onShareComplete={() => {
          // Refresh documents list after sharing
        }}
      />
    </div>
  );
}