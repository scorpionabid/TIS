import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
  Users, 
  Save, 
  Copy, 
  RotateCcw, 
  CheckCircle,
  AlertTriangle,
  Plus,
  Minus,
  Calculator,
  Zap,
  Clock,
  Target,
  Edit3,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { assessmentService } from '@/services/assessments';
import { studentService } from '@/services/students';

interface Student {
  id: number;
  name: string;
  student_number: string;
  class_name: string;
  grade_level: number;
}

interface BulkEntry {
  student_id: number;
  score: number | '';
  notes: string;
  is_selected: boolean;
}

interface BulkEntryInterfaceProps {
  institutionId: number;
  assessmentTypeId: number;
  assessmentType: {
    name: string;
    max_score: number;
    scoring_method: string;
  };
  assessmentDate: string;
  gradeLevel?: string;
  className?: string;
  onSave?: (entries: any[]) => void;
}

export const BulkEntryInterface: React.FC<BulkEntryInterfaceProps> = ({
  institutionId,
  assessmentTypeId,
  assessmentType,
  assessmentDate,
  gradeLevel,
  className,
  onSave
}) => {
  const { toast } = useToast();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Map<number, BulkEntry>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedTab, setSelectedTab] = useState('bulk');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [bulkScore, setBulkScore] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  
  // Quick entry presets
  const [quickScores] = useState([
    { label: 'Əla (90-100)', range: [90, 100], color: 'bg-green-100 text-green-800' },
    { label: 'Yaxşı (80-89)', range: [80, 89], color: 'bg-blue-100 text-blue-800' },
    { label: 'Orta (70-79)', range: [70, 79], color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Kafi (60-69)', range: [60, 69], color: 'bg-orange-100 text-orange-800' },
    { label: 'Qeyri-kafi (0-59)', range: [0, 59], color: 'bg-red-100 text-red-800' }
  ]);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const response = await studentService.getStudentsByInstitution(institutionId, {
        grade_level: gradeLevel && gradeLevel !== 'all' ? gradeLevel : undefined,
        class_name: className || undefined,
        per_page: 200
      });

      const studentList = response.students || [];
      setStudents(studentList);

      // Initialize entries
      const initialEntries = new Map<number, BulkEntry>();
      studentList.forEach((student: Student) => {
        initialEntries.set(student.id, {
          student_id: student.id,
          score: '',
          notes: '',
          is_selected: false
        });
      });
      setEntries(initialEntries);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        title: 'Xəta',
        description: 'Şagirdlər yüklənərkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setLoadingStudents(false);
    }
  }, [institutionId, gradeLevel, className, toast]);

  // Load students
  useEffect(() => {
    if (institutionId) {
      loadStudents();
    }
  }, [institutionId, loadStudents]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !student.student_number.includes(searchTerm)) {
        return false;
      }
      if (selectedClassFilter !== 'all' && student.class_name !== selectedClassFilter) {
        return false;
      }
      return true;
    });
  }, [students, searchTerm, selectedClassFilter]);

  // Get unique classes
  const uniqueClasses = useMemo(() => {
    return [...new Set(students.map(s => s.class_name))].sort();
  }, [students]);

  const updateEntry = (studentId: number, field: keyof BulkEntry, value: any) => {
    setEntries(prev => {
      const newEntries = new Map(prev);
      const entry = newEntries.get(studentId) || {
        student_id: studentId,
        score: '',
        notes: '',
        is_selected: false
      };
      
      if (field === 'score') {
        const numValue = parseFloat(value);
        if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= assessmentType.max_score)) {
          entry[field] = value === '' ? '' : numValue;
        } else {
          return prev; // Invalid score, don't update
        }
      } else {
        entry[field] = value;
      }
      
      newEntries.set(studentId, entry);
      return newEntries;
    });
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    setEntries(prev => {
      const newEntries = new Map(prev);
      filteredStudents.forEach(student => {
        const entry = newEntries.get(student.id) || {
          student_id: student.id,
          score: '',
          notes: '',
          is_selected: false
        };
        entry.is_selected = newSelectAll;
        newEntries.set(student.id, entry);
      });
      return newEntries;
    });
  };

  const handleBulkApply = () => {
    if (bulkScore === '' || parseFloat(bulkScore) < 0 || parseFloat(bulkScore) > assessmentType.max_score) {
      toast({
        title: 'Yanlış bal',
        description: `Bal 0 ilə ${assessmentType.max_score} arasında olmalıdır`,
        variant: 'destructive',
      });
      return;
    }

    const selectedCount = Array.from(entries.values()).filter(e => e.is_selected).length;
    if (selectedCount === 0) {
      toast({
        title: 'Seçim yoxdur',
        description: 'Ən azı bir şagird seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setEntries(prev => {
      const newEntries = new Map(prev);
      Array.from(newEntries.values()).forEach(entry => {
        if (entry.is_selected) {
          entry.score = parseFloat(bulkScore);
          if (bulkNotes) {
            entry.notes = bulkNotes;
          }
        }
      });
      return newEntries;
    });

    toast({
      title: 'Tətbiq edildi',
      description: `${selectedCount} şagird üçün qiymət tətbiq edildi`,
    });
  };

  const handleQuickScore = (range: number[]) => {
    const selectedEntries = Array.from(entries.values()).filter(e => e.is_selected);
    if (selectedEntries.length === 0) {
      toast({
        title: 'Seçim yoxdur',
        description: 'Ən azı bir şagird seçilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setEntries(prev => {
      const newEntries = new Map(prev);
      selectedEntries.forEach(entry => {
        // Random score within range
        const randomScore = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        const currentEntry = newEntries.get(entry.student_id);
        if (currentEntry) {
          currentEntry.score = randomScore;
        }
      });
      return newEntries;
    });

    toast({
      title: 'Qiymətlər təyin edildi',
      description: `${selectedEntries.length} şagird üçün ${range[0]}-${range[1]} aralığında qiymət verildi`,
    });
  };

  const handleCopyScores = () => {
    const entriesWithScores = Array.from(entries.values()).filter(e => e.score !== '');
    if (entriesWithScores.length === 0) {
      toast({
        title: 'Kopyalanacaq məlumat yoxdur',
        description: 'Ən azı bir şagird üçün qiymət daxil edilməlidir',
        variant: 'destructive',
      });
      return;
    }

    const csvData = entriesWithScores.map(entry => {
      const student = students.find(s => s.id === entry.student_id);
      return [
        student?.name || '',
        student?.student_number || '',
        entry.score,
        entry.notes
      ].join('\t');
    }).join('\n');

    navigator.clipboard.writeText(`Ad\tNömrə\tBal\tQeydlər\n${csvData}`);
    
    toast({
      title: 'Kopyalandı',
      description: 'Qiymətlər clipboard-a kopyalandı',
    });
  };

  const handleResetAll = () => {
    setEntries(prev => {
      const newEntries = new Map(prev);
      Array.from(newEntries.keys()).forEach(studentId => {
        const entry = newEntries.get(studentId);
        if (entry) {
          entry.score = '';
          entry.notes = '';
          entry.is_selected = false;
        }
      });
      return newEntries;
    });
    setSelectAll(false);
    setBulkScore('');
    setBulkNotes('');
    
    toast({
      title: 'Sıfırlandı',
      description: 'Bütün qiymətlər sıfırlandı',
    });
  };

  const handleSave = async () => {
    const entriesWithScores = Array.from(entries.values()).filter(e => e.score !== '');
    
    if (entriesWithScores.length === 0) {
      toast({
        title: 'Məlumat yoxdur',
        description: 'Ən azı bir şagird üçün qiymət daxil edilməlidir',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const submissionData = {
        assessment_type_id: assessmentTypeId,
        institution_id: institutionId,
        assessment_date: assessmentDate,
        entries: entriesWithScores.map(entry => ({
          student_id: entry.student_id,
          score: entry.score,
          notes: entry.notes
        }))
      };

      await assessmentService.submitBulkAssessmentEntries(submissionData);
      
      onSave?.(entriesWithScores);
      
      toast({
        title: 'Saxlanıldı',
        description: `${entriesWithScores.length} qiymətləndirmə saxlanıldı`,
      });
      
      // Reset after successful save
      handleResetAll();
    } catch (error: any) {
      toast({
        title: 'Saxlama xətası',
        description: error.message || 'Qiymətlər saxlanılarkən xəta baş verdi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return { label: 'Əla', color: 'text-green-600' };
    if (score >= 80) return { label: 'Yaxşı', color: 'text-blue-600' };
    if (score >= 70) return { label: 'Orta', color: 'text-yellow-600' };
    if (score >= 60) return { label: 'Kafi', color: 'text-orange-600' };
    return { label: 'Qeyri-kafi', color: 'text-red-600' };
  };

  const completedCount = Array.from(entries.values()).filter(e => e.score !== '').length;
  const selectedCount = Array.from(entries.values()).filter(e => e.is_selected).length;

  if (loadingStudents) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground">Şagirdlər yüklənir...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi Şagird</p>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanmış</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seçilmiş</p>
                <p className="text-2xl font-bold text-blue-600">{selectedCount}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanma</p>
                <p className="text-2xl font-bold">{Math.round((completedCount / filteredStudents.length) * 100)}%</p>
              </div>
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Info */}
      <Alert>
        <Target className="h-4 w-4" />
        <AlertTitle>Qiymətləndirmə: {assessmentType.name}</AlertTitle>
        <AlertDescription>
          Maksimum bal: {assessmentType.max_score} • Tarix: {new Date(assessmentDate).toLocaleDateString('az-AZ')}
        </AlertDescription>
      </Alert>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bulk">Kütləvi Daxiletmə</TabsTrigger>
          <TabsTrigger value="individual">Fərdi Daxiletmə</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-6">
          {/* Bulk Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Kütləvi Əməliyyatlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                >
                  {selectAll ? 'Heç birini seçmə' : 'Hamısını seç'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedCount} şagird seçildi
                </span>
              </div>

              {/* Quick Score Presets */}
              <div>
                <Label>Tez Qiymət Verilməsi</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickScores.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className={`${preset.color} border-0`}
                      onClick={() => handleQuickScore(preset.range)}
                      disabled={selectedCount === 0}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bulk Entry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bulk-score">Eyni Bal Ver</Label>
                  <Input
                    id="bulk-score"
                    type="number"
                    min="0"
                    max={assessmentType.max_score}
                    value={bulkScore}
                    onChange={(e) => setBulkScore(e.target.value)}
                    placeholder={`0-${assessmentType.max_score}`}
                  />
                </div>
                <div>
                  <Label htmlFor="bulk-notes">Qeydlər</Label>
                  <Input
                    id="bulk-notes"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="Ümumi qeyd"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleBulkApply}
                    disabled={selectedCount === 0 || bulkScore === ''}
                    className="w-full"
                  >
                    Tətbiq Et
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyScores}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopyala
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetAll}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Sıfırla
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving || completedCount === 0}
                  className="ml-auto"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saxlanılır...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Saxla ({completedCount})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filterlər
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Şagird Axtarışı</Label>
                  <Input
                    id="search"
                    placeholder="Ad və ya nömrə..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="class-filter">Sinif</Label>
                  <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sinif seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün Siniflər</SelectItem>
                      {uniqueClasses.map(className => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSave}
                    disabled={saving || completedCount === 0}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saxlanılır...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Saxla ({completedCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Şagirdlər ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredStudents.map((student) => {
              const entry = entries.get(student.id);
              const hasScore = entry && entry.score !== '';
              const gradeInfo = hasScore ? getGradeLabel(Number(entry.score)) : null;

              return (
                <div key={student.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50">
                  <Checkbox
                    checked={entry?.is_selected || false}
                    onCheckedChange={(checked) => updateEntry(student.id, 'is_selected', !!checked)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.student_number} • {student.class_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={assessmentType.max_score}
                      value={entry?.score || ''}
                      onChange={(e) => updateEntry(student.id, 'score', e.target.value)}
                      placeholder="Bal"
                      className="w-20"
                    />
                    
                    <Input
                      value={entry?.notes || ''}
                      onChange={(e) => updateEntry(student.id, 'notes', e.target.value)}
                      placeholder="Qeyd"
                      className="w-32"
                    />

                    {gradeInfo && (
                      <Badge variant="outline" className={gradeInfo.color}>
                        {gradeInfo.label}
                      </Badge>
                    )}

                    {hasScore && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};