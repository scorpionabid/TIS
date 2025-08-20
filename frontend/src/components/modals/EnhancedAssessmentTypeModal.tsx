import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Plus, 
  Minus, 
  X, 
  School, 
  Search, 
  CheckCircle2, 
  Calendar,
  Clock,
  Users,
  MapPin,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { 
  AssessmentType, 
  CreateAssessmentTypeData, 
  UpdateAssessmentTypeData,
  assessmentTypeService 
} from '../../services/assessmentTypes';
import { institutionService } from '../../services/institutions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AssessmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentType?: AssessmentType;
  onSuccess: () => void;
}

interface Institution {
  id: number;
  name: string;
  type: string;
  level: number;
  district?: string;
  region?: string;
  student_count?: number;
  is_active: boolean;
}

interface CriteriaEntry {
  name: string;
  weight: number;
}

export default function EnhancedAssessmentTypeModal({ 
  isOpen, 
  onClose, 
  assessmentType, 
  onSuccess 
}: AssessmentTypeModalProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<number[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('basic');
  
  // Form state
  const [formData, setFormData] = useState<CreateAssessmentTypeData>({
    name: '',
    description: '',
    category: 'custom',
    is_active: true,
    criteria: {},
    max_score: 100,
    scoring_method: 'percentage',
    grade_levels: [],
    subjects: [],
    institution_id: null,
  });
  
  const [criteriaList, setCriteriaList] = useState<CriteriaEntry[]>([]);
  const [gradeSelections, setGradeSelections] = useState<boolean[]>(new Array(11).fill(false));
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [notificationDays, setNotificationDays] = useState(7);

  // Subject list
  const subjects = [
    'Riyaziyyat', 'Fizika', 'Kimya', 'Biologiya', 'Tarix', 'Coğrafiya',
    'Ədəbiyyat', 'İngilis dili', 'Rus dili', 'İnformatika', 'Bədən tərbiyəsi',
    'Musiqi', 'Təsviri sənət', 'Əmək təlimi', 'Din təlimi'
  ];

  // Load institutions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInstitutions();
    }
  }, [isOpen]);

  // Load form data when editing
  useEffect(() => {
    if (assessmentType) {
      setFormData({
        name: assessmentType.name,
        description: assessmentType.description || '',
        category: assessmentType.category,
        is_active: assessmentType.is_active,
        criteria: assessmentType.criteria || {},
        max_score: assessmentType.max_score,
        scoring_method: assessmentType.scoring_method,
        grade_levels: assessmentType.grade_levels || [],
        subjects: assessmentType.subjects || [],
        institution_id: assessmentType.institution_id,
      });

      // Set criteria list
      if (assessmentType.criteria && typeof assessmentType.criteria === 'object') {
        const criteria = Object.entries(assessmentType.criteria).map(([name, weight]) => ({
          name,
          weight: Number(weight)
        }));
        setCriteriaList(criteria);
      }

      // Set grade selections
      const newGradeSelections = new Array(11).fill(false);
      assessmentType.grade_levels?.forEach(grade => {
        if (grade >= 1 && grade <= 11) {
          newGradeSelections[grade - 1] = true;
        }
      });
      setGradeSelections(newGradeSelections);

      // Load selected institutions
      loadAssignedInstitutions(assessmentType.id);
    } else {
      resetForm();
    }
  }, [assessmentType]);

  const loadInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      const response = await institutionService.getInstitutions({ 
        per_page: 1000,
        search: institutionSearch || undefined
      });
      setInstitutions(response.data || []);
    } catch (error) {
      console.error('Failed to load institutions:', error);
      toast({
        title: 'Xəta',
        description: 'Müəssisələr yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadAssignedInstitutions = async (assessmentTypeId: number) => {
    try {
      const assigned = await assessmentTypeService.getAssignedInstitutions(assessmentTypeId);
      setSelectedInstitutions(assigned.map((inst: any) => inst.id));
    } catch (error) {
      console.error('Failed to load assigned institutions:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      is_active: true,
      criteria: {},
      max_score: 100,
      scoring_method: 'percentage',
      grade_levels: [],
      subjects: [],
      institution_id: null,
    });
    setCriteriaList([]);
    setGradeSelections(new Array(11).fill(false));
    setSelectedInstitutions([]);
    setDueDate('');
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setNotificationDays(7);
    setSelectedTab('basic');
  };

  const handleInputChange = (field: keyof CreateAssessmentTypeData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCriteriaAdd = () => {
    setCriteriaList(prev => [...prev, { name: '', weight: 1 }]);
  };

  const handleCriteriaRemove = (index: number) => {
    setCriteriaList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCriteriaChange = (index: number, field: keyof CriteriaEntry, value: string | number) => {
    setCriteriaList(prev => prev.map((criteria, i) => 
      i === index ? { ...criteria, [field]: value } : criteria
    ));
  };

  const handleGradeToggle = (grade: number) => {
    setGradeSelections(prev => {
      const newSelections = [...prev];
      newSelections[grade - 1] = !newSelections[grade - 1];
      return newSelections;
    });
  };

  const handleInstitutionToggle = (institutionId: number) => {
    setSelectedInstitutions(prev => 
      prev.includes(institutionId)
        ? prev.filter(id => id !== institutionId)
        : [...prev, institutionId]
    );
  };

  const handleSelectAllInstitutions = () => {
    const filteredIds = filteredInstitutions.map(inst => inst.id);
    setSelectedInstitutions(prev => 
      filteredIds.every(id => prev.includes(id))
        ? prev.filter(id => !filteredIds.includes(id))
        : [...new Set([...prev, ...filteredIds])]
    );
  };

  const handleSubjectToggle = (subject: string) => {
    const currentSubjects = formData.subjects || [];
    const updatedSubjects = currentSubjects.includes(subject)
      ? currentSubjects.filter(s => s !== subject)
      : [...currentSubjects, subject];
    
    handleInputChange('subjects', updatedSubjects);
  };

  const filteredInstitutions = institutions.filter(institution =>
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
    institution.type.toLowerCase().includes(institutionSearch.toLowerCase())
  );

  const selectedGradeLevels = gradeSelections
    .map((selected, index) => selected ? index + 1 : null)
    .filter(grade => grade !== null) as number[];

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Məlumat eksikliyi',
        description: 'Qiymətləndirmə növünün adını daxil edin',
        variant: 'destructive',
      });
      return;
    }

    if (selectedInstitutions.length === 0) {
      toast({
        title: 'Məlumat eksikliyi',
        description: 'Ən azı bir müəssisə seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare criteria object
      const criteriaObject = criteriaList.reduce((acc, criteria) => {
        if (criteria.name.trim()) {
          acc[criteria.name] = criteria.weight;
        }
        return acc;
      }, {} as Record<string, number>);

      const submissionData = {
        ...formData,
        criteria: criteriaObject,
        grade_levels: selectedGradeLevels,
        institution_assignments: selectedInstitutions,
        due_date: dueDate || undefined,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : undefined,
        notification_settings: {
          days_before_due: notificationDays,
          enabled: true
        }
      };

      if (assessmentType) {
        await assessmentTypeService.updateAssessmentType(assessmentType.id, submissionData);
        toast({
          title: 'Uğurlu yenilənmə',
          description: 'Qiymətləndirmə növü uğurla yeniləndi',
        });
      } else {
        await assessmentTypeService.createAssessmentType(submissionData);
        toast({
          title: 'Uğurlu yaradılma',
          description: 'Qiymətləndirmə növü uğurla yaradıldı və seçilmiş müəssisələrə təyin edildi',
        });
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Xəta',
        description: error.message || 'Əməliyyat zamanı xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const allFilteredSelected = filteredInstitutions.length > 0 && 
    filteredInstitutions.every(inst => selectedInstitutions.includes(inst.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {assessmentType ? 'Qiymətləndirmə Növünü Redaktə Et' : 'Yeni Qiymətləndirmə Növü'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Əsas Məlumatlar</TabsTrigger>
            <TabsTrigger value="criteria">Kriteriyalar</TabsTrigger>
            <TabsTrigger value="institutions">Müəssisələr</TabsTrigger>
            <TabsTrigger value="schedule">Planlaşdırma</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] w-full">
            <TabsContent value="basic" className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Ad *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Qiymətləndirmə növünün adı"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Kateqoriya</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ksq">KSQ (Kiçik Summativ Qiymətləndirmə)</SelectItem>
                      <SelectItem value="bsq">BSQ (Böyük Summativ Qiymətləndirmə)</SelectItem>
                      <SelectItem value="custom">Xüsusi Qiymətləndirmə</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Təsvir</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Qiymətləndirmə haqqında ətraflı məlumat"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max_score">Maksimum Bal</Label>
                  <Input
                    id="max_score"
                    type="number"
                    min="1"
                    value={formData.max_score}
                    onChange={(e) => handleInputChange('max_score', parseInt(e.target.value) || 100)}
                  />
                </div>
                <div>
                  <Label htmlFor="scoring_method">Qiymətləndirmə Metodu</Label>
                  <Select 
                    value={formData.scoring_method} 
                    onValueChange={(value) => handleInputChange('scoring_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Faiz (%)</SelectItem>
                      <SelectItem value="points">Bal</SelectItem>
                      <SelectItem value="grades">Qiymət (A, B, C...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', !!checked)}
                  />
                  <Label htmlFor="is_active">Aktiv</Label>
                </div>
              </div>

              {/* Grade Level Selection */}
              <div>
                <Label>Sinif Səviyyələri</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((grade) => (
                    <Button
                      key={grade}
                      type="button"
                      variant={gradeSelections[grade - 1] ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleGradeToggle(grade)}
                    >
                      {grade}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <Label>Fənnlər</Label>
                <div className="grid grid-cols-3 gap-2 mt-2 max-h-32 overflow-y-auto">
                  {subjects.map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject}`}
                        checked={formData.subjects?.includes(subject) || false}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      />
                      <Label htmlFor={`subject-${subject}`} className="text-sm">
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="criteria" className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <Label>Qiymətləndirmə Kriteriyaları</Label>
                <Button type="button" onClick={handleCriteriaAdd} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Kriteriya Əlavə Et
                </Button>
              </div>

              <div className="space-y-3">
                {criteriaList.map((criteria, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Kriteriya adı"
                      value={criteria.name}
                      onChange={(e) => handleCriteriaChange(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Çəki (%)"
                      value={criteria.weight}
                      onChange={(e) => handleCriteriaChange(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCriteriaRemove(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {criteriaList.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Hələ kriteriya əlavə edilməyib</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="institutions" className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <Label>Müəssisə Seçimi ({selectedInstitutions.length} seçildi)</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllInstitutions}
                  >
                    {allFilteredSelected ? 'Heç birini seçmə' : 'Hamısını seç'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={loadInstitutions}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Input
                  placeholder="Müəssisə axtarın..."
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                />
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {loadingInstitutions ? (
                    <div className="text-center py-4">
                      <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Müəssisələr yüklənir...</p>
                    </div>
                  ) : filteredInstitutions.length > 0 ? (
                    filteredInstitutions.map((institution) => (
                      <div key={institution.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <Checkbox
                          checked={selectedInstitutions.includes(institution.id)}
                          onCheckedChange={() => handleInstitutionToggle(institution.id)}
                        />
                        <div className="flex items-center space-x-2">
                          <School className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{institution.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {institution.type}
                              </Badge>
                              {institution.district && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {institution.district}
                                </span>
                              )}
                              {institution.student_count && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {institution.student_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2" />
                      <p>Axtarış kriteriyasına uyğun müəssisə tapılmadı</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {selectedInstitutions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Seçilmiş Müəssisələr</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {selectedInstitutions.map((id) => {
                        const institution = institutions.find(inst => inst.id === id);
                        return institution ? (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {institution.name}
                            <X 
                              className="h-3 w-3 ml-1 cursor-pointer" 
                              onClick={() => handleInstitutionToggle(id)}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 p-1">
              <div>
                <Label htmlFor="due_date">Son Tarix</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                  <Label htmlFor="is_recurring">Təkrarlanan qiymətləndirmə</Label>
                </div>

                {isRecurring && (
                  <div>
                    <Label htmlFor="frequency">Təkrarlama tezliyi</Label>
                    <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Həftəlik</SelectItem>
                        <SelectItem value="monthly">Aylıq</SelectItem>
                        <SelectItem value="quarterly">Rüblük</SelectItem>
                        <SelectItem value="yearly">İllik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notification_days">Xatırlatma (neçə gün öncədən)</Label>
                <Input
                  id="notification_days"
                  type="number"
                  min="1"
                  max="30"
                  value={notificationDays}
                  onChange={(e) => setNotificationDays(parseInt(e.target.value) || 7)}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Ləğv et
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                {assessmentType ? 'Yenilənir...' : 'Yaradılır...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {assessmentType ? 'Yenilə' : 'Yarat'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}