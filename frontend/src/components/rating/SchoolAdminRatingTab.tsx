import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building2, TrendingUp, Award, Search, Save, Calculator } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { RatingItem } from '@/types/rating';
import { logger } from '@/utils/logger';

interface SchoolAdminRatingTabProps {
  institutionId?: number;
  academicYearId?: number;
}

interface EditingCell {
  itemId: number;
  field: 'task_score' | 'survey_score' | 'manual_score';
}

interface PendingChanges {
  [itemId: number]: Partial<Pick<RatingItem, 'task_score' | 'survey_score' | 'manual_score'>>;
}

export const SchoolAdminRatingTab: React.FC<SchoolAdminRatingTabProps> = ({
  institutionId,
  academicYearId
}) => {
  const [data, setData] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [period, institutionId, academicYearId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ratingService.getAllRatings({
        period,
        institution_id: institutionId,
        academic_year_id: academicYearId,
        user_role: 'schooladmin'
      });
      console.log('[SchoolAdminRating] API response:', response);
      // Handle multiple response structures
      let items: RatingItem[] = [];
      if (Array.isArray(response?.data)) {
        items = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        items = response.data.data;
      } else if (Array.isArray(response)) {
        items = response;
      }
      console.log('[SchoolAdminRating] Extracted items:', items.length);
      setData(items);
    } catch (error) {
      logger.error('Error loading school admin ratings:', { error });
    } finally {
      setLoading(false);
    }
  };

  const calculateRating = async (userId: number) => {
    try {
      await ratingService.calculate(userId, {
        academic_year_id: academicYearId,
        period
      });
      loadData();
    } catch (error) {
      logger.error('Error calculating rating:', { error });
    }
  };

  const calculateAllRatings = async () => {
    try {
      await ratingService.calculateAll({
        academic_year_id: academicYearId,
        period
      });
      loadData();
    } catch (error) {
      logger.error('Error calculating all ratings:', { error });
    }
  };

  const handleCellClick = (itemId: number, field: EditingCell['field']) => {
    setEditingCell({ itemId, field });
  };

  const handleCellChange = (itemId: number, field: EditingCell['field'], value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(100, Math.max(0, numValue));

    setPendingChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: clampedValue
      }
    }));

    setData(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: clampedValue } : item
    ));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const saveChanges = async (itemId: number) => {
    const changes = pendingChanges[itemId];
    if (!changes) return;

    try {
      setSavingId(itemId);
      await ratingService.updateRating(itemId, changes);
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      loadData();
    } catch (error) {
      logger.error('Error saving rating:', { error });
    } finally {
      setSavingId(null);
    }
  };

  const getRatingBadge = (score: number) => {
    if (score >= 90) return { text: 'Əla', variant: 'default' as const };
    if (score >= 80) return { text: 'Yaxşı', variant: 'secondary' as const };
    if (score >= 70) return { text: 'Orta', variant: 'outline' as const };
    if (score >= 60) return { text: 'Zəif', variant: 'destructive' as const };
    return { text: 'Çox Zəif', variant: 'destructive' as const };
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.institution?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Direktor axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
        </div>

        <Button onClick={calculateAllRatings} variant="default" size="sm">
          <Calculator className="h-4 w-4 mr-2" />
          Hamısını Hesabla
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ümumi Direktor</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">Məktəb rəhbəri</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Reytinq</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0
                ? (filteredData.reduce((sum, item) => sum + (item.overall_score || 0), 0) / filteredData.length).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">Ümumi bal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ən Yüksək</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0
                ? Math.max(...filteredData.map(item => item.overall_score || 0)).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">Maksimum bal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hesablanmış</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.filter(item => item.status === 'published').length}
            </div>
            <p className="text-xs text-muted-foreground">Aktiv reytinq</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direktor Reytinq Cədvəli</CardTitle>
          <CardDescription>
            Bal sütunlarına klikləyərək birbaşa redaktə edə bilərsiniz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Direktor</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Müəssisə</th>
                  <th className="text-center p-3 font-medium">Task</th>
                  <th className="text-center p-3 font-medium">Survey</th>
                  <th className="text-center p-3 font-medium">Manual</th>
                  <th className="text-center p-3 font-medium">Ümumi</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const badge = getRatingBadge(item.overall_score || 0);
                  const hasPending = !!pendingChanges[item.id];
                  const isSaving = savingId === item.id;

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      {/* Direktor */}
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="font-medium">{item.user?.full_name || 'Bilinməyən'}</div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3 text-sm text-gray-600">
                        {item.user?.email || '-'}
                      </td>

                      {/* Müəssisə */}
                      <td className="p-3 text-sm text-gray-600">
                        {item.institution?.name || '-'}
                      </td>

                      {/* Task Score - Inline Edit */}
                      <td className="p-3 text-center">
                        {editingCell?.itemId === item.id && editingCell?.field === 'task_score' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.task_score ?? 0}
                            onChange={(e) => handleCellChange(item.id, 'task_score', e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-20 text-center border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => handleCellClick(item.id, 'task_score')}
                            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded font-medium"
                            title="Klikləyin redaktə üçün"
                          >
                            {item.task_score?.toFixed(1) || '0.0'}
                          </span>
                        )}
                      </td>

                      {/* Survey Score - Inline Edit */}
                      <td className="p-3 text-center">
                        {editingCell?.itemId === item.id && editingCell?.field === 'survey_score' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.survey_score ?? 0}
                            onChange={(e) => handleCellChange(item.id, 'survey_score', e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-20 text-center border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => handleCellClick(item.id, 'survey_score')}
                            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded font-medium"
                            title="Klikləyin redaktə üçün"
                          >
                            {item.survey_score?.toFixed(1) || '0.0'}
                          </span>
                        )}
                      </td>

                      {/* Manual Score - Inline Edit */}
                      <td className="p-3 text-center">
                        {editingCell?.itemId === item.id && editingCell?.field === 'manual_score' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.manual_score ?? 0}
                            onChange={(e) => handleCellChange(item.id, 'manual_score', e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-20 text-center border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => handleCellClick(item.id, 'manual_score')}
                            className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded font-medium"
                            title="Klikləyin redaktə üçün"
                          >
                            {item.manual_score?.toFixed(1) || '0.0'}
                          </span>
                        )}
                      </td>

                      {/* Ümumi bal */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold text-lg">
                            {item.overall_score?.toFixed(1) || '0.0'}
                          </span>
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.text}
                          </Badge>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge
                          variant={item.status === 'published' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.status === 'published' ? 'Aktiv' : item.status === 'archived' ? 'Arxiv' : 'Qaralama'}
                        </Badge>
                      </td>

                      {/* Əməliyyat */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {hasPending && (
                            <Button
                              onClick={() => saveChanges(item.id)}
                              variant="default"
                              size="sm"
                              disabled={isSaving}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {isSaving ? '...' : 'Saxla'}
                            </Button>
                          )}
                          <Button
                            onClick={() => calculateRating(item.user_id)}
                            variant="outline"
                            size="sm"
                          >
                            Hesabla
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Məktəb rəhbəri tapılmadı</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Axtarış şərtlərinə uyğun direktor tapılmadı.'
                    : 'Bu dövr üçün heç bir məktəb rəhbəri reytinqi mövcud deyil.'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
