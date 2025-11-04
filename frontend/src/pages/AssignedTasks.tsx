import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, CheckCircle, Filter, Search, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { taskService, Task, UpdateTaskData } from "@/services/tasks";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
} from "@/components/tasks/config/taskFormFields";
import { useToast } from "@/hooks/use-toast";

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusBadgeVariant = (status: string) => {
  const variants: Record<string, "secondary" | "default" | "outline" | "success" | "destructive"> = {
    pending: "secondary",
    in_progress: "default",
    review: "outline",
    completed: "success",
    cancelled: "destructive",
  };
  return variants[status] || "secondary";
};

const getPriorityBadgeVariant = (priority: string) => {
  const variants: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
    low: "outline",
    medium: "secondary",
    high: "default",
    urgent: "destructive",
  };
  return variants[priority] || "secondary";
};

const AssignedTasks = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"region" | "sector">("region");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionTask, setDecisionTask] = useState<Task | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);

  const hasAccess = currentUser
    ? ["superadmin", "regionadmin", "sektoradmin", "schooladmin"].includes(currentUser.role)
    : false;

  const availableTabs = useMemo(
    () =>
      [
        { value: "region" as const, label: "Regional Tapşırıqlar" },
        { value: "sector" as const, label: "Sektor Tapşırıqları" },
      ] as Array<{ value: "region" | "sector"; label: string }>,
    []
  );

  useEffect(() => {
    if (availableTabs.some((tab) => tab.value === activeTab)) {
      return;
    }

    setActiveTab("region");
  }, [activeTab, availableTabs]);

  const regionTasksQuery = useQuery({
    queryKey: ["assigned-tasks", "region", currentUser?.id],
    queryFn: () => taskService.getAssignedToMe({ origin_scope: "region" }),
    enabled: hasAccess,
  });

  const sectorTasksQuery = useQuery({
    queryKey: ["assigned-tasks", "sector", currentUser?.id],
    queryFn: () => taskService.getAssignedToMe({ origin_scope: "sector" }),
    enabled: hasAccess,
  });

  const activeQuery = activeTab === "region" ? regionTasksQuery : sectorTasksQuery;
  const isLoading = activeQuery.isLoading || activeQuery.isFetching;
  const error = activeQuery.error as Error | null | undefined;
  const tasks = Array.isArray(activeQuery.data?.data) ? (activeQuery.data?.data as Task[]) : [];

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchTerm.trim().length > 0) {
      const normalized = searchTerm.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(normalized) ||
          (task.description && task.description.toLowerCase().includes(normalized)) ||
          (task.creator?.name && task.creator.name.toLowerCase().includes(normalized))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((task) => task.status === statusFilter);
    }

    return result;
  }, [tasks, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      in_progress: tasks.filter((task) => task.status === "in_progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: tasks.filter((task) => {
        if (!task.deadline) return false;
        return new Date(task.deadline) < new Date() && task.status !== "completed";
      }).length,
    };
  }, [tasks]);

  const decisionMutation = useMutation({
    mutationFn: async ({
      task,
      status,
      reason,
    }: {
      task: Task;
      status: Task["status"];
      reason?: string;
    }) => {
      const payload: UpdateTaskData = {
        status,
      };

      const trimmedReason = reason?.trim();
      if (trimmedReason) {
        payload.notes = trimmedReason;
        payload.completion_notes = trimmedReason;
      }

      return taskService.update(task.id, payload);
    },
    onSuccess: (_, variables) => {
      const isCompleted = variables.status === "completed";
      toast({
        title: isCompleted ? "Tapşırıq tamamlandı" : "Tapşırıq icra edilmədi",
        description: isCompleted
          ? "Tapşırıq icra olundu kimi qeyd edildi."
          : "Tapşırıq icra edilmədi və səbəb qeyd edildi.",
      });

      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDecisionDialog();
    },
    onSettled: () => {
      setPendingTaskId(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi.";
      toast({
        title: "Əməliyyat uğursuz oldu",
        description: message,
        variant: "destructive",
      });
    },
  });

  const closeDecisionDialog = () => {
    if (decisionMutation.isPending) {
      return;
    }
    setIsDecisionOpen(false);
    setDecisionTask(null);
    setDecisionReason("");
  };

  const canDecide = (task: Task) => !["completed", "cancelled"].includes(task.status);

  const handleMarkCompleted = (task: Task) => {
    if (!canDecide(task)) return;

    setPendingTaskId(task.id);
    decisionMutation.mutate({
      task,
      status: "completed",
    });
  };

  const openNotCompletedDialog = (task: Task) => {
    if (!canDecide(task)) return;
    setDecisionTask(task);
    setDecisionReason("");
    setIsDecisionOpen(true);
  };

  const submitNotCompleted = () => {
    if (!decisionTask) return;

    const trimmedReason = decisionReason.trim();
    if (trimmedReason.length < 5) {
      toast({
        title: "Səbəb tələb olunur",
        description: "Zəhmət olmasa ən azı 5 simvol uzunluğunda səbəb daxil edin.",
        variant: "destructive",
      });
      return;
    }

    decisionMutation.mutate({
      task: decisionTask,
      status: "cancelled",
      reason: trimmedReason,
    });
    setPendingTaskId(decisionTask.id);
  };

  const isDecisionInvalid = decisionReason.trim().length < 5;

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Giriş icazəsi yoxdur</h3>
          <p className="text-muted-foreground">Bu səhifə yalnız inzibati istifadəçilər üçün nəzərdə tutulub.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Təyin olunmuş tapşırıqlar</h1>
          <p className="text-muted-foreground">Tapşırıqlar yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-destructive mb-2">Xəta baş verdi</h1>
        <p className="text-muted-foreground">
          Tapşırıqlar yüklənərkən problem yarandı
          {error instanceof Error && error.message ? `: ${error.message}` : "."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-3 lg:px-4 pt-0 pb-2 sm:pb-3 lg:pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">Təyin olunmuş tapşırıqlar</h1>
        <p className="text-muted-foreground">
          Regional və sektor tapşırıqlarını ayrıca tablarda izləyin
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "region" | "sector")}>
        <TabsList className="w-full sm:w-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv tapşırıqlar</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanmış</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gecikmiş</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi tapşırıqlar</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tapşırıq axtar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filteredTasks.length} tapşırıq</span>
          {(searchTerm || statusFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filterləri təmizlə
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tapşırıq</TableHead>
              <TableHead>Kateqoriya</TableHead>
              <TableHead>Göndərən</TableHead>
              <TableHead>Prioritet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Son tarix</TableHead>
              <TableHead>İrəliləyiş</TableHead>
              <TableHead className="text-right w-[220px]">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Bu kriteriyalara uyğun tapşırıq tapılmadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.origin_scope_label && (
                      <Badge variant="outline" className="mr-2">
                        {task.origin_scope_label}
                      </Badge>
                    )}
                    {task.title}
                  </TableCell>
                  <TableCell>{categoryLabels[task.category]}</TableCell>
                  <TableCell>{task.creator?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(task.priority)}>
                      {priorityLabels[task.priority] || task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {statusLabels[task.status] || task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(task.deadline)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkCompleted(task)}
                        disabled={!canDecide(task) || decisionMutation.isPending}
                      >
                        {decisionMutation.isPending && pendingTaskId === task.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        İcra edildi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openNotCompletedDialog(task)}
                        disabled={!canDecide(task) || decisionMutation.isPending}
                      >
                        İcra edilmədi
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isDecisionOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsDecisionOpen(true);
            return;
          }
          closeDecisionDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tapşırıq icra edilmədi</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="decision-reason">Səbəb</Label>
              <Textarea
                id="decision-reason"
                rows={4}
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                placeholder="Niyə icra edilmədiyini izah edin..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Səbəb ən azı 5 simvol olmalıdır.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDecisionDialog}
              disabled={decisionMutation.isPending}
            >
              Ləğv et
            </Button>
            <Button
              onClick={submitNotCompleted}
              disabled={isDecisionInvalid || decisionMutation.isPending}
            >
              {decisionMutation.isPending && pendingTaskId === decisionTask?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Səbəbi göndər
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignedTasks;
