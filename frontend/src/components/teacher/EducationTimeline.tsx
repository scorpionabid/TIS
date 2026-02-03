import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Award, 
  Plus, 
  X, 
  Edit, 
  Trash2,
  BookOpen,
  School,
  Globe,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EducationHistory {
  id: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
  gpa?: number;
  honors?: string[];
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: 'completed' | 'ongoing' | 'planned';
  type: 'bachelor' | 'master' | 'phd' | 'certificate' | 'diploma' | 'other';
}

interface EducationTimelineProps {
  education: EducationHistory[];
  onEducationChange: (education: EducationHistory[]) => void;
  editable?: boolean;
}

export default function EducationTimeline({ 
  education, 
  onEducationChange, 
  editable = false 
}: EducationTimelineProps) {
  const { toast } = useToast();
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EducationHistory>>({
    degree: '',
    institution: '',
    year: '',
    field: '',
    gpa: undefined,
    honors: [],
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    status: 'completed',
    type: 'bachelor'
  });

  const degreeOptions = [
    { value: 'bachelor', label: 'Bakalavr' },
    { value: 'master', label: 'Magistr' },
    { value: 'phd', label: 'Doktorantura' },
    { value: 'certificate', label: 'Sertifikat' },
    { value: 'diploma', label: 'Diplom' },
    { value: 'other', label: 'Digər' }
  ];

  const statusOptions = [
    { value: 'completed', label: 'Bitirilib' },
    { value: 'ongoing', label: 'Davam edir' },
    { value: 'planned', label: 'Planlaşdırılıb' }
  ];

  const handleAddEducation = () => {
    if (!formData.degree || !formData.institution || !formData.field) {
      toast({
        title: "Xəta",
        description: "Dərəcə, müəssisə və sahə mütləbdir",
        variant: "destructive"
      });
      return;
    }

    const newEducation: EducationHistory = {
      id: Date.now().toString(),
      degree: formData.degree!,
      institution: formData.institution!,
      year: formData.year || new Date().getFullYear().toString(),
      field: formData.field!,
      gpa: formData.gpa,
      honors: formData.honors || [],
      description: formData.description,
      location: formData.location,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: formData.status as EducationHistory['status'],
      type: formData.type as EducationHistory['type']
    };

    const updatedEducation = [...education, newEducation].sort((a, b) => {
      // Sort by year (descending)
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      return yearB - yearA;
    });

    onEducationChange(updatedEducation);
    setIsAddingEducation(false);
    resetForm();
    
    toast({
      title: "Uğur",
      description: "Təhsil məlumatı əlavə edildi",
    });
  };

  const handleUpdateEducation = () => {
    if (!editingId || !formData.degree || !formData.institution || !formData.field) {
      toast({
        title: "Xəta",
        description: "Dərəcə, müəssisə və sahə mütləbdir",
        variant: "destructive"
      });
      return;
    }

    const updatedEducation = education.map(edu => 
      edu.id === editingId 
        ? {
            ...edu,
            degree: formData.degree!,
            institution: formData.institution!,
            year: formData.year || edu.year,
            field: formData.field!,
            gpa: formData.gpa,
            honors: formData.honors || [],
            description: formData.description,
            location: formData.location,
            startDate: formData.startDate,
            endDate: formData.endDate,
            status: formData.status as EducationHistory['status'],
            type: formData.type as EducationHistory['type']
          }
        : edu
    );

    onEducationChange(updatedEducation);
    setEditingId(null);
    resetForm();
    
    toast({
      title: "Uğur",
      description: "Təhsil məlumatı yeniləndi",
    });
  };

  const handleDeleteEducation = (id: string) => {
    const updatedEducation = education.filter(edu => edu.id !== id);
    onEducationChange(updatedEducation);
    
    toast({
      title: "Uğur",
      description: "Təhsil məlumatı silindi",
    });
  };

  const handleEditEducation = (edu: EducationHistory) => {
    setFormData(edu);
    setEditingId(edu.id);
    setIsAddingEducation(true);
  };

  const resetForm = () => {
    setFormData({
      degree: '',
      institution: '',
      year: '',
      field: '',
      gpa: undefined,
      honors: [],
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      status: 'completed',
      type: 'bachelor'
    });
  };

  const handleCancel = () => {
    setIsAddingEducation(false);
    setEditingId(null);
    resetForm();
  };

  const handleAddHonor = () => {
    // This would open a dialog to add honors
    toast({
      title: "Məlumat",
      description: "Şərəf əlavə etmək funksiyası tezliklə əlavə olunacaq",
    });
  };

  const getDegreeIcon = (type: string) => {
    switch (type) {
      case 'phd':
        return '🎓';
      case 'master':
        return '📚';
      case 'bachelor':
        return '🎓';
      case 'certificate':
        return '📜';
      case 'diploma':
        return '🏆';
      default:
        return '📖';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGPAColor = (gpa?: number) => {
    if (!gpa) return 'text-gray-500';
    if (gpa >= 3.7) return 'text-green-600';
    if (gpa >= 3.0) return 'text-blue-600';
    if (gpa >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Education Timeline */}
      <div className="space-y-4">
        {education.map((edu, index) => (
          <Card key={edu.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                    {getDegreeIcon(edu.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <CardTitle className="text-lg">{edu.degree}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(edu.status)}>
                        {statusOptions.find(s => s.value === edu.status)?.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      <div className="flex items-center space-x-2">
                        <School className="h-4 w-4" />
                        <span>{edu.institution}</span>
                        {edu.location && (
                          <>
                            <MapPin className="h-4 w-4" />
                            <span>{edu.location}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>{edu.year}</span>
                        {edu.startDate && edu.endDate && (
                          <>
                            <span className="text-gray-500">({edu.startDate} - {edu.endDate})</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{edu.field}</span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
                
                {editable && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditEducation(edu)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteEducation(edu.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            {(edu.gpa || edu.honors?.length || edu.description) && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {edu.gpa && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">GPA: </span>
                      <span className={`font-semibold ${getGPAColor(edu.gpa)}`}>
                        {edu.gpa.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {edu.honors && edu.honors.length > 0 && (
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">Şərəflər: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {edu.honors.map((honor, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {honor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {edu.description && (
                    <div className="text-sm text-gray-600">
                      <p>{edu.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Add/Edit Education Form */}
      {editable && (
        <div>
          {!isAddingEducation ? (
            <Button 
              onClick={() => setIsAddingEducation(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Təhsil Məlumatı Əlavə Et
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? 'Təhsil Məlumatını Redaktə Et' : 'Yeni Təhsil Məlumatı'}
                </CardTitle>
                <CardDescription>
                  Təhsil tarixçənizə yeni məlumat əlavə edin və ya mövcud məlumatı redaktə edin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="degree">Dərəcə</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({...formData, type: value as EducationHistory['type']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dərəcə seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {degreeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value as EducationHistory['status']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="institution">Müəssisə</Label>
                    <Input
                      id="institution"
                      value={formData.institution || ''}
                      onChange={(e) => setFormData({...formData, institution: e.target.value})}
                      placeholder="Müəssisənin adı"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="field">Sahə</Label>
                    <Input
                      id="field"
                      value={formData.field || ''}
                      onChange={(e) => setFormData({...formData, field: e.target.value})}
                      placeholder="Təhsil sahəsi"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="year">Bitmə İli</Label>
                    <Input
                      id="year"
                      value={formData.year || ''}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                      placeholder="2023"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="gpa">GPA (opsional)</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={formData.gpa || ''}
                      onChange={(e) => setFormData({...formData, gpa: parseFloat(e.target.value) || undefined})}
                      placeholder="3.75"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Məkan (opsional)</Label>
                    <Input
                      id="location"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Bakı, Azərbaycan"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Təsvir (opsional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Təhsil haqqında qısa məlumat"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={editingId ? handleUpdateEducation : handleAddEducation}
                    disabled={!formData.degree || !formData.institution || !formData.field}
                  >
                    {editingId ? 'Yenilə' : 'Əlavə Et'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Ləğv Et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
