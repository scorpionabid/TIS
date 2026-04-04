import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ArrowUpDown } from 'lucide-react';

const numberFormatter = new Intl.NumberFormat('az');

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

interface School {
  school_id: number;
  name: string;
  reported_classes: number;
  total_students: number;
  reported_days: number;
  expected_school_days: number;
  average_attendance_rate: number;
  uniform_compliance_rate?: number;
  warnings?: string[];
}

interface SchoolsAttendanceTableProps {
  schools: School[];
  processedSchools: School[];
  loading: boolean;
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onSort: (key: string) => void;
  onSchoolClick: (id: string) => void;
  regionName: string;
}

export function SchoolsAttendanceTable({
  schools,
  processedSchools,
  loading,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSort,
  onSchoolClick,
  regionName
}: SchoolsAttendanceTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
        <div>
          <CardTitle>Məktəblər</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {schools.length} məktəbdən {processedSchools.length}-i göstərilir
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status üzrə filtr" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="missing">Hesabat yoxdur</SelectItem>
              <SelectItem value="low">Aşağı davamiyyət</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Məktəb axtar..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-[150px]"
                    onClick={() => onSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Məktəb
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => onSort('total_students')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Şagird
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => onSort('reported_days')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Hesabat günləri
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => onSort('average_attendance_rate')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Orta davamiyyət
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                    onClick={() => onSort('uniform_compliance_rate')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Məktəbli forma
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Filtrə uyğun məktəb tapılmadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedSchools.map((school) => {
                    const warnings = school.warnings || [];
                    return (
                      <TableRow 
                        key={school.school_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onSchoolClick(String(school.school_id))}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium text-sm">{school.name}</div>
                          <p className="text-[10px] text-muted-foreground">
                            {school.reported_classes} sinif
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {regionName}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-medium whitespace-nowrap">
                          <div className="text-slate-800 text-sm">
                            {numberFormatter.format(Math.round((school.total_students * (school.average_attendance_rate ?? 0)) / 100))}
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-[10px] text-muted-foreground font-normal">{numberFormatter.format(school.total_students)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm whitespace-nowrap">
                          {school.reported_days}/{school.expected_school_days}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm whitespace-nowrap">
                          {formatPercent(school.average_attendance_rate)}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-sm whitespace-nowrap">
                          {formatPercent(school.uniform_compliance_rate)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {warnings.length === 0 ? (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] h-5">
                              Normal
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap justify-center gap-1">
                              {warnings.map((warning) => (
                                <Badge key={warning} variant="destructive" className="text-[10px] h-5 py-0 px-1.5">
                                  {warning === 'reports_missing' ? 'Hesabat yoxdur' : 'Aşağı davamiyyət'}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
