import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Minus } from 'lucide-react';
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
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);

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
                  <SelectItem value="academic">Akademik</SelectItem>
                  <SelectItem value="behavioral">Davranış</SelectItem>
                  <SelectItem value="skill">Bacarıq</SelectItem>
                  <SelectItem value="project">Layihə</SelectItem>
                  <SelectItem value="portfolio">Portfel</SelectItem>
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
                  <SelectItem value="grade">Qiymət</SelectItem>
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

      {/* Criteria Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Qiymətləndirmə Meyarları
            <span className={`text-sm ${totalWeight === 100 ? 'text-green-600' : 'text-orange-600'}`}>
              Cəmi Çəki: {totalWeight}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criteria.map((criterion, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1">
                <Input
                  placeholder="Meyar adı"
                  value={criterion.name}
                  onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Çəki %"
                  value={criterion.weight}
                  onChange={(e) => updateCriteria(index, 'weight', parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                />
              </div>
              {criteria.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCriteria(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addCriteria}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Meyar Əlavə Et
          </Button>
          
          {totalWeight !== 100 && (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
              Qeyd: Bütün meyarların çəki cəmi 100% olmalıdır.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};