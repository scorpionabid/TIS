import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { LazyWrapper } from "@/components/common/LazyWrapper";
import { useSearchParams } from 'react-router-dom';

const SurveyList             = React.lazy(() => import("./surveys/SurveyList"));
const Approvals              = React.lazy(() => import("./Approvals"));
const UnifiedSurveyDashboard = React.lazy(() => import("./my-surveys/UnifiedSurveyDashboard"));
const ManagerSurveyDashboard = React.lazy(() => import("./surveys/ManagerSurveyDashboard"));
const MyResponses            = React.lazy(() => import("./my-surveys/MyResponses"));

const TAB_TRIGGER_CLASS =
  'relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-[hsl(220_85%_25%)] data-[state=active]:text-[hsl(220_85%_25%)] data-[state=active]:shadow-none hover:text-[hsl(220_85%_25%)]';

// Role groups
const MANAGER_ROLES    = ['superadmin', 'regionadmin', 'sektoradmin', 'admin'];
const OPERATOR_ROLES   = ['regionoperator', 'operator'];
const SCHOOL_ROLES     = ['schooladmin', 'məktəbadmin', 'preschooladmin'];
const STAFF_ROLES      = ['müəllim', 'muavin', 'ubr', 'tesarrufat', 'psixoloq'];

export default function SurveysPage() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  useModuleAccess('surveys');
  useModuleAccess('approvals');

  const roleRaw        = (currentUser?.role || '').toLowerCase();
  const isSchoolAdmin  = SCHOOL_ROLES.includes(roleRaw);
  const isManager      = MANAGER_ROLES.includes(roleRaw);
  const isOperator     = OPERATOR_ROLES.includes(roleRaw);
  const isStaff        = STAFF_ROLES.includes(roleRaw);

  const activeTab    = searchParams.get('tab') || 'list';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  if (!currentUser) return null;

  // ─── SchoolAdmin: master-detail sorğu paneli ─────────────────────────────
  if (isSchoolAdmin) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-4 pb-4">
        <LazyWrapper>
          <UnifiedSurveyDashboard />
        </LazyWrapper>
      </div>
    );
  }

  // ─── Manager / Operator: idarəetmə paneli ────────────────────────────────
  if (isManager || isOperator) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-4 pb-4">
        <LazyWrapper>
          <ManagerSurveyDashboard readonly={isOperator} />
        </LazyWrapper>
      </div>
    );
  }

  // ─── Staff / müəllim: sadə gözləyən sorğular siyahısı ───────────────────
  if (isStaff) {
    return (
      <div className="px-2 sm:px-3 lg:px-4 pt-4 pb-4">
        <LazyWrapper>
          <UnifiedSurveyDashboard />
        </LazyWrapper>
      </div>
    );
  }

  // ─── Fallback: tab-based view ─────────────────────────────────────────────
  return (
    <div className="px-2 sm:px-3 lg:px-4 pt-0 pb-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="list" className={TAB_TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5" />
              Sorğu Siyahısı
            </div>
          </TabsTrigger>
          <TabsTrigger value="approvals" className={TAB_TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Təsdiq Paneli
            </div>
          </TabsTrigger>
          <TabsTrigger value="my-responses" className={TAB_TRIGGER_CLASS}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mənim Cavablarım
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <LazyWrapper><SurveyList /></LazyWrapper>
        </TabsContent>
        <TabsContent value="approvals" className="mt-0">
          <LazyWrapper><Approvals /></LazyWrapper>
        </TabsContent>
        <TabsContent value="my-responses" className="mt-0">
          <LazyWrapper><MyResponses /></LazyWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
}
