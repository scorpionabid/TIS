/**
 * TeacherRatingConfiguration Page
 *
 * Rating system configuration page (SuperAdmin only)
 * Features: Weight adjustment, bonus rules, system settings
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ConfigurationWeightSlider } from '../../components/teacher-rating';
import { ArrowLeft, Settings, Save, AlertTriangle, Info } from 'lucide-react';
import { configurationService } from '../../services/teacherRating';
import { useToast } from '../../hooks/use-toast';

export default function TeacherRatingConfiguration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: configData } = useQuery({
    queryKey: ['rating-configuration'],
    queryFn: configurationService.getAll,
  });

  const configurations = configData?.data || [];
  const weightConfig = configurations.find((c: any) => c.type === 'component_weights');

  // Mutations
  const updateWeightsMutation = useMutation({
    mutationFn: (weights: Record<string, number>) =>
      configurationService.update(weightConfig?.id, { weights }),
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Konfiqurasiya yeniləndi',
      });
      queryClient.invalidateQueries({ queryKey: ['rating-configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Yeniləmə zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: configurationService.reset,
    onSuccess: () => {
      toast({
        title: 'Uğurlu',
        description: 'Konfiqurasiya sıfırlandı',
      });
      queryClient.invalidateQueries({ queryKey: ['rating-configuration'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Xəta',
        description: error.response?.data?.message || 'Sıfırlama zamanı xəta baş verdi',
        variant: 'destructive',
      });
    },
  });

  const handleWeightsSave = (weights: Record<string, number>) => {
    updateWeightsMutation.mutate(weights);
  };

  const handleReset = () => {
    if (confirm('Bütün konfiqurasiyanı default dəyərlərə sıfırlamaq istədiyinizə əminsiniz?')) {
      resetMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/regionadmin/teacher-rating')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Sistem Konfiqurasiyası</h1>
            <p className="text-muted-foreground mt-1">
              Reytinq sisteminin parametrlərini idarə edin
            </p>
          </div>
        </div>

        <Button variant="destructive" onClick={handleReset} disabled={resetMutation.isPending}>
          {resetMutation.isPending ? 'Sıfırlanır...' : 'Default Dəyərlərə Sıfırla'}
        </Button>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Diqqət:</strong> Konfiqurasiya dəyişiklikləri bütün gələcək reytinq
          hesablamalarına təsir edəcək. Mövcud hesablanmış reytinqlər yenidən hesablanmalıdır.
        </AlertDescription>
      </Alert>

      {/* Configuration Tabs */}
      <Tabs defaultValue="weights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="weights">Komponent Çəkiləri</TabsTrigger>
          <TabsTrigger value="bonus">Bonus Qaydaları</TabsTrigger>
          <TabsTrigger value="year-weights">İl Çəkiləri</TabsTrigger>
          <TabsTrigger value="general">Ümumi Parametrlər</TabsTrigger>
        </TabsList>

        {/* Component Weights Tab */}
        <TabsContent value="weights">
          <ConfigurationWeightSlider
            initialWeights={weightConfig?.weights}
            onSave={handleWeightsSave}
          />
        </TabsContent>

        {/* Bonus Rules Tab */}
        <TabsContent value="bonus">
          <Card>
            <CardHeader>
              <CardTitle>Artım Bonusu Qaydaları</CardTitle>
              <CardDescription>
                İllik artım göstərən müəllimlər üçün bonus bal qaydaları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Qeyd:</strong> Bu funksionallıq hazırda inkişaf mərhələsindədir və tezliklə
                  əlavə ediləcək.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Cari Qaydalar</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>5%-dən çox artım: +5 bonus bal</li>
                    <li>10%-dən çox artım: +10 bonus bal</li>
                    <li>Maksimum bonus: 10 bal</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Year Weights Tab */}
        <TabsContent value="year-weights">
          <Card>
            <CardHeader>
              <CardTitle>Tədris İli Çəkiləri</CardTitle>
              <CardDescription>
                Hər tədris ilinin reytinq hesablamasında çəkisi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Qeyd:</strong> Bu funksionallıq hazırda inkişaf mərhələsindədir və tezliklə
                  əlavə ediləcək.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Cari Çəkilər</h4>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">25%</div>
                      <div className="text-sm text-muted-foreground mt-1">2022-2023</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">30%</div>
                      <div className="text-sm text-muted-foreground mt-1">2023-2024</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">45%</div>
                      <div className="text-sm text-muted-foreground mt-1">2024-2025</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Ümumi Parametrlər</CardTitle>
              <CardDescription>Sistem ümumi ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Qeyd:</strong> Bu funksionallıq hazırda inkişaf mərhələsindədir və tezliklə
                  əlavə ediləcək.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Sistem Parametrləri</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Minimum reytinq balı: 0</li>
                    <li>Maksimum reytinq balı: 100</li>
                    <li>Avtomatik hesablama: Deaktiv</li>
                    <li>Hesablama tezliyi: Manual</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Konfiqurasiya Haqqında</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Reytinq sistemi konfiqurasiyası yalnız SuperAdmin səlahiyyətinə malik istifadəçilər
            tərəfindən dəyişdirilə bilər.
          </p>
          <p>
            Dəyişikliklər etdikdən sonra bütün müəllimlərin reytinqlərini yenidən hesablamağı
            tövsiyə edirik ki, yeni konfiqurasiya tətbiq olunsun.
          </p>
          <p>
            Konfiqurasiya dəyişiklikləri sistem audit log-da qeyd edilir və izlənilə bilər.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
