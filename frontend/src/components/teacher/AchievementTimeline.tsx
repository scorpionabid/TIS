import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  Calendar, 
  Trophy, 
  Star, 
  Plus, 
  X, 
  Edit, 
  Trash2,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Medal,
  Gift,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'award' | 'certification' | 'milestone' | 'recognition' | 'publication' | 'presentation';
  impactLevel: 'high' | 'medium' | 'low';
  institution?: string;
  certificateUrl?: string;
  verificationStatus: boolean;
  notes?: string;
  category?: string;
  tags?: string[];
}

interface AchievementTimelineProps {
  achievements: Achievement[];
  onAchievementsChange: (achievements: Achievement[]) => void;
  editable?: boolean;
}

export default function AchievementTimeline({ 
  achievements, 
  onAchievementsChange, 
  editable = false 
}: AchievementTimelineProps) {
  const { toast } = useToast();
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Achievement>>({
    title: '',
    description: '',
    date: '',
    type: 'milestone',
    impactLevel: 'medium',
    institution: '',
    certificateUrl: '',
    verificationStatus: false,
    notes: '',
    category: '',
    tags: []
  });

  const typeOptions = [
    { value: 'award', label: 'Mükafat', icon: Trophy },
    { value: 'certification', label: 'Sertifikat', icon: FileText },
    { value: 'milestone', label: 'Mərhələ', icon: Target },
    { value: 'recognition', label: 'Tanınma', icon: Star },
    { value: 'publication', label: 'Nəşr', icon: Gift },
    { value: 'presentation', label: 'Təqdimat', icon: TrendingUp }
  ];

  const impactLevelOptions = [
    { value: 'high', label: 'Yüksək', color: 'bg-red-100 text-red-800' },
    { value: 'medium', label: 'Orta', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'low', label: 'Aşağı', color: 'bg-green-100 text-green-800' }
  ];

  const categoryOptions = [
    'Akademik', 'Peşəkar', 'Tədqiqat', 'İctimai', 'Texniki', 'Rəhbərlik', 'Digər'
  ];

  const handleAddAchievement = () => {
    if (!formData.title || !formData.description || !formData.date) {
      toast({
        title: "Xəta",
        description: "Başlıq, təsvir və tarix mütləbdir",
        variant: "destructive"
      });
      return;
    }

    const newAchievement: Achievement = {
      id: Date.now().toString(),
      title: formData.title!,
      description: formData.description!,
      date: formData.date!,
      type: formData.type as Achievement['type'],
      impactLevel: formData.impactLevel as Achievement['impactLevel'],
      institution: formData.institution,
      certificateUrl: formData.certificateUrl,
      verificationStatus: formData.verificationStatus || false,
      notes: formData.notes,
      category: formData.category,
      tags: formData.tags || []
    };

    const updatedAchievements = [...achievements, newAchievement].sort((a, b) => {
      // Sort by date (descending)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    onAchievementsChange(updatedAchievements);
    setIsAddingAchievement(false);
    resetForm();
    
    toast({
      title: "Uğur",
      description: "Nailiyyət əlavə edildi",
    });
  };

  const handleUpdateAchievement = () => {
    if (!editingId || !formData.title || !formData.description || !formData.date) {
      toast({
        title: "Xəta",
        description: "Başlıq, təsvir və tarix mütləbdir",
        variant: "destructive"
      });
      return;
    }

    const updatedAchievements = achievements.map(achievement => 
      achievement.id === editingId 
        ? {
            ...achievement,
            title: formData.title!,
            description: formData.description!,
            date: formData.date!,
            type: formData.type as Achievement['type'],
            impactLevel: formData.impactLevel as Achievement['impactLevel'],
            institution: formData.institution,
            certificateUrl: formData.certificateUrl,
            verificationStatus: formData.verificationStatus || false,
            notes: formData.notes,
            category: formData.category,
            tags: formData.tags || []
          }
        : achievement
    );

    onAchievementsChange(updatedAchievements);
    setEditingId(null);
    resetForm();
    
    toast({
      title: "Uğur",
      description: "Nailiyyət yeniləndi",
    });
  };

  const handleDeleteAchievement = (id: string) => {
    const updatedAchievements = achievements.filter(achievement => achievement.id !== id);
    onAchievementsChange(updatedAchievements);
    
    toast({
      title: "Uğur",
      description: "Nailiyyət silindi",
    });
  };

  const handleEditAchievement = (achievement: Achievement) => {
    setFormData(achievement);
    setEditingId(achievement.id);
    setIsAddingAchievement(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      type: 'milestone',
      impactLevel: 'medium',
      institution: '',
      certificateUrl: '',
      verificationStatus: false,
      notes: '',
      category: '',
      tags: []
    });
  };

  const handleCancel = () => {
    setIsAddingAchievement(false);
    setEditingId(null);
    resetForm();
  };

  const getTypeIcon = (type: string) => {
    const option = typeOptions.find(opt => opt.value === type);
    const IconComponent = option?.icon || Award;
    return <IconComponent className="h-5 w-5" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'award':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'certification':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'milestone':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'recognition':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'publication':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'presentation':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (level: string) => {
    const option = impactLevelOptions.find(opt => opt.value === level);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('az-AZ', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDaysAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bu gün';
    if (diffDays === 1) return 'Dünən';
    if (diffDays < 7) return `${diffDays} gün əvvəl`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} həftə əvvəl`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay əvvəl`;
    return `${Math.floor(diffDays / 365)} il əvvəl`;
  };

  const isRecent = (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  return (
    <div className="space-y-6">
      {/* Achievement Timeline */}
      <div className="space-y-4">
        {achievements.map((achievement) => (
          <Card key={achievement.id} className={`relative ${isRecent(achievement.date) ? 'border-blue-200 bg-blue-50/50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getTypeColor(achievement.type)} border`}>
                    {getTypeIcon(achievement.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <CardTitle className="text-lg">{achievement.title}</CardTitle>
                      {isRecent(achievement.date) && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Yeni
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(achievement.date)}</span>
                        <span className="text-gray-500">({getDaysAgo(achievement.date)})</span>
                      </div>
                      {achievement.institution && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4" />
                          <span>{achievement.institution}</span>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getImpactColor(achievement.impactLevel)}>
                    {impactLevelOptions.find(opt => opt.value === achievement.impactLevel)?.label}
                  </Badge>
                  
                  {editable && (
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAchievement(achievement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteAchievement(achievement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-sm text-gray-700">{achievement.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getTypeColor(achievement.type)}>
                    {typeOptions.find(opt => opt.value === achievement.type)?.label}
                  </Badge>
                  
                  {achievement.category && (
                    <Badge variant="secondary" className="text-xs">
                      {achievement.category}
                    </Badge>
                  )}
                  
                  {achievement.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {achievement.verificationStatus && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Təsdiqlənib</span>
                  </div>
                )}
                
                {achievement.certificateUrl && (
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={achievement.certificateUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Sertifikat
                      </a>
                    </Button>
                  </div>
                )}
                
                {achievement.notes && (
                  <div className="text-sm text-gray-600 italic">
                    <p>{achievement.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Achievement Form */}
      {editable && (
        <div>
          {!isAddingAchievement ? (
            <Button 
              onClick={() => setIsAddingAchievement(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nailiyyət Əlavə Et
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? 'Nailiyyəti Redaktə Et' : 'Yeni Nailiyyət'}
                </CardTitle>
                <CardDescription>
                  Uğurlarınızı və nailiyyətlərinizi əlavə edin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Başlıq</Label>
                    <Input
                      id="title"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Nailiyyətin adı"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Tarix</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Növ</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({...formData, type: value as Achievement['type']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Növ seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <option.icon className="h-4 w-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="impactLevel">Təsir Səviyyəsi</Label>
                    <Select 
                      value={formData.impactLevel} 
                      onValueChange={(value) => setFormData({...formData, impactLevel: value as Achievement['impactLevel']})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Təsir səviyyəsi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {impactLevelOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="institution">Müəssisə (opsional)</Label>
                    <Input
                      id="institution"
                      value={formData.institution || ''}
                      onChange={(e) => setFormData({...formData, institution: e.target.value})}
                      placeholder="Təşkilat və ya müəssisə"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Kateqoriya (opsional)</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kateqoriya seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Nailiyyət haqqında ətraflı məlumat"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="certificateUrl">Sertifikat Linki (opsional)</Label>
                  <Input
                    id="certificateUrl"
                    value={formData.certificateUrl || ''}
                    onChange={(e) => setFormData({...formData, certificateUrl: e.target.value})}
                    placeholder="https://example.com/certificate"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Qeydlər (opsional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Əlavə qeydlər"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verificationStatus"
                    checked={formData.verificationStatus || false}
                    onChange={(e) => setFormData({...formData, verificationStatus: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="verificationStatus" className="text-sm">
                    Təsdiqlənib
                  </Label>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={editingId ? handleUpdateAchievement : handleAddAchievement}
                    disabled={!formData.title || !formData.description || !formData.date}
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
