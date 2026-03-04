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
  Building2,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportTable } from "@/types/reportTable";
import { reportTableService } from "@/services/reportTables";

// ─── Sub-components ─────────────────────────────────────────────────────────

import {
  AnalyticsOverview,
  AnalyticsInstitutions,
  AnalyticsNonFillingSchools,
} from "./table-analytics";

interface TableAnalyticsProps {
  table: ReportTable;
  trigger?: React.ReactNode;
}

export function TableAnalytics({ table, trigger }: TableAnalyticsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Use new efficient analytics endpoint
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["table-analytics-summary", table.id],
    queryFn: () => reportTableService.getAnalyticsSummary(table.id),
    enabled: open,
  });

  const handleExport = () => {
    if (!analytics) return;

    const report = {
      table: table.title,
      generatedAt: analytics.generated_at,
      summary: analytics.summary,
      sectors: analytics.sectors,
      nonFillingSchools: analytics.non_filling_schools,
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
          <Button variant="outline" size="sm" className="gap-1" data-testid="analytics-button">
            <BarChart3 className="h-4 w-4" />
            Analitika
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" data-testid="analytics-dialog">
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
          <TabsList className="grid w-full grid-cols-3" data-testid="analytics-tabs">
            <TabsTrigger value="overview" className="gap-1" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" /> Ümumi
            </TabsTrigger>
            <TabsTrigger value="institutions" className="gap-1" data-testid="tab-institutions">
              <Building2 className="h-4 w-4" /> Müəssisələr
            </TabsTrigger>
            <TabsTrigger value="non-filling" className="gap-1" data-testid="tab-non-filling">
              <AlertCircle className="h-4 w-4 text-red-500" /> Doldurmayanlar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : analytics ? (
              <>
                <TabsContent value="overview" className="mt-0">
                  <AnalyticsOverview analytics={analytics} />
                </TabsContent>

                <TabsContent value="institutions" className="mt-0">
                  <AnalyticsInstitutions analytics={analytics} />
                </TabsContent>

                <TabsContent value="non-filling" className="mt-0">
                  <AnalyticsNonFillingSchools analytics={analytics} />
                </TabsContent>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Analitik məlumatlar əldə edilə bilmədi
              </div>
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
