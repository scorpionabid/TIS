import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, BookOpen, Eye, Filter, Search, Download, Upload, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subjectService, CreateSubjectData, UpdateSubjectData } from '@/services/subjects';
import { useToast } from '@/hooks/use-toast';
import { Subject } from '@/services/subjects';
import { SubjectModal } from '@/components/modals/SubjectModal';

const CATEGORY_LABELS = {
  core: 'Əsas fənlər',
  science: 'Elm fənləri',
  humanities: 'Humanitar fənlər',
  language: 'Dil fənləri',
  arts: 'İncəsənət',
  physical: 'Fiziki tərbiyə',
  technical: 'Texniki fənlər',
  elective: 'Seçmə fənlər'
};

export default function SubjectManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedSubjects, setSelectedSubjects] = useState<Set<number>>(new Set());
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load subjects
  const { data: subjectsResponse, isLoading, error } = useQuery({
    queryKey: ['subjects-management', { category: categoryFilter, search: searchQuery, grade: gradeFilter }],
    queryFn: async () => {
      console.log('🔍 SubjectManagement: Fetching subjects...');
      try {
        const params: any = {};
        if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;
        if (gradeFilter && gradeFilter !== 'all') params.grade = parseInt(gradeFilter);
        
        const result = await subjectService.getSubjects(params);
        console.log('✅ SubjectManagement: Fetch successful:', result);
        return result;
      } catch (error) {
        console.error('❌ SubjectManagement: Fetch failed:', error);
        throw error;
      }
    },
  });

  // Load statistics
  const { data: statsResponse } = useQuery({
    queryKey: ['subject-statistics'],
    queryFn: () => subjectService.getSubjectStatistics(),
  });

  const subjects = subjectsResponse?.data || [];
  const stats = statsResponse?.data || {};

  // Filter subjects based on search query and other filters
  const filteredSubjects = subjects.filter((subject: Subject) => {
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.code && subject.code.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesActiveFilter = !showOnlyActive || subject.is_active;
    
    return matchesSearch && matchesActiveFilter;
  });

  const handleCreateSubject = () => {
    setSelectedSubject(null);
    setIsCreateModalOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsCreateModalOpen(true);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`"${subject.name}" fənnini silmək istədiyinizdən əminsiniz?`)) return;

    try {
      await subjectService.deleteSubject(subject.id);
      queryClient.invalidateQueries({ queryKey: ['subjects-management'] });
      queryClient.invalidateQueries({ queryKey: ['subject-statistics'] });
      toast({
        title: "Uğurla silindi",
        description: `"${subject.name}" fənni silindi.`,
      });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Fənni silərkən xəta baş verdi.",
        variant: "destructive"
      });
    }
  };

  const handleSaveSubject = async (data: CreateSubjectData | UpdateSubjectData) => {
    try {
      if (selectedSubject) {
        // Update existing subject
        await subjectService.update(selectedSubject.id, data as UpdateSubjectData);
        toast({
          title: "Uğurla yeniləndi",
          description: "Fənn məlumatları yeniləndi.",
        });
      } else {
        // Create new subject
        await subjectService.create(data as CreateSubjectData);
        toast({
          title: "Uğurla əlavə edildi",
          description: "Yeni fənn əlavə edildi.",
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['subjects-management'] });
      queryClient.invalidateQueries({ queryKey: ['subject-statistics'] });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: selectedSubject ? "Fənni yeniləyərkən xəta baş verdi." : "Fənn əlavə edərkən xəta baş verdi.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      core: 'default',
      science: 'secondary',
      humanities: 'outline',
      language: 'secondary',
      arts: 'outline',
      physical: 'secondary',
      technical: 'default',
      elective: 'outline'
    };
    return variants[category] || 'default';
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedSubjects.size === filteredSubjects.length) {
      setSelectedSubjects(new Set());
    } else {
      setSelectedSubjects(new Set(filteredSubjects.map(s => s.id)));
    }
  };

  const handleSelectSubject = (subjectId: number) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }
    setSelectedSubjects(newSelected);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedSubjects.size === 0) return;
    
    if (!confirm(`Seçilmiş ${selectedSubjects.size} fənni silmək istədiyinizdən əminsiniz?`)) return;

    try {
      await subjectService.bulkDelete(Array.from(selectedSubjects));
      queryClient.invalidateQueries({ queryKey: ['subjects-management'] });
      queryClient.invalidateQueries({ queryKey: ['subject-statistics'] });
      setSelectedSubjects(new Set());
      toast({
        title: "Uğurla silindi",
        description: `${selectedSubjects.size} fənn silindi.`,
      });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Fənləri silərkən xəta baş verdi.",
        variant: "destructive"
      });
    }
  };

  const handleBulkActivate = async () => {
    if (selectedSubjects.size === 0) return;
    
    try {
      const selectedSubjectsList = filteredSubjects.filter(s => selectedSubjects.has(s.id));
      const updatePromises = selectedSubjectsList.map(subject => 
        subjectService.update(subject.id, { ...subject, is_active: true })
      );
      
      await Promise.all(updatePromises);
      queryClient.invalidateQueries({ queryKey: ['subjects-management'] });
      queryClient.invalidateQueries({ queryKey: ['subject-statistics'] });
      setSelectedSubjects(new Set());
      toast({
        title: "Uğurla yeniləndi",
        description: `${selectedSubjects.size} fənn aktivləşdirildi.`,
      });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Fənləri aktivləşdirərkən xəta baş verdi.",
        variant: "destructive"
      });
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedSubjects.size === 0) return;
    
    try {
      const selectedSubjectsList = filteredSubjects.filter(s => selectedSubjects.has(s.id));
      const updatePromises = selectedSubjectsList.map(subject => 
        subjectService.update(subject.id, { ...subject, is_active: false })
      );
      
      await Promise.all(updatePromises);
      queryClient.invalidateQueries({ queryKey: ['subjects-management'] });
      queryClient.invalidateQueries({ queryKey: ['subject-statistics'] });
      setSelectedSubjects(new Set());
      toast({
        title: "Uğurla yeniləndi",
        description: `${selectedSubjects.size} fənn deaktivləşdirildi.`,
      });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Fənləri deaktivləşdirərkən xəta baş verdi.",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    try {
      toast({
        title: "Export hazırlanır",
        description: "Fənlər CSV formatında export edilir...",
      });

      // CSV məlumatları yaradırıq
      const csvContent = [
        // Header
        ['Ad', 'Kod', 'Təsvir', 'Kateqoriya', 'Sinif Səviyyələri', 'Həftəlik Saat', 'Status'].join(','),
        // Data
        ...filteredSubjects.map(subject => [
          `"${subject.name}"`,
          `"${subject.code || ''}"`,
          `"${subject.description || ''}"`,
          `"${CATEGORY_LABELS[subject.category as keyof typeof CATEGORY_LABELS] || subject.category}"`,
          `"${subject.grade_levels ? subject.grade_levels.join(';') : ''}"`,
          subject.weekly_hours || 0,
          subject.is_active ? 'Aktiv' : 'Qeyri-aktiv'
        ].join(','))
      ].join('\n');

      // Fayl download etdiririk
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `fennler_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export tamamlandı",
        description: "Fənlər uğurla export edildi.",
      });
    } catch (error) {
      toast({
        title: "Xəta baş verdi",
        description: "Export əməliyyatında xəta baş verdi.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Fənlər yüklənir...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Fənlər yüklənərkən xəta baş verdi</p>
              <Button onClick={() => window.location.reload()}>
                Yenidən yüklə
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Fənn İdarəçiliyi
          </h1>
          <p className="text-muted-foreground mt-2">
            Təhsil sistemində istifadə olunan fənləri idarə edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCreateSubject} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Fənn
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedSubjects.size > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedSubjects.size} fənn seçildi</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkActivate}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Aktivləşdir
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
                  <Square className="h-4 w-4 mr-2" />
                  Deaktivləşdir
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Fənlər</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_subjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiv Fənlər</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_subjects || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kateqoriyalar</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.subjects_by_category ? Object.keys(stats.subjects_by_category).length : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtrlənmiş</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubjects.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrlər</CardTitle>
          <CardDescription>
            Fənləri kateqoriya, sinif və adına görə filtrləyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Fənn adı və ya kodu axtar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Kateqoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sinif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                {[...Array(11)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}. sinif
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="active-only" 
                checked={showOnlyActive}
                onCheckedChange={setShowOnlyActive}
              />
              <label htmlFor="active-only" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Yalnız aktiv fənlər
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fənlər Siyahısı</CardTitle>
          <CardDescription>
            {filteredSubjects.length} fənn tapıldı
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Heç bir fənn tapılmadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedSubjects.size === filteredSubjects.length && filteredSubjects.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Hamısını seç"
                      />
                    </TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Kateqoriya</TableHead>
                    <TableHead>Sinif Səviyyələri</TableHead>
                    <TableHead>Həftəlik Saat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((subject: Subject) => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSubjects.has(subject.id)}
                          onCheckedChange={() => handleSelectSubject(subject.id)}
                          aria-label={`${subject.name} seç`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code}</TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(subject.category)}>
                          {CATEGORY_LABELS[subject.category as keyof typeof CATEGORY_LABELS] || subject.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subject.grade_levels && subject.grade_levels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subject.grade_levels.sort().map((grade: number) => (
                              <Badge key={grade} variant="outline" className="text-xs">
                                {grade}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{subject.weekly_hours} saat</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={subject.is_active ? "default" : "secondary"}>
                          {subject.is_active ? "Aktiv" : "Qeyri-aktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSubject(subject)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Modal */}
      <SubjectModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        subject={selectedSubject}
        onSave={handleSaveSubject}
      />
    </div>
  );
}