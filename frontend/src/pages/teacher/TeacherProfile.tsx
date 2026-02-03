import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Award, 
  BookOpen, 
  Target,
  Clock,
  CheckCircle,
  Edit,
  Download,
  FileText,
  School,
  Users,
  TrendingUp,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard';

interface TeacherProfileData {
  teacherInfo: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    school: string;
    experienceYears: number;
    qualifications: string[];
    photo?: string;
  };
  stats: {
    assignedClasses: number;
    totalStudents: number;
    subjectsTeaching: number;
    attendanceRate: number;
    weeklyHours: number;
    pendingGrades: number;
    activeSurveys: number;
    upcomingTasks: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    type: 'award' | 'certification' | 'milestone';
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field: string;
  }>;
  certificates: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }>;
}

export default function TeacherProfile() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');

  // Mock data - real API-dən gələcək
  const { data: profileData, isLoading } = useQuery<TeacherProfileData>({
    queryKey: ['teacher-profile', currentUser?.id],
    queryFn: async () => {
      // Temporary mock data
      return {
        teacherInfo: {
          name: currentUser?.name || 'Müəllim',
          email: currentUser?.email || 'teacher@atis.az',
          phone: '+994 50 123 45 67',
          subject: 'Riyaziyyat',
          school: 'Bakı Şəhər 123 nömrəli tam orta məktəb',
          experienceYears: 8,
          qualifications: ['Ali təhsil', 'Pedaqoji təcrübə', 'İxtisasartırma kursu'],
          photo: (currentUser as any)?.photo // Optional casting for photo field
        },
        stats: {
          assignedClasses: 5,
          totalStudents: 110,
          subjectsTeaching: 2,
          attendanceRate: 91.5,
          weeklyHours: 20,
          pendingGrades: 12,
          activeSurveys: 3,
          upcomingTasks: 5
        },
        achievements: [
          {
            id: '1',
            title: 'İlin Müəllimi',
            description: '2023-cü ildə ilin müəllimi mükafatı',
            date: '2023-06-15',
            type: 'award'
          },
          {
            id: '2',
            title: 'Advanced Teaching Certificate',
            description: 'Modern tədris metodları sertifikatı',
            date: '2023-03-20',
            type: 'certification'
          },
          {
            id: '3',
            title: '1000 saat dərs',
            description: '1000 dərs saatı tamamlandı',
            date: '2022-12-01',
            type: 'milestone'
          }
        ],
        education: [
          {
            degree: 'Magistr',
            institution: 'BDU',
            year: '2015',
            field: 'Riyaziyyat müəllimliyi'
          },
          {
            degree: 'Bakalavr',
            institution: 'BDU',
            year: '2013',
            field: 'Riyaziyyat'
          }
        ],
        certificates: [
          {
            name: 'Google Certified Educator',
            issuer: 'Google',
            date: '2023-01-15',
            expiryDate: '2025-01-15'
          },
          {
            name: 'Microsoft Innovative Educator',
            issuer: 'Microsoft',
            date: '2022-08-20'
          }
        ]
      };
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

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Profil məlumatları tapılmadı</h3>
          <p className="text-muted-foreground">
            Profil məlumatları mövcud deyil.
          </p>
        </div>
      </div>
    );
  }

  const { teacherInfo, stats, achievements, education, certificates } = profileData;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Müəllim Profili</h1>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Profili Redaktə Et
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={teacherInfo.photo} alt={teacherInfo.name} />
              <AvatarFallback className="text-lg">
                {teacherInfo.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{teacherInfo.name}</CardTitle>
              <CardDescription className="text-lg">
                {teacherInfo.subject} - {teacherInfo.school}
              </CardDescription>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {teacherInfo.experienceYears} il təcrübə
                </Badge>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  {stats.attendanceRate}% davamiyyət
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{teacherInfo.email}</span>
            </div>
            {teacherInfo.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{teacherInfo.phone}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{teacherInfo.school}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{teacherInfo.experienceYears} il təcrübə</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Şəxsi Məlumatlar</TabsTrigger>
          <TabsTrigger value="teaching">Tədris Fəaliyyəti</TabsTrigger>
          <TabsTrigger value="achievements">Nailiyyətlər</TabsTrigger>
          <TabsTrigger value="education">Təhsil</TabsTrigger>
          <TabsTrigger value="certificates">Sertifikatlar</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Şəxsi Məlumatlar</CardTitle>
              <CardDescription>Müəllim haqqında əsas məlumatlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
                  <p className="text-lg">{teacherInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{teacherInfo.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                  <p className="text-lg">{teacherInfo.phone || 'Qeyd edilməyib'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">İxtisas</label>
                  <p className="text-lg">{teacherInfo.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Məktəb</label>
                  <p className="text-lg">{teacherInfo.school}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Təcrübə</label>
                  <p className="text-lg">{teacherInfo.experienceYears} il</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Yüksək bacarıqlar</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {teacherInfo.qualifications.map((qual, index) => (
                    <Badge key={index} variant="outline">
                      {qual}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teaching" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Siniflər</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.assignedClasses}</div>
                <p className="text-xs text-muted-foreground">Təyin edilmiş sinif</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Şagirdlər</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Ümumi şagird sayı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Həftəlik Saat</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.weeklyHours}</div>
                <p className="text-xs text-muted-foreground">Dərs saatı</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Davamiyyət</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                <p className="text-xs text-muted-foreground">Ortalama davamiyyət</p>
                <Progress value={stats.attendanceRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cari Fəaliyyətlər</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Gözləyən qiymətlər: {stats.pendingGrades}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Aktiv sorğular: {stats.activeSurveys}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Yaxın tapşırıqlar: {stats.upcomingTasks}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nailiyyətlər</CardTitle>
              <CardDescription>Müəllimin əldə etdiyi mükafatlar və uğurlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {achievement.type === 'award' && <Award className="h-8 w-8 text-yellow-500" />}
                      {achievement.type === 'certification' && <GraduationCap className="h-8 w-8 text-blue-500" />}
                      {achievement.type === 'milestone' && <Target className="h-8 w-8 text-green-500" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Təhsil Tarixçəsi</CardTitle>
              <CardDescription>Müəllimin təhsil məlumatları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {education.map((edu, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <GraduationCap className="h-8 w-8 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{edu.degree} - {edu.field}</h4>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      <p className="text-xs text-muted-foreground mt-1">Bitirdiyi il: {edu.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sertifikatlar</CardTitle>
              <CardDescription>Müəllimin əldə etdiyi peşəkar sertifikatlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certificates.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-green-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Verilən tarix: {cert.date}
                          {cert.expiryDate && ` - Etibarlı tarix: ${cert.expiryDate}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Yüklə
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
