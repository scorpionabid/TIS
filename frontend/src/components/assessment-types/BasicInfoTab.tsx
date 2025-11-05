import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CreateAssessmentTypeData } from '../../services/assessmentTypes';

interface CriteriaEntry {
  name: string;
  weight: number;
}

interface BasicInfoTabProps {
  formData: CreateAssessmentTypeData;
  setFormData: (data: CreateAssessmentTypeData) => void;
  criteria: CriteriaEntry[];
  addCriteria: () => void;
  removeCriteria: (index: number) => void;
  updateCriteria: (index: number, field: keyof CriteriaEntry, value: string | number) => void;
}

export const BasicInfoTab = ({
  formData,
  setFormData,
  criteria,
  addCriteria,
  removeCriteria,
  updateCriteria
}: BasicInfoTabProps) => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Əsas Məlumatlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Qiymətləndirmə Növü Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Qiymətləndirmə növünün adını daxil edin"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Kateqoriya</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kateqoriya seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ksq">KSQ (Kiçik Summativ)</SelectItem>
                  <SelectItem value="bsq">BSQ (Böyük Summativ)</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="diagnostic">Diaqnostik</SelectItem>
                  <SelectItem value="custom">Xüsusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Təsvir</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Qiymətləndirmə növünün təsvirini daxil edin"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_score">Maksimum Bal</Label>
              <Input
                id="max_score"
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                min="1"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scoring_method">Qiymətləndirmə Metodu</Label>
              <Select
                value={formData.scoring_method}
                onValueChange={(value) => setFormData({ ...formData, scoring_method: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Faiz (%)</SelectItem>
                  <SelectItem value="points">Bal</SelectItem>
                  <SelectItem value="grades">Qiymət (A, B, C...)</SelectItem>
                  <SelectItem value="pass_fail">Keçdi/Qaldı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <Label htmlFor="is_active">Aktiv</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meyarlar hazırda istifadə olunmur */}
    </div>
  );
};
