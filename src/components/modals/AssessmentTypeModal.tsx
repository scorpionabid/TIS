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
import { Plus, Minus, X } from 'lucide-react';
import { 
  AssessmentType, 
  CreateAssessmentTypeData, 
  UpdateAssessmentTypeData,
  assessmentTypeService 
} from '../../services/assessmentTypes';
import { institutionService } from '../../services/institutions';
import { useToast } from '@/hooks/use-toast';

interface AssessmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentType?: AssessmentType;
  onSuccess: () => void;
}

interface CriteriaEntry {
  name: string;
  weight: number;
}

export default function AssessmentTypeModal({ 
  isOpen, 
  onClose, 
  assessmentType, 
  onSuccess 
}: AssessmentTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  
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
    institution_id: undefined
  });

  // Criteria management
  const [criteriaEntries, setCriteriaEntries] = useState<CriteriaEntry[]>([]);
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaWeight, setNewCriteriaWeight] = useState<number>(0);

  const { toast } = useToast();

  // Helper function to safely validate SelectItem values
  const getSafeSelectValue = (value: any): string => {
    if (!value) return '';
    const stringValue = String(value).trim();
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null' ? '' : stringValue;
  };

  // Helper function to validate items for SelectItem
  const isValidSelectItem = (item: any): boolean => {
    return item && item.id && item.name && getSafeSelectValue(item.id) !== '';
  };

  // Load institutions
  useEffect(() => {
    loadInstitutions();
  }, []);

  // Initialize form when modal opens or assessment type changes
  useEffect(() => {
    if (isOpen) {
      if (assessmentType) {
        // Edit mode
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
          institution_id: assessmentType.institution_id
        });

        // Convert criteria object to entries for editing
        if (assessmentType.criteria) {
          const entries = Object.entries(assessmentType.criteria).map(([name, weight]) => ({
            name,
            weight: Number(weight)
          }));
          setCriteriaEntries(entries);
        }
      } else {
        // Create mode - reset form
        resetForm();
      }
    }
  }, [isOpen, assessmentType]);

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
      institution_id: undefined
    });
    setCriteriaEntries([]);
    setNewCriteriaName('');
    setNewCriteriaWeight(0);
  };

  const loadInstitutions = async () => {
    try {
      setLoadingInstitutions(true);
      const response = await institutionService.getInstitutions({ per_page: 100 });
      console.log('🏢 Institutions API Response:', response);
      console.log('🏢 Institutions Data:', response.data);
      console.log('🏢 Is Array?', Array.isArray(response.data));
      
      // API returns paginated response: response.data.data contains the array
      const institutionsArray = response.data?.data || response.data || [];
      setInstitutions(Array.isArray(institutionsArray) ? institutionsArray : []);
    } catch (error) {
      console.error('Error loading institutions:', error);
      toast({
        title: 'Xəta',
        description: 'Təşkilatlar yüklənərkən xəta baş verdi',
        variant: 'destructive'
      });
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const handleInputChange = (field: keyof CreateAssessmentTypeData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldToggle = (field: 'grade_levels' | 'subjects', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...(prev[field] || []), value]
    }));
  };

  const addCriteria = () => {
    if (!newCriteriaName.trim() || newCriteriaWeight <= 0) {
      toast({
        title: 'Validasiya xətası',
        description: 'Meyar adı və çəkisi düzgün daxil edilməlidir',
        variant: 'destructive'
      });
      return;
    }

    if (criteriaEntries.some(entry => entry.name === newCriteriaName.trim())) {
      toast({
        title: 'Dublikat xətası',
        description: 'Bu adda meyar artıq mövcuddur',
        variant: 'destructive'
      });
      return;
    }

    const newEntry: CriteriaEntry = {
      name: newCriteriaName.trim(),
      weight: newCriteriaWeight
    };

    setCriteriaEntries(prev => [...prev, newEntry]);
    setNewCriteriaName('');
    setNewCriteriaWeight(0);
  };

  const removeCriteria = (index: number) => {
    setCriteriaEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateCriteriaWeight = (index: number, weight: number) => {
    setCriteriaEntries(prev => 
      prev.map((entry, i) => 
        i === index ? { ...entry, weight } : entry
      )
    );
  };

  const getTotalCriteriaWeight = () => {
    return criteriaEntries.reduce((sum, entry) => sum + entry.weight, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert criteria entries back to object
    const criteriaObject = criteriaEntries.reduce((acc, entry) => {
      acc[entry.name] = entry.weight;
      return acc;
    }, {} as Record<string, number>);

    const submitData: CreateAssessmentTypeData | UpdateAssessmentTypeData = {
      ...formData,
      criteria: Object.keys(criteriaObject).length > 0 ? criteriaObject : undefined
    };

    // Validate
    const errors = assessmentTypeService.validateAssessmentTypeData(submitData);
    if (errors.length > 0) {
      toast({
        title: 'Validasiya xətası',
        description: errors[0],
        variant: 'destructive'
      });
      return;
    }

    // Check criteria weight total
    const totalWeight = getTotalCriteriaWeight();
    if (totalWeight > 100) {
      toast({
        title: 'Meyar xətası',
        description: 'Meyarların ümumi çəkisi 100%-dən çox ola bilməz',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (assessmentType) {
        // Update existing
        await assessmentTypeService.updateAssessmentType(assessmentType.id, submitData);
        toast({
          title: 'Uğurlu yeniləmə',
          description: 'Assessment type uğurla yeniləndi'
        });
      } else {
        // Create new
        await assessmentTypeService.createAssessmentType(submitData);
        toast({
          title: 'Uğurlu yaradılma',
          description: 'Assessment type uğurla yaradıldı'
        });
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting assessment type:', error);
      toast({
        title: 'Əməliyyat xətası',
        description: error.message || 'Əməliyyat zamanı xəta baş verdi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = assessmentTypeService.getCategories();
  const scoringMethods = assessmentTypeService.getScoringMethods();
  const gradeLevels = assessmentTypeService.getGradeLevels();
  const subjects = assessmentTypeService.getSubjects();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {assessmentType ? 'Assessment Type Redaktə Et' : 'Yeni Assessment Type Yarat'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Əsas Məlumatlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Ad *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Assessment type adını daxil edin"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Təsvir</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Assessment type haqqında ətraflı məlumat"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kateqoriya *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kateqoriya seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="institution">Təşkilat</Label>
                  <Select 
                    value={formData.institution_id?.toString() || 'global'} 
                    onValueChange={(value) => handleInputChange('institution_id', value === 'global' ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Təşkilat seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Sistem geneli</SelectItem>
                      {Array.isArray(institutions) && institutions
                        .filter(isValidSelectItem)
                        .map((institution) => {
                          const safeValue = getSafeSelectValue(institution.id);
                          return safeValue ? (
                            <SelectItem key={institution.id} value={safeValue}>
                              {institution.name}
                            </SelectItem>
                          ) : null;
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_score">Maksimum Bal *</Label>
                  <Input
                    id="max_score"
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => handleInputChange('max_score', parseInt(e.target.value) || 0)}
                    placeholder="100"
                    min={1}
                    max={1000}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="scoring_method">Qiymətləndirmə Metodu *</Label>
                  <Select 
                    value={formData.scoring_method} 
                    onValueChange={(value) => handleInputChange('scoring_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Metod seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {scoringMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Aktiv</Label>
              </div>
            </CardContent>
          </Card>

          {/* Assessment Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Qiymətləndirmə Meyarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new criteria */}
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Meyar adı"
                  value={newCriteriaName}
                  onChange={(e) => setNewCriteriaName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Çəki (%)"
                  value={newCriteriaWeight || ''}
                  onChange={(e) => setNewCriteriaWeight(parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                />
                <Button type="button" onClick={addCriteria} size="sm">
                  <Plus className="h-4 w-4" />
                  Əlavə et
                </Button>
              </div>

              {/* Criteria list */}
              {criteriaEntries.length > 0 && (
                <div className="space-y-2">
                  {criteriaEntries.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <span className="flex-1">{entry.name}</span>
                      <Input
                        type="number"
                        value={entry.weight}
                        onChange={(e) => updateCriteriaWeight(index, parseInt(e.target.value) || 0)}
                        className="w-20"
                        min={1}
                        max={100}
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriteria(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Ümumi çəki:</span>
                    <Badge variant={getTotalCriteriaWeight() > 100 ? 'destructive' : 'secondary'}>
                      {getTotalCriteriaWeight()}%
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Sinif Səviyyələri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {gradeLevels.map((grade) => (
                  <div key={grade.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`grade-${grade.value}`}
                      checked={formData.grade_levels?.includes(grade.value) || false}
                      onCheckedChange={() => handleArrayFieldToggle('grade_levels', grade.value)}
                    />
                    <Label htmlFor={`grade-${grade.value}`} className="text-sm">
                      {grade.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subjects */}
          <Card>
            <CardHeader>
              <CardTitle>Fənlər</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map((subject) => (
                  <div key={subject.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.value}`}
                      checked={formData.subjects?.includes(subject.value) || false}
                      onCheckedChange={() => handleArrayFieldToggle('subjects', subject.value)}
                    />
                    <Label htmlFor={`subject-${subject.value}`} className="text-sm">
                      {subject.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Ləğv et
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saxlanılır...' : (assessmentType ? 'Yenilə' : 'Yarat')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}