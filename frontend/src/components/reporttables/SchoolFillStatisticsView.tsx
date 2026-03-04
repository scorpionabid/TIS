import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, ChevronDown, ChevronRight, AlertCircle, Download } from 'lucide-react';
import { reportTableService } from '@/services/reportTables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

// Types
interface SchoolFillStats {
  institution_id: number;
  institution_name: string;
  sector_name?: string;
  tables: {
    table_id: number;
    table_title: string;
    row_count: number;
    status: 'draft' | 'submitted' | 'partial' | 'not_started';
    submitted_at?: string;
    approved_count: number;
    pending_count: number;
  }[];
  total_tables: number;
  filled_tables: number;
  not_filled_tables: number;
  total_rows_across_all_tables: number;
}

export function SchoolFillStatisticsView() {
  const [search, setSearch] = useState('');
  const [expandedSchools, setExpandedSchools] = useState<Set<number>>(new Set());
  const [selectedSchools, setSelectedSchools] = useState<Set<number>>(new Set());
  const [showOnlyNotFilled, setShowOnlyNotFilled] = useState(false);

  const { data: schools = [], isLoading, isError } = useQuery<SchoolFillStats[]>({
    queryKey: ['school-fill-statistics'],
    queryFn: async () => {
      // This would be replaced with actual API endpoint
      const response = await reportTableService.getSchoolFillStatistics();
      return response;
    },
    refetchInterval: 30_000,
  });

  const filteredSchools = useMemo(() => {
    let filtered = schools;
    
    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(s => 
        s.institution_name.toLowerCase().includes(q) ||
        s.sector_name?.toLowerCase().includes(q)
      );
    }
    
    // Filter by not filled only
    if (showOnlyNotFilled) {
      filtered = filtered.filter(s => s.not_filled_tables > 0);
    }
    
    return filtered;
  }, [schools, search, showOnlyNotFilled]);

  const toggleSchoolExpand = (schoolId: number) => {
    setExpandedSchools(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const toggleSchoolSelection = (schoolId: number) => {
    setSelectedSchools(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const selectAllNotFilled = () => {
    const notFilledSchoolIds = filteredSchools
      .filter(s => s.not_filled_tables > 0)
      .map(s => s.institution_id);
    setSelectedSchools(new Set(notFilledSchoolIds));
  };

  const handleExport = () => {
    const dataToExport = filteredSchools.filter(s => selectedSchools.has(s.institution_id));
    
    const headers = [
      'Məktəb',
      'Sektor',
      'Cədvəl sayı',
      'Doldurulub',
      'Doldurulmayıb',
      'Ümumi sətir sayı'
    ];
    
    const rows = dataToExport.map(s => [
      s.institution_name,
      s.sector_name || '',
      s.total_tables.toString(),
      s.filled_tables.toString(),
      s.not_filled_tables.toString(),
      s.total_rows_across_all_tables.toString()
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mekteb-doldurma-statistikasi.csv';
    link.click();
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalSchools = schools.length;
    const schoolsWithMissing = schools.filter(s => s.not_filled_tables > 0).length;
    const totalTables = schools.reduce((sum, s) => sum + s.total_tables, 0);
    const totalFilledTables = schools.reduce((sum, s) => sum + s.filled_tables, 0);
    const totalNotFilledTables = schools.reduce((sum, s) => sum + s.not_filled_tables, 0);
    const totalRows = schools.reduce((sum, s) => sum + s.total_rows_across_all_tables, 0);
    
    return {
      totalSchools,
      schoolsWithMissing,
      totalTables,
      totalFilledTables,
      totalNotFilledTables,
      totalRows
    };
  }, [schools]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Məlumatlar yüklənərkən xəta baş verdi.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ümumi məktəb</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.totalSchools}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Doldurmayan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{summaryStats.schoolsWithMissing}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ümumi cədvəl</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.totalTables}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Doldurulub</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{summaryStats.totalFilledTables}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Doldurulmayıb</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{summaryStats.totalNotFilledTables}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ümumi sətir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryStats.totalRows.toLocaleString('az-AZ')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Məktəb axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <Checkbox 
              checked={showOnlyNotFilled} 
              onCheckedChange={(checked) => setShowOnlyNotFilled(checked as boolean)}
            />
            <span>Yalnız doldurmayanları göstər</span>
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllNotFilled}
          >
            Doldurmayanların hamısını seç
          </Button>
          
          {selectedSchools.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Seçilənləri export et ({selectedSchools.size})
            </Button>
          )}
        </div>
      </div>

      {/* Schools List */}
      <div className="space-y-3">
        {filteredSchools.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Məlumat tapılmadı.</AlertDescription>
          </Alert>
        ) : (
          filteredSchools.map((school) => {
            const isExpanded = expandedSchools.has(school.institution_id);
            const isSelected = selectedSchools.has(school.institution_id);
            const hasNotFilled = school.not_filled_tables > 0;
            
            return (
              <div 
                key={school.institution_id} 
                className={`border rounded-lg overflow-hidden ${hasNotFilled ? 'border-red-200 bg-red-50/30' : ''}`}
              >
                {/* School Header */}
                <div 
                  className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSchoolExpand(school.institution_id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSchoolSelection(school.institution_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  
                  <Building2 className="h-5 w-5 text-gray-500" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{school.institution_name}</span>
                      {school.sector_name && (
                        <span className="text-sm text-gray-500">({school.sector_name})</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Cədvəl:</span>
                      <span className="font-medium">{school.total_tables}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-600">Doldurulub:</span>
                      <span className="font-medium text-emerald-600">{school.filled_tables}</span>
                    </div>
                    
                    {hasNotFilled && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {school.not_filled_tables} doldurulmayıb
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Sətir:</span>
                      <span className="font-medium">{school.total_rows_across_all_tables}</span>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Table Details */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium text-gray-500">Cədvəl</th>
                          <th className="text-center py-2 px-2 font-medium text-gray-500">Status</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-500">Sətir sayı</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-500">Təsdiqlənib</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-500">Gözləyir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {school.tables.map((table) => (
                          <tr key={table.table_id} className="border-b last:border-0">
                            <td className="py-2 px-2">{table.table_title}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge 
                                variant={table.status === 'submitted' ? 'default' : table.status === 'draft' ? 'secondary' : 'outline'}
                                className={
                                  table.status === 'not_started' ? 'bg-red-100 text-red-800' :
                                  table.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' :
                                  table.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {table.status === 'submitted' ? 'Təqdim edilib' :
                                 table.status === 'draft' ? 'Qaralama' :
                                 table.status === 'partial' ? 'Qismən' :
                                 'Başlanmayıb'}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right">{table.row_count}</td>
                            <td className="py-2 px-2 text-right text-emerald-600">{table.approved_count}</td>
                            <td className="py-2 px-2 text-right text-amber-600">{table.pending_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SchoolFillStatisticsView;
