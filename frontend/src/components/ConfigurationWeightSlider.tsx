/**
 * ConfigurationWeightSlider Component
 *
 * Weight adjustment slider for rating configuration
 * Allows SuperAdmin to adjust component weights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BookOpen,
  Eye,
  Trophy,
  ClipboardCheck,
  Award,
  Medal,
  AlertTriangle,
  RotateCcw,
  Save,
} from 'lucide-react';

interface ComponentWeight {
  component: string;
  label: string;
  icon: React.ElementType;
  weight: number;
  min: number;
  max: number;
  color: string;
}

interface ConfigurationWeightSliderProps {
  initialWeights?: Record<string, number>;
  onSave?: (weights: Record<string, number>) => void;
  readOnly?: boolean;
}

const DEFAULT_WEIGHTS = {
  academic: 30,
  lesson_observation: 20,
  olympiad: 15,
  assessment: 15,
  certificate: 10,
  award: 10,
};

const COMPONENT_CONFIG: ComponentWeight[] = [
  {
    component: 'academic',
    label: 'Akademik Nəticələr',
    icon: BookOpen,
    weight: 30,
    min: 0,
    max: 50,
    color: 'blue',
  },
  {
    component: 'lesson_observation',
    label: 'Dərs Müşahidəsi',
    icon: Eye,
    weight: 20,
    min: 0,
    max: 40,
    color: 'green',
  },
  {
    component: 'olympiad',
    label: 'Olimpiada Nəticələri',
    icon: Trophy,
    weight: 15,
    min: 0,
    max: 30,
    color: 'amber',
  },
  {
    component: 'assessment',
    label: 'Qiymətləndirmə',
    icon: ClipboardCheck,
    weight: 15,
    min: 0,
    max: 30,
    color: 'purple',
  },
  {
    component: 'certificate',
    label: 'Sertifikatlar',
    icon: Award,
    weight: 10,
    min: 0,
    max: 20,
    color: 'pink',
  },
  {
    component: 'award',
    label: 'Mükafatlar',
    icon: Medal,
    weight: 10,
    min: 0,
    max: 20,
    color: 'red',
  },
];

export function ConfigurationWeightSlider({
  initialWeights,
  onSave,
  readOnly = false,
}: ConfigurationWeightSliderProps) {
  const [weights, setWeights] = useState<Record<string, number>>(
    initialWeights || DEFAULT_WEIGHTS
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialWeights) {
      setWeights(initialWeights);
    }
  }, [initialWeights]);

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isValid = totalWeight === 100;

  const handleWeightChange = (component: string, value: number[]) => {
    setWeights((prev) => ({
      ...prev,
      [component]: value[0],
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setHasChanges(false);
  };

  const handleSave = () => {
    if (isValid && onSave) {
      onSave(weights);
      setHasChanges(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      amber: 'text-amber-600',
      purple: 'text-purple-600',
      pink: 'text-pink-600',
      red: 'text-red-600',
    };
    return colorMap[color] || 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Komponent Çəkiləri</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isValid ? 'default' : 'destructive'}>
              Ümumi: {totalWeight}%
            </Badge>
            {!readOnly && hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Yadda saxlanmayıb
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Alert */}
        {!isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Komponent çəkilərinin cəmi 100% olmalıdır. Hazırki cəm: {totalWeight}%
            </AlertDescription>
          </Alert>
        )}

        {/* Weight Sliders */}
        <div className="space-y-6">
          {COMPONENT_CONFIG.map((config) => {
            const Icon = config.icon;
            const currentWeight = weights[config.component];
            const percentage = (currentWeight / 100) * 100;

            return (
              <div key={config.component} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${getColorClasses(config.color)}`} />
                    <Label className="text-sm font-medium">{config.label}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getColorClasses(config.color)}`}>
                      {currentWeight}
                    </span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Slider
                    value={[currentWeight]}
                    onValueChange={(value) => handleWeightChange(config.component, value)}
                    min={config.min}
                    max={config.max}
                    step={1}
                    disabled={readOnly}
                    className="cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Min: {config.min}%</span>
                    <span>
                      Hal-hazırda: {currentWeight}% ({percentage.toFixed(0)}% of total)
                    </span>
                    <span>Max: {config.max}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Visual */}
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Ümumi Yoxlama</span>
              <span className={isValid ? 'text-green-600' : 'text-red-600'}>
                {totalWeight} / 100%
              </span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden flex">
              {COMPONENT_CONFIG.map((config) => {
                const currentWeight = weights[config.component];
                const width = (currentWeight / 100) * 100;
                if (width === 0) return null;

                return (
                  <div
                    key={config.component}
                    className={`bg-${config.color}-500 transition-all`}
                    style={{ width: `${width}%` }}
                    title={`${config.label}: ${currentWeight}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {COMPONENT_CONFIG.map((config) => {
              const Icon = config.icon;
              return (
                <div key={config.component} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded bg-${config.color}-500`} />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="font-medium ml-auto">{weights[config.component]}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Sıfırla
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!isValid || !hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Yadda Saxla
            </Button>
          </div>
        )}

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Qeyd:</strong> Çəkilərin cəmi mütləq 100% olmalıdır. Hər komponentin minimum
            və maksimum limitləri mövcuddur. Dəyişikliklər bütün gələcək hesablamalara təsir
            edəcək.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
