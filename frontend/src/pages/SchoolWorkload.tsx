import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCapIcon, Plus, Edit, Eye, BookOpen, Clock, Users, Calculator, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { workloadService, TeachingLoad } from "@/services/workload";
import { useToast } from "@/hooks/use-toast";

export default function SchoolWorkload() {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();

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

  const teachingLoads = teachingLoadsResponse?.data || [];
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
      acc[load.teacher_name].totalHours += load.hours_per_week;
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
        <Button className="flex items-center gap-2">
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
                    stats.total_hours_assigned || teachingLoads.reduce((sum: number, load: TeachingLoad) => sum + load.hours_per_week, 0)
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
                    <Button variant="ghost" size="sm" title="Ətraflı bax">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Redaktə et">
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
                      <TableCell className="text-center">{load.hours_per_week}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm">
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
    </div>
  );
}