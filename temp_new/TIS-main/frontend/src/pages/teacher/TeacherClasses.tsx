import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  BookOpen, 
  Award, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  School
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface TeacherClassData {
  id: string;
  name: string;
  grade: string;
  subject: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    attendance: number;
    averageGrade: number;
    avatar?: string;
  }>;
  schedule: Array<{
    day: string;
    time: string;
    room: string;
  }>;
  stats: {
    totalStudents: number;
    averageAttendance: number;
    averageGrade: number;
    pendingGrades: number;
    upcomingTests: number;
  };
}

export default function TeacherClasses() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Mock data - real API-dən gələcək
  const { data: classesData, isLoading } = useQuery<TeacherClassData[]>({
    queryKey: ['teacher-classes', currentUser?.id],
    queryFn: async () => {
      // Temporary mock data
      return [
        {
          id: '1',
          name: '10A',
          grade: '10',
          subject: 'Riyaziyyat',
          students: [
            {
              id: '1',
              name: 'Əli Həsənov',
              email: 'ali.hasanov@school.az',
              phone: '+994 50 111 22 33',
              attendance: 95,
              averageGrade: 87,
              avatar: '/avatars/ali.jpg'
            },
            {
              id: '2',
              name: 'Ayşə Məmmədova',
              email: 'ayse.mammadova@school.az',
              phone: '+994 55 444 55 66',
              attendance: 92,
              averageGrade: 91,
              avatar: '/avatars/ayse.jpg'
            },
            {
              id: '3',
              name: 'Tofiq Abbasov',
              email: 'tofig.abbasov@school.az',
              attendance: 88,
              averageGrade: 78,
              avatar: '/avatars/tofig.jpg'
            }
          ],
          schedule: [
            { day: 'Bazar ertəsi', time: '08:00-08:45', room: '201' },
            { day: 'Çərşənbə axşamı', time: '09:00-09:45', room: '201' },
            { day: 'Cümə axşamı', time: '10:00-10:45', room: '201' }
          ],
          stats: {
            totalStudents: 25,
            averageAttendance: 91.5,
            averageGrade: 85.3,
            pendingGrades: 8,
            upcomingTests: 2
          }
        },
        {
          id: '2',
          name: '11B',
          grade: '11',
          subject: 'Riyaziyyat',
          students: [
            {
              id: '4',
              name: 'Nigar Qurbanova',
              email: 'nigar.qurbanova@school.az',
              phone: '+994 51 777 88 99',
              attendance: 98,
              averageGrade: 94,
              avatar: '/avatars/nigar.jpg'
            },
            {
              id: '5',
              name: 'Kamal Əliyev',
              email: 'kamal.aliyev@school.az',
              attendance: 85,
              averageGrade: 82,
              avatar: '/avatars/kamal.jpg'
            }
          ],
          schedule: [
            { day: 'Bazar ertəsi', time: '09:00-09:45', room: '305' },
            { day: 'Çərşənbə', time: '11:00-11:45', room: '305' },
            { day: 'Cümə', time: '08:00-08:45', room: '305' }
          ],
          stats: {
            totalStudents: 22,
            averageAttendance: 89.2,
            averageGrade: 88.1,
            pendingGrades: 5,
            upcomingTests: 1
          }
        },
        {
          id: '3',
          name: '9C',
          grade: '9',
          subject: 'Riyaziyyat',
          students: [
            {
              id: '6',
              name: 'Leyla Hüseynova',
              email: 'leyla.huseynova@school.az',
              phone: '+994 50 333 44 55',
              attendance: 93,
              averageGrade: 86,
              avatar: '/avatars/leyla.jpg'
            }
          ],
          schedule: [
            { day: 'Çərşənbə axşamı', time: '08:00-08:45', room: '102' },
            { day: 'Cümə axşamı', time: '09:00-09:45', room: '102' }
          ],
          stats: {
            totalStudents: 28,
            averageAttendance: 90.8,
            averageGrade: 84.7,
            pendingGrades: 12,
            upcomingTests: 3
          }
        }
      ];
    },
    enabled: !!currentUser?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Yüklənir...</span>
      </div>
    );
  }

  if (!classesData || classesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Siniflər tapılmadı</h3>
          <p className="text-muted-foreground">
            Sizə hələ ki, heç bir sinif təyin edilməyib.
          </p>
        </div>
      </div>
    );
  }

  // Filter classes
  const filteredClasses = classesData.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || cls.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const selectedClassData = classesData.find(cls => cls.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Siniflərim</h1>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Təyin edilmiş sinifləriniz və şagirdləriniz haqqında məlumatlar
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filterlər</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sinif və ya fənn axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sinif seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                <SelectItem value="9">9-cu sinif</SelectItem>
                <SelectItem value="10">10-cu sinif</SelectItem>
                <SelectItem value="11">11-ci sinif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      {!selectedClass && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classData) => (
            <Card key={classData.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClass(classData.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{classData.name}</CardTitle>
                    <CardDescription>{classData.subject}</CardDescription>
                  </div>
                  <Badge variant="secondary">{classData.grade}-ci sinif</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{classData.stats.totalStudents} şagird</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{classData.stats.averageAttendance}% davamiyyət</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{classData.stats.averageGrade}% orta qiymət</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{classData.stats.pendingGrades} qiymət</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Davamiyyət</span>
                      <span>{classData.stats.averageAttendance}%</span>
                    </div>
                    <Progress value={classData.stats.averageAttendance} />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Dərs Cədvəli</h4>
                    <div className="space-y-1">
                      {classData.schedule.slice(0, 2).map((schedule, index) => (
                        <div key={index} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{schedule.day}</span>
                          <span>{schedule.time} - {schedule.room}</span>
                        </div>
                      ))}
                      {classData.schedule.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{classData.schedule.length - 2} dərs</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Class Detail */}
      {selectedClassData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedClassData.name} - {selectedClassData.subject}</h2>
              <p className="text-muted-foreground">{selectedClassData.grade}-ci sinif</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedClass(null)}>
              Geri qayıt
            </Button>
          </div>

          {/* Class Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ümumi Şagird</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClassData.stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Aktiv şagird</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Davamiyyət</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClassData.stats.averageAttendance}%</div>
                <p className="text-xs text-muted-foreground">Ortalama davamiyyət</p>
                <Progress value={selectedClassData.stats.averageAttendance} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orta Qiymət</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClassData.stats.averageGrade}%</div>
                <p className="text-xs text-muted-foreground">Sinif ortalaması</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gözləyən Qiymətlər</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedClassData.stats.pendingGrades}</div>
                <p className="text-xs text-muted-foreground">Qiymətləndirilməli</p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Dərs Cədvəli</CardTitle>
              <CardDescription>Həftəlik dərslər və otaqlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {selectedClassData.schedule.map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{schedule.day}</p>
                        <p className="text-sm text-muted-foreground">{schedule.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{schedule.room} otaq</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Students List */}
          <Card>
            <CardHeader>
              <CardTitle>Şagirdlər</CardTitle>
              <CardDescription>Sinifdəki şagirdlərin siyahısı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedClassData.students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">{student.attendance}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Davamiyyət</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{student.averageGrade}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Orta qiymət</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Detal
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
