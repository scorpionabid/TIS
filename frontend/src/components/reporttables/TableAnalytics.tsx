/**
 * TableAnalytics - Analytics and charts for report table data
 * REFACTORED: Broken down into smaller sub-components for better maintainability
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Loader2,
  BarChart,
  Activity,
  Building2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportTable } from "@/types/reportTable";
import { reportTableService } from "@/services/reportTables";

// ─── Sub-components ─────────────────────────────────────────────────────────

import {
  useTableAnalytics,
  AnalyticsOverview,
  AnalyticsColumns,
  AnalyticsInstitutions,
} from "./table-analytics";

interface TableAnalyticsProps {
  table: ReportTable;
  trigger?: React.ReactNode;
}

export function TableAnalytics({ table, trigger }: TableAnalyticsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: responsesData, isLoading } = useQuery({
    queryKey: ["table-analytics", table.id],
    queryFn: () => reportTableService.getAllResponses(table.id),
    enabled: open,
  });

  const responses = responsesData || [];
  const analytics = useTableAnalytics({ responses, table });

  const handleExport = () => {
    if (!analytics) return;

    const report = {
      table: table.title,
      generatedAt: new Date().toISOString(),
      summary: {
        totalInstitutions: analytics.institutionCount,
        targetInstitutions: analytics.targetCount,
        participationRate: `${analytics.participationRate.toFixed(1)}%`,
        totalResponses: analytics.submitted + analytics.draft,
        submitted: analytics.submitted,
        draft: analytics.draft,
        totalRows: analytics.totalRows,
      },
      columnStats: analytics.columnStats,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${table.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Analitik hesabat yükləndi");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            Analitika
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cədvəl analitikası
            <span className="text-sm font-normal text-gray-500">
              ({table.title})
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-1">
              <Activity className="h-4 w-4" /> Ümumi
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-1">
              <BarChart className="h-4 w-4" /> Sütunlar
            </TabsTrigger>
            <TabsTrigger value="institutions" className="gap-1">
              <Building2 className="h-4 w-4" /> Müəssisələr
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Hələ kifayət qədər məlumat yoxdur</p>
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="mt-0">
                  <AnalyticsOverview analytics={analytics} table={table} />
                </TabsContent>

                <TabsContent value="columns" className="mt-0">
                  <AnalyticsColumns analytics={analytics} />
                </TabsContent>

                <TabsContent value="institutions" className="mt-0">
                  <AnalyticsInstitutions responses={responses} />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Bağla
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={!analytics || isLoading}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Hesabat yüklə
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TableAnalytics;
