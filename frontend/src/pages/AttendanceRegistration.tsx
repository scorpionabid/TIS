import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Save, Plus, School, Users, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { institutionService } from "@/services/institutions";
import { attendanceService } from "@/services/attendance";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { az } from "date-fns/locale";

interface AttendanceFormData {
  school_id: string;
  class_name: string;
  date: string;
  start_count: number | null;
  end_count: number | null;
  notes: string;
}

// Available class options
const CLASS_OPTIONS = [
  '1A', '1B', '1C', '1D',
  '2A', '2B', '2C', '2D',
  '3A', '3B', '3C', '3D',
  '4A', '4B', '4C', '4D',
  '5A', '5B', '5C', '5D',
  '6A', '6B', '6C', '6D',
  '7A', '7B', '7C', '7D',
  '8A', '8B', '8C', '8D',
  '9A', '9B', '9C', '9D',
  '10A', '10B', '10C', '10D',
  '11A', '11B', '11C', '11D'
];

export default function AttendanceRegistration() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AttendanceFormData>({
    school_id: '',
    class_name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_count: null,
    end_count: null,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load schools data
  const { data: schoolsResponse, isLoading: schoolsLoading } = useQuery({
    queryKey: ['institutions', 'schools'],
    queryFn: () => institutionService.getAll()
  });

  const schools = useMemo(() => {
    if (!schoolsResponse?.success || !schoolsResponse.data) return [];
    const data = Array.isArray(schoolsResponse.data) ? schoolsResponse.data : schoolsResponse.data.data || [];
    return data.filter((institution: any) => 
      ['secondary_school', 'lyceum', 'gymnasium', 'vocational_school'].includes(institution.type)
    );
  }, [schoolsResponse]);

  const handleInputChange = (field: keyof AttendanceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.school_id) {
      toast({
        title: "Xəta",
        description: "Məktəb seçilməlidir",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.class_name) {
      toast({
        title: "Xəta", 
        description: "Sinif seçilməlidir",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.date) {
      toast({
        title: "Xəta",
        description: "Tarix daxil edilməlidir",
        variant: "destructive"
      });
      return false;
    }

    if (formData.start_count === null || formData.start_count < 0) {
      toast({
        title: "Xəta",
        description: "Gün əvvəli sayı düzgün daxil edilməlidir",
        variant: "destructive"
      });
      return false;
    }

    if (formData.end_count === null || formData.end_count < 0) {
      toast({
        title: "Xəta",
        description: "Gün sonu sayı düzgün daxil edilməlidir", 
        variant: "destructive"
      });
      return false;
    }

    if (formData.end_count > formData.start_count) {
      toast({
        title: "Xəta",
        description: "Gün sonu sayı gün əvvəli sayından çox ola bilməz",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const attendanceData = {
        school_id: parseInt(formData.school_id),
        class_name: formData.class_name,
        date: formData.date,
        start_count: formData.start_count!,
        end_count: formData.end_count!,
        notes: formData.notes
      };

      await attendanceService.createAttendance(attendanceData);
      
      toast({
        title: "Uğurlu",
        description: "Davamiyyət qeydi uğurla saxlanıldı",
      });

      // Reset form
      setFormData({
        school_id: '',
        class_name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_count: null,
        end_count: null,
        notes: ''
      });

    } catch (error) {
      toast({
        title: "Xəta",
        description: error instanceof Error ? error.message : "Davamiyyət qeydi saxlanılarkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSchool = schools.find(school => school.id.toString() === formData.school_id);
  const attendanceRate = formData.start_count && formData.end_count 
    ? ((formData.end_count / formData.start_count) * 100).toFixed(1)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Davamiyyət Qeydiyyatı</h1>
          <p className="text-muted-foreground">Gündəlik şagird davamiyyətinin qeydiyyatı</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Yeni Davamiyyət Qeydi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* School Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="school">Məktəb *</Label>
                    <Select
                      value={formData.school_id}
                      onValueChange={(value) => handleInputChange('school_id', value)}
                      disabled={schoolsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Məktəb seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id.toString()}>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4" />
                              {school.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="class">Sinif *</Label>
                    <Select
                      value={formData.class_name}
                      onValueChange={(value) => handleInputChange('class_name', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sinif seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="date">Tarix *</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="pl-10"
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Count */}
                  <div className="space-y-2">
                    <Label htmlFor="start_count">Dərs günü başlayanda sayı *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="start_count"
                        type="number"
                        min="0"
                        value={formData.start_count || ''}
                        onChange={(e) => handleInputChange('start_count', e.target.value ? parseInt(e.target.value) : null)}
                        className="pl-10"
                        placeholder="Məs: 30"
                      />
                    </div>
                  </div>

                  {/* End Count */}
                  <div className="space-y-2">
                    <Label htmlFor="end_count">Dərs günü sonunda sayı *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="end_count"
                        type="number"
                        min="0"
                        max={formData.start_count || undefined}
                        value={formData.end_count || ''}
                        onChange={(e) => handleInputChange('end_count', e.target.value ? parseInt(e.target.value) : null)}
                        className="pl-10"
                        placeholder="Məs: 28"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Qeydlər</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Əlavə qeydlər (məcburi deyil)"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saxlanılır...' : 'Davamiyyəti Saxla'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <div className="space-y-6">
          {/* Current Entry Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cari Qeyd Özəti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Məktəb:</span>
                  <span className="text-sm font-medium">
                    {selectedSchool?.name || 'Seçilməyib'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sinif:</span>
                  <span className="text-sm font-medium">
                    {formData.class_name || 'Seçilməyib'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tarix:</span>
                  <span className="text-sm font-medium">
                    {formData.date ? format(new Date(formData.date), 'dd.MM.yyyy', { locale: az }) : 'Seçilməyib'}
                  </span>
                </div>
              </div>

              {formData.start_count !== null && formData.end_count !== null && (
                <>
                  <hr />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Başlanğıc say:</span>
                      <span className="text-sm font-medium">{formData.start_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Son say:</span>
                      <span className="text-sm font-medium">{formData.end_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Qayıblar:</span>
                      <span className="text-sm font-medium text-red-600">
                        {formData.start_count - formData.end_count}
                      </span>
                    </div>
                    {attendanceRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Davamiyyət:</span>
                        <span className={`text-sm font-bold ${
                          parseFloat(attendanceRate) >= 95 
                            ? 'text-green-600' 
                            : parseFloat(attendanceRate) >= 85 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          {attendanceRate}%
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Bu Həftə Üçün</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Qeydiyyat günləri:</span>
                <span className="text-sm font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Orta davamiyyət:</span>
                <span className="text-sm font-medium text-green-600">94.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ümumi şagird:</span>
                <span className="text-sm font-medium">156</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}