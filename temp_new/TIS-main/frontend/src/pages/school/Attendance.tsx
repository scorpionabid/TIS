import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { School, BarChart3, Trophy } from 'lucide-react';
import BulkAttendanceEntry from './BulkAttendanceEntry';
import AttendanceReports from '../AttendanceReports';
import SchoolAttendanceReports from './SchoolAttendanceReports';

type AttendanceTab = 'entry' | 'reports' | 'schoolGrade' | 'rankings';

const SchoolAttendance: React.FC = () => {
  const { hasPermission, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canViewReports = hasPermission('attendance.read');
  const canManageEntry = hasPermission('attendance.create') || hasPermission('attendance.update');

  const allowedTabs = useMemo(() => {
    const tabs: AttendanceTab[] = [];
    if (canManageEntry) tabs.push('entry');
    if (canViewReports) {
      tabs.push('reports');
      tabs.push('schoolGrade');
      tabs.push('rankings');
    }
    return tabs;
  }, [canViewReports, canManageEntry]);

  const requestedTab = (searchParams.get('tab') as AttendanceTab | null) ?? null;

  const defaultTab: AttendanceTab = useMemo(() => {
    if (allowedTabs.includes('entry')) return 'entry';
    if (allowedTabs.includes('reports')) return 'reports';
    return 'entry';
  }, [allowedTabs]);

  const activeTab: AttendanceTab = useMemo(() => {
    if (requestedTab && allowedTabs.includes(requestedTab)) return requestedTab;
    return defaultTab;
  }, [requestedTab, allowedTabs, defaultTab]);

  useEffect(() => {
    if (!allowedTabs.length) return;

    if (!requestedTab || requestedTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [allowedTabs.length, requestedTab, activeTab, searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    const tab = value as AttendanceTab;
    if (!allowedTabs.includes(tab)) return;

    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const institutionChipText = useMemo(() => {
    const regionOrDept = currentUser?.region?.name || currentUser?.department?.name || '';
    const institution = currentUser?.institution?.name || '';

    if (regionOrDept && institution) return `${regionOrDept} · ${institution}`;
    return regionOrDept || institution;
  }, [currentUser?.department?.name, currentUser?.institution?.name, currentUser?.region?.name]);

  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4 space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1 gap-1 h-auto">
            {allowedTabs.includes('entry') && (
              <TabsTrigger
                value="entry"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                Davamiyyət Qeydiyyatı
              </TabsTrigger>
            )}
            {allowedTabs.includes('reports') && (
              <TabsTrigger
                value="reports"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                Davamiyyət hesabatı
              </TabsTrigger>
            )}
            {allowedTabs.includes('schoolGrade') && (
              <TabsTrigger
                value="schoolGrade"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Siniflər
              </TabsTrigger>
            )}
            {allowedTabs.includes('rankings') && (
              <TabsTrigger
                value="rankings"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:bg-white/60 hover:text-slate-900 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200"
              >
                <Trophy className="h-4 w-4 mr-1" />
                Reytinq
              </TabsTrigger>
            )}
          </TabsList>

          {institutionChipText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-xl border border-blue-100">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5c6bc0] to-[#7c83ec] flex items-center justify-center shadow-sm">
                <School className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium text-gray-700">{institutionChipText}</span>
            </div>
          )}
        </div>

        {allowedTabs.includes('reports') && (
          <TabsContent value="reports">
            <AttendanceReports embedded />
          </TabsContent>
        )}

        {allowedTabs.includes('schoolGrade') && (
          <TabsContent value="schoolGrade">
            <SchoolAttendanceReports activeTab="schoolGrade" />
          </TabsContent>
        )}

        {allowedTabs.includes('rankings') && (
          <TabsContent value="rankings">
            <SchoolAttendanceReports activeTab="rankings" />
          </TabsContent>
        )}

        {allowedTabs.includes('entry') && (
          <TabsContent value="entry">
            <BulkAttendanceEntry />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SchoolAttendance;
