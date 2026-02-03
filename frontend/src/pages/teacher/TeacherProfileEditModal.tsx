import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Star,
  Plus,
  X,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dashboardService } from '@/services/dashboard';
import EducationTimeline from '@/components/teacher/EducationTimeline';
import AchievementTimeline from '@/components/teacher/AchievementTimeline';

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'award' | 'certification' | 'milestone' | 'recognition' | 'publication' | 'presentation';
  impactLevel: 'high' | 'medium' | 'low';
  verificationStatus: boolean;
  institution?: string;
  certificateUrl?: string;
  notes?: string;
  category?: string;
  tags?: string[];
}

interface EducationHistory {
  id: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
  status: 'completed' | 'ongoing' | 'planned';
  type: 'bachelor' | 'master' | 'phd' | 'certificate' | 'diploma' | 'other';
}

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
  achievements: Achievement[];
  education: EducationHistory[];
  certificates: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
  }>;
}

interface TeacherProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: TeacherProfileData;
  onProfileUpdate: (updatedData: TeacherProfileData) => void;
}

export default function TeacherProfileEditModal({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate
}: TeacherProfileEditModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TeacherProfileData>({
    ...profileData,
    education: profileData.education.map((edu, index) => ({
      id: `edu-${index}`,
      degree: edu.degree,
      institution: edu.institution,
      year: edu.year,
      field: edu.field,
      status: 'completed' as const,
      type: 'bachelor' as const
    }))
  });
  const [newQualification, setNewQualification] = useState('');
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    date: '',
    type: 'milestone' as const,
    impactLevel: 'medium' as const,
    verificationStatus: false,
    institution: '',
    certificateUrl: '',
    notes: '',
    category: '',
    tags: [] as string[]
  });
  const [newEducation, setNewEducation] = useState({
    degree: '',
    institution: '',
    year: '',
    field: ''
  });
  const [newCertificate, setNewCertificate] = useState({
    name: '',
    issuer: '',
    date: '',
    expiryDate: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      teacherInfo: {
        ...prev.teacherInfo,
        [field]: value
      }
    }));
  };

  const handleQualificationAdd = () => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        teacherInfo: {
          ...prev.teacherInfo,
          qualifications: [...prev.teacherInfo.qualifications, newQualification.trim()]
        }
      }));
      setNewQualification('');
    }
  };

  const handleQualificationRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teacherInfo: {
        ...prev.teacherInfo,
        qualifications: prev.teacherInfo.qualifications.filter((_, i) => i !== index)
      }
    }));
  };

  const handleAchievementAdd = () => {
    if (newAchievement.title.trim() && newAchievement.description.trim() && newAchievement.date) {
      setFormData(prev => ({
        ...prev,
        achievements: [...prev.achievements, {
          id: Date.now().toString(),
          ...newAchievement
        }]
      }));
      setNewAchievement({
        title: '',
        description: '',
        date: '',
        type: 'milestone' as const,
        impactLevel: 'medium' as const,
        verificationStatus: false,
        institution: '',
        certificateUrl: '',
        notes: '',
        category: '',
        tags: [] as string[]
      });
    }
  };

  const handleAchievementRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(a => a.id !== id)
    }));
  };

  const handleEducationAdd = () => {
    if (newEducation.degree && newEducation.institution && newEducation.year && newEducation.field) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, {
          id: Date.now().toString(),
          ...newEducation,
          status: 'completed' as const,
          type: 'bachelor' as const
        }]
      }));
      setNewEducation({
        degree: '',
        institution: '',
        year: '',
        field: ''
      });
    }
  };

  const handleEducationRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const handleCertificateAdd = () => {
    if (newCertificate.name && newCertificate.issuer && newCertificate.date) {
      setFormData(prev => ({
        ...prev,
        certificates: [...prev.certificates, newCertificate]
      }));
      setNewCertificate({
        name: '',
        issuer: '',
        date: '',
        expiryDate: ''
      });
    }
  };

  const handleCertificateRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Real API call with approval workflow
      await dashboardService.updateTeacherProfileWithApproval(formData);
      
      onProfileUpdate(formData);
      toast({
        title: "Profil təsdiq üçün göndərildi",
        description: "Profil məlumatlarınız sektoradmin tərəfindən nəzərdən keçirəcək",
      });
      
      // Close modal after successful submission
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Xəta baş verdi",
        description: "Profil yenilənərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profili Redaktə Et</DialogTitle>
          <DialogDescription>
            Profil məlumatlarınızı redaktə edin və yeniləyin
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Şəxsi</TabsTrigger>
            <TabsTrigger value="teaching">Tədris</TabsTrigger>
            <TabsTrigger value="education">Təhsil</TabsTrigger>
            <TabsTrigger value="achievements">Nailiyyətlər</TabsTrigger>
            <TabsTrigger value="certificates">Sertifikatlar</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Şəxsi Məlumatlar
                </CardTitle>
                <CardDescription>Əsas şəxsi məlumatlarınız</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      value={formData.teacherInfo.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ad və soyadınızı daxil edin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.teacherInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Email ünvanınız"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={formData.teacherInfo.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+994 XX XXX XX XX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Təcrübə (il)</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={formData.teacherInfo.experienceYears}
                      onChange={(e) => handleInputChange('experienceYears', parseInt(e.target.value))}
                      placeholder="Təcrübə illəri"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <School className="h-5 w-5 mr-2" />
                  İş Yeri
                </CardTitle>
                <CardDescription>Məktəb və ixtisas məlumatları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="school">Məktəb</Label>
                  <Input
                    id="school"
                    value={formData.teacherInfo.school}
                    onChange={(e) => handleInputChange('school', e.target.value)}
                    placeholder="Məktəbin adı"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">İxtisas</Label>
                  <Select value={formData.teacherInfo.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="İxtisas seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Riyaziyyat">Riyaziyyat</SelectItem>
                      <SelectItem value="Fizika">Fizika</SelectItem>
                      <SelectItem value="Kimya">Kimya</SelectItem>
                      <SelectItem value="Biyologiya">Biyologiya</SelectItem>
                      <SelectItem value="Tarix">Tarix</SelectItem>
                      <SelectItem value="Coğrafya">Coğrafya</SelectItem>
                      <SelectItem value="Ədəbiyyat">Ədəbiyyat</SelectItem>
                      <SelectItem value="İngilis dili">İngilis dili</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Bacarıqlar və Sertifikatlar
                </CardTitle>
                <CardDescription>Peşəkar bacarıqlarınız</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.teacherInfo.qualifications.map((qual, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {qual}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleQualificationRemove(index)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    placeholder="Yeni bacarıq əlavə edin"
                    onKeyPress={(e) => e.key === 'Enter' && handleQualificationAdd()}
                  />
                  <Button onClick={handleQualificationAdd} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teaching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Tədris Fəaliyyəti
                </CardTitle>
                <CardDescription>Tədris statistikaları və fəaliyyətlər</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formData.stats.assignedClasses}</div>
                    <p className="text-sm text-muted-foreground">Sinif</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formData.stats.totalStudents}</div>
                    <p className="text-sm text-muted-foreground">Şagird</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formData.stats.weeklyHours}</div>
                    <p className="text-sm text-muted-foreground">Saat/Həftə</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{formData.stats.attendanceRate}%</div>
                    <p className="text-sm text-muted-foreground">Davamiyyət</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="education" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Təhsil Tarixçəsi
                </CardTitle>
                <CardDescription>Təhsil aldığınız müəssisələr və dərəcələr</CardDescription>
              </CardHeader>
              <CardContent>
                <EducationTimeline
                  education={formData.education}
                  onEducationChange={(education) => setFormData(prev => ({ ...prev, education }))}
                  editable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Nailiyyətlər
                </CardTitle>
                <CardDescription>Əldə etdiyiniz mükafatlar və uğurlar</CardDescription>
              </CardHeader>
              <CardContent>
                <AchievementTimeline
                  achievements={formData.achievements}
                  onAchievementsChange={(achievements) => setFormData(prev => ({ ...prev, achievements }))}
                  editable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Sertifikatlar
                </CardTitle>
                <CardDescription>Peşəkar sertifikatlarınız</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {formData.certificates.map((cert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        <p className="text-xs text-muted-foreground">{cert.date}</p>
                        {cert.expiryDate && (
                          <p className="text-xs text-orange-600">Bitir: {cert.expiryDate}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCertificateRemove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Yeni Sertifikat Əlavə Et</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Sertifikat adı"
                      value={newCertificate.name}
                      onChange={(e) => setNewCertificate({...newCertificate, name: e.target.value})}
                    />
                    <Input
                      placeholder="Verən təşkilat"
                      value={newCertificate.issuer}
                      onChange={(e) => setNewCertificate({...newCertificate, issuer: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        value={newCertificate.date}
                        onChange={(e) => setNewCertificate({...newCertificate, date: e.target.value})}
                      />
                      <Input
                        type="date"
                        value={newCertificate.expiryDate}
                        onChange={(e) => setNewCertificate({...newCertificate, expiryDate: e.target.value})}
                        placeholder="Bitmə tarixi (opsional)"
                      />
                    </div>
                    <Button onClick={handleCertificateAdd} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Sertifikat Əlavə Et
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ləğv Et
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Yenilənir...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Saxla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
