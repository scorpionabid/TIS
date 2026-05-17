import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, AlertTriangle } from 'lucide-react';

interface CriteriaEntry {
  name: string;
  weight: number;
}

interface AssessmentCriteriaFormProps {
  criteriaEntries: CriteriaEntry[];
  newCriteriaName: string;
  setNewCriteriaName: (value: string) => void;
  newCriteriaWeight: number;
  setNewCriteriaWeight: (value: number) => void;
  onAddCriteria: () => void;
  onRemoveCriteria: (index: number) => void;
  onUpdateCriteriaWeight?: (index: number, weight: number) => void;
}

export function AssessmentCriteriaForm({
  criteriaEntries,
  newCriteriaName,
  setNewCriteriaName,
  newCriteriaWeight,
  setNewCriteriaWeight,
  onAddCriteria,
  onRemoveCriteria,
  onUpdateCriteriaWeight,
}: AssessmentCriteriaFormProps) {
  const getTotalWeight = () => {
    return criteriaEntries.reduce((sum, entry) => sum + entry.weight, 0);
  };

  const totalWeight = getTotalWeight();
  const isOverWeight = totalWeight > 100;
  const isValid = newCriteriaName.trim() && newCriteriaWeight > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Qiymətləndirmə Meyarları</span>
          <Badge variant={isOverWeight ? 'destructive' : totalWeight === 100 ? 'default' : 'secondary'}>
            {totalWeight}% / 100%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Criteria */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="criteria-name" className="text-sm">
              Meyar Adı
            </Label>
            <Input
              id="criteria-name"
              value={newCriteriaName}
              onChange={(e) => setNewCriteriaName(e.target.value)}
              placeholder="Məsələn: Tədris keyfiyyəti"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label htmlFor="criteria-weight" className="text-sm">
              Çəki (%)
            </Label>
            <Input
              id="criteria-weight"
              type="number"
              value={newCriteriaWeight || ''}
              onChange={(e) => setNewCriteriaWeight(parseInt(e.target.value) || 0)}
              placeholder="0"
              min="1"
              max="100"
            />
          </div>
          <Button
            onClick={onAddCriteria}
            disabled={!isValid}
            size="sm"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Əlavə et
          </Button>
        </div>

        {/* Weight Warning */}
        {isOverWeight && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Meyarların ümumi çəkisi 100%-dən çox ola bilməz
            </span>
          </div>
        )}

        {/* Existing Criteria */}
        {criteriaEntries.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mövcud Meyarlar</Label>
            <div className="space-y-2">
              {criteriaEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{entry.name}</span>
                    <Badge variant="outline">{entry.weight}%</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {onUpdateCriteriaWeight && (
                      <Input
                        type="number"
                        value={entry.weight}
                        onChange={(e) => onUpdateCriteriaWeight(index, parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        min="1"
                        max="100"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveCriteria(index)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weight Summary */}
        {criteriaEntries.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Ümumi çəki: <span className={`font-medium ${isOverWeight ? 'text-destructive' : ''}`}>
                {totalWeight}%
              </span>
              {totalWeight < 100 && (
                <span className="ml-2">
                  (qalan: {100 - totalWeight}%)
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}