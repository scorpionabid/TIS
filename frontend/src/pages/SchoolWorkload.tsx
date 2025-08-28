import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GraduationCapIcon, Plus, Edit, Eye, BookOpen, Clock, Users, Calculator, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workloadService, TeachingLoad } from "@/services/workload";
import { subjectService } from "@/services/subjects";
import { useToast } from "@/hooks/use-toast";

export default function SchoolWorkload() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<number | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Form state
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    class_id: '',
    weekly_hours: '',
    academic_year_id: '1' // Default to current academic year
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form handlers
  const resetForm = () => {
    setFormData({
      teacher_id: '',
      subject_id: '',
      class_id: '',
      weekly_hours: '',
      academic_year_id: '1'
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.teacher_id || !formData.subject_id || !formData.class_id || !formData.weekly_hours) {
      toast({
        title: "Xəta",
        description: "Bütün sahələri doldurun",
        variant: "destructive"
      });
      return;
    }

    const weeklyHours = parseInt(formData.weekly_hours);
    if (weeklyHours < 1 || weeklyHours > 40) {
      toast({
        title: "Xəta", 
        description: "Həftəlik saat 1 ilə 40 arasında olmalıdır",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        teacher_id: parseInt(formData.teacher_id),
        subject_id: parseInt(formData.subject_id), 
        class_id: parseInt(formData.class_id),
        weekly_hours: weeklyHours,
        academic_year_id: parseInt(formData.academic_year_id)
      };

      await workloadService.createTeachingLoad(payload);
      
      toast({
        title: "Uğurla yaradıldı",
        description: "Yeni dərs yükü əlavə edildi"
      });
      
      setIsCreateModalOpen(false);
      resetForm();
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      queryClient.invalidateQueries({ queryKey: ['workload-statistics'] });
    } catch (error: any) {
      toast({
        title: "Xəta baş verdi",
        description: error?.message || "Dərs yükü yaradılarkən xəta",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Button handlers
  const handleCreateNew = () => {
    resetForm();
    setIsCreateModalOpen(true);
    toast({
      title: "Yeni Dərs Yükü",
      description: "Yeni dərs yükü əlavə etmə modalı açılır"
    });
  };

  const handleView = (teacherName: string) => {
    setIsViewModalOpen(true);
    toast({
      title: "Müəllim məlumatları",
      description: `${teacherName} müəlliminin dərs yükü detalları göstərilir`
    });
  };

  const handleEdit = (workloadId?: number, teacherName?: string) => {
    if (workloadId) {
      setSelectedWorkloadId(workloadId);
      // Pre-populate form with existing data for editing
      setIsCreateModalOpen(true);
      toast({
        title: "Redaktə et",
        description: `ID ${workloadId} dərs yükü redaktə edilir`
      });
    } else if (teacherName) {
      setIsCreateModalOpen(true);
      toast({
        title: "Redaktə et", 
        description: `${teacherName} müəlliminin dərs yükü redaktə edilir`
      });
    }
  };

  // Load teaching loads
  const { data: teachingLoadsResponse, isLoading: loadsLoading, error } = useQuery({
    queryKey: ['teaching-loads'],
    queryFn: () => workloadService.getTeachingLoads(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Load workload statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['workload-statistics'],
    queryFn: () => workloadService.getWorkloadStatistics(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Load dropdown data for form (simple mock data for now)
  const teachersData = [
    { id: 3, name: 'teacher1' }
  ];
  
  // Load subjects dynamically
  const { data: subjectsResponse } = useQuery({
    queryKey: ['workload-subjects'],
    queryFn: () => subjectService.getSubjects(),
  });

  const subjectsData = subjectsResponse?.data || [];
  
  const classesData = [
    { id: 1, name: '9-A sinifi' },
    { id: 2, name: '9-B sinifi' },
    { id: 3, name: '10-A sinifi' },
    { id: 4, name: '10-B sinifi' },
    { id: 5, name: '11-A sinifi' }
  ];
  
  const academicYearsData = [
    { id: 1, name: '2024-2025' },
    { id: 2, name: '2025-2026' }
  ];

  const teachingLoads = Array.isArray(teachingLoadsResponse?.data) ? teachingLoadsResponse.data : [];
  const stats = statsResponse?.data || {
    total_teachers: 0,
    overloaded_teachers: 0,
    total_hours_assigned: 0,
    average_load_per_teacher: 0
  };

  // Filter and process data
  const filteredLoads = useMemo(() => {
    return teachingLoads.filter((load: TeachingLoad) => {
      const matchesClass = selectedClass === 'all' || load.class_name?.includes(selectedClass);
      const matchesSubject = selectedSubject === 'all' || load.subject_name?.toLowerCase().includes(selectedSubject.toLowerCase());
      const matchesTeacher = selectedTeacher === 'all' || load.teacher_name?.toLowerCase().includes(selectedTeacher.toLowerCase());
      const matchesSearch = !searchQuery || 
        load.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.class_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesClass && matchesSubject && matchesTeacher && matchesSearch;
    });
  }, [teachingLoads, selectedClass, selectedSubject, selectedTeacher, searchQuery]);

  // Get unique values for filters
  const uniqueClasses = useMemo(() => {
    const classes = [...new Set(teachingLoads.map((load: TeachingLoad) => load.class_name))];
    return classes.filter(Boolean).sort();
  }, [teachingLoads]);

  const uniqueSubjects = useMemo(() => {
    const subjects = [...new Set(teachingLoads.map((load: TeachingLoad) => load.subject_name))];
    return subjects.filter(Boolean).sort();
  }, [teachingLoads]);

  const uniqueTeachers = useMemo(() => {
    const teachers = [...new Set(teachingLoads.map((load: TeachingLoad) => load.teacher_name))];
    return teachers.filter(Boolean).sort();
  }, [teachingLoads]);

  // Group by teacher for display
  const teacherWorkloads = useMemo(() => {
    const grouped = filteredLoads.reduce((acc: any, load: TeachingLoad) => {
      if (!load.teacher_name) return acc;
      
      if (!acc[load.teacher_name]) {
        acc[load.teacher_name] = {
          teacher: load.teacher_name,
          loads: [],
          totalHours: 0,
          subjects: new Set(),
          classes: new Set()
        };
      }
      
      acc[load.teacher_name].loads.push(load);
      acc[load.teacher_name].totalHours += load.weekly_hours;
      acc[load.teacher_name].subjects.add(load.subject_name);
      acc[load.teacher_name].classes.add(load.class_name);
      
      return acc;
    }, {});

    return Object.values(grouped).map((item: any) => ({
      ...item,
      subjects: Array.from(item.subjects),
      classes: Array.from(item.classes)
    }));
  }, [filteredLoads]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">Dərs yükü məlumatları yüklənərkən problem yarandı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dərs Yükü İdarəetməsi</h1>
          <p className="text-muted-foreground">Müəllimlərin dərs yükü və fənn təqsimati</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreateNew}>
          <Plus className="h-4 w-4" />
          Yeni Dərs Yükü
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv müəllimlər</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_teachers || uniqueTeachers.length
                  )}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi dərs saatı</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.total_hours_assigned || teachingLoads.reduce((sum: number, load: TeachingLoad) => sum + load.weekly_hours, 0)
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fənnlər</p>
                <p className="text-2xl font-bold">{uniqueSubjects.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orta yük</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (stats.average_load_per_teacher || 0).toFixed(1)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">saat/həftə</p>
              </div>
              <Calculator className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrləmə</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Sinif seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                {uniqueClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Fənn seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün fənnlər</SelectItem>
                {uniqueSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Müəllim seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün müəllimlər</SelectItem>
                {uniqueTeachers.map((teacher) => (
                  <SelectItem key={teacher} value={teacher}>
                    {teacher}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input 
              placeholder="Axtarış..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teacher Workload List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCapIcon className="h-5 w-5" />
            Müəllim Dərs Yükləri
          </CardTitle>
          <CardDescription>
            {filteredLoads.length} dərs yükü tapıldı
            {teacherWorkloads.length > 0 && ` (${teacherWorkloads.length} müəllim)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Dərs yükləri yüklənir...</span>
            </div>
          ) : teacherWorkloads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Seçilmiş kriteriiyalara uyğun dərs yükü tapılmadı
            </div>
          ) : (
            <div className="space-y-4">
              {teacherWorkloads.map((workload: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">{workload.teacher}</h3>
                      <Badge variant="outline">
                        {workload.subjects.join(", ")}
                      </Badge>
                      <Badge 
                        variant={workload.totalHours > 24 ? "destructive" : workload.totalHours > 20 ? "default" : "secondary"}
                      >
                        {workload.totalHours}s/həftə
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-2">
                      <span>Siniflər: {workload.classes.join(", ")}</span>
                      <span>Fənn sayı: {workload.subjects.length}</span>
                      <span>Dərs sayı: {workload.loads.length}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          workload.totalHours > 24 ? 'bg-red-500' :
                          workload.totalHours > 20 ? 'bg-orange-500' :
                          workload.totalHours > 15 ? 'bg-primary' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((workload.totalHours / 30) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" title="Ətraflı bax" onClick={() => handleView(workload.teacher)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Redaktə et" onClick={() => handleEdit(undefined, workload.teacher)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Data Table */}
      {!loadsLoading && filteredLoads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dərs Yükü Detayları</CardTitle>
            <CardDescription>Bütün dərs yükləri cədvəl formatında</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müəllim</TableHead>
                    <TableHead>Fənn</TableHead>
                    <TableHead>Sinif</TableHead>
                    <TableHead className="text-center">Həftəlik Saat</TableHead>
                    <TableHead className="text-center">Əməliyyatlar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load: TeachingLoad) => (
                    <TableRow key={load.id}>
                      <TableCell className="font-medium">{load.teacher_name}</TableCell>
                      <TableCell>{load.subject_name}</TableCell>
                      <TableCell>{load.class_name}</TableCell>
                      <TableCell className="text-center">{load.weekly_hours}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(load.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Dərs Yükü Əlavə Et</DialogTitle>
            <DialogDescription>
              Yeni müəllim dərs yükü məlumatlarını daxil edin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teacher">Müəllim *</Label>
              <Select value={formData.teacher_id} onValueChange={(value) => setFormData(prev => ({...prev, teacher_id: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Müəllim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {teachersData.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Fənn *</Label>
              <Select value={formData.subject_id} onValueChange={(value) => setFormData(prev => ({...prev, subject_id: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Fənn seçin" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsData.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="class">Sinif *</Label>
              <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({...prev, class_id: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sinif seçin" />
                </SelectTrigger>
                <SelectContent>
                  {classesData.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id.toString()}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hours">Həftəlik saat sayı *</Label>
              <Input
                id="hours"
                type="number"
                placeholder="Həftəlik saat sayı"
                min="1"
                max="40"
                value={formData.weekly_hours}
                onChange={(e) => setFormData(prev => ({...prev, weekly_hours: e.target.value}))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="academic-year">Tədris ili</Label>
              <Select value={formData.academic_year_id} onValueChange={(value) => setFormData(prev => ({...prev, academic_year_id: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYearsData.map((year) => (
                    <SelectItem key={year.id} value={year.id.toString()}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                Ləğv et
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Yadda saxlanır...
                  </>
                ) : (
                  'Yadda saxla'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}