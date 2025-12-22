import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, CheckCircle, Filter, Search, Loader2, Forward } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { taskService, Task, UserAssignmentSummary } from "@/services/tasks";
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
import { TaskDelegationModal } from "@/components/modals/TaskDelegationModal";

const COMPLETION_TYPES = [
  { value: "report_submitted", label: "Hesabat göndərildi" },
  { value: "data_updated", label: "Məlumatlar yeniləndi" },
  { value: "onsite_visit", label: "Yerində yoxlanıldı" },
  { value: "other", label: "Digər" },
] as const;

const DEFAULT_COMPLETION_TYPE = COMPLETION_TYPES[0].value;

type AssignmentActionPayload = {
  assignmentId: number;
  payload: {
    status: Task["status"];
    progress?: number;
    completion_notes?: string;
    completion_data?: Record<string, unknown>;
  };
  successMessage: {
    title: string;
    description?: string;
  };
};

const formatDate = (dateString?: string | null) => {
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
  const [decisionContext, setDecisionContext] = useState<{ task: Task; assignment: UserAssignmentSummary } | null>(null);
  const [completionContext, setCompletionContext] = useState<{ task: Task; assignment: UserAssignmentSummary } | null>(null);
  const [delegationContext, setDelegationContext] = useState<{ task: Task; assignment: UserAssignmentSummary } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [completionType, setCompletionType] = useState<string>(DEFAULT_COMPLETION_TYPE);
  const [completionNotes, setCompletionNotes] = useState("");
  const [pendingAssignmentId, setPendingAssignmentId] = useState<number | null>(null);

  const closeDecisionDialog = () => {
    setDecisionContext(null);
    setDecisionReason("");
  };

  const closeCompletionDialog = () => {
    setCompletionContext(null);
    setCompletionNotes("");
    setCompletionType(DEFAULT_COMPLETION_TYPE);
  };

  const closeDelegationDialog = () => {
    setDelegationContext(null);
  };

  const openDelegationDialog = (task: Task, assignment: UserAssignmentSummary) => {
    // Only allow delegation for pending or accepted status
    if (assignment.status !== 'pending' && assignment.status !== 'accepted') {
      toast({
        title: "Yönləndirmə mümkün deyil",
        description: "Yalnız pending və ya accepted statusunda olan tapşırıqları yönləndirə bilərsiniz.",
        variant: "destructive",
      });
      return;
    }
    setDelegationContext({ task, assignment });
  };

  const allowedRoles = useMemo(
    () => ["superadmin", "regionadmin", "sektoradmin", "schooladmin", "regionoperator"],
    []
  );

  const hasAccess = currentUser ? allowedRoles.includes(currentUser.role) : false;

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
      result = result.filter((task) => {
        const assignmentStatus = task.user_assignment?.status ?? task.status;
        return assignmentStatus === statusFilter;
      });
    }

    return result;
  }, [tasks, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const assignmentContexts = tasks
      .map((task) => task.user_assignment)
      .filter((assignment): assignment is UserAssignmentSummary => Boolean(assignment));

    const totalSource = assignmentContexts.length > 0 ? assignmentContexts : tasks;

    const countStatus = (status: Task["status"]) => {
      if (assignmentContexts.length > 0) {
        return assignmentContexts.filter((assignment) => assignment.status === status).length;
      }
      return tasks.filter((task) => task.status === status).length;
    };

    const overdueCount =
      assignmentContexts.length > 0
        ? assignmentContexts.filter(
            (assignment) =>
              assignment.due_date &&
              new Date(assignment.due_date) < new Date() &&
              assignment.status !== "completed"
          ).length
        : tasks.filter(
            (task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== "completed"
          ).length;

    return {
      total: totalSource.length,
      pending: countStatus("pending"),
      in_progress: countStatus("in_progress"),
      completed: countStatus("completed"),
      overdue: overdueCount,
    };
  }, [tasks]);

  const assignmentMutation = useMutation<unknown, Error, AssignmentActionPayload>({
    mutationFn: async ({ assignmentId, payload }) => {
      return taskService.updateAssignmentStatus(assignmentId, payload);
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.successMessage.title,
        description: variables.successMessage.description,
      });
      queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      closeDecisionDialog();
      closeCompletionDialog();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Əməliyyat zamanı xəta baş verdi.";
      toast({
        title: "Əməliyyat uğursuz oldu",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingAssignmentId(null);
    },
  });

  const canTransition = (assignment: UserAssignmentSummary | null | undefined, status: Task["status"]) =>
    Boolean(assignment?.can_update && assignment.allowed_transitions?.includes(status));

  const handleMarkInProgress = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "in_progress")) return;
    setPendingAssignmentId(assignment.id);
    assignmentMutation.mutate({
      assignmentId: assignment.id,
      payload: {
        status: "in_progress",
        progress: Math.max(assignment.progress ?? 0, 25),
      },
      successMessage: {
        title: "Tapşırıq icraya götürüldü",
        description: `${task.title} tapşırığı icraya götürüldü kimi qeyd edildi.`,
      },
    });
  };

  const openCompletionDialog = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "completed")) return;
    setCompletionContext({ task, assignment });
    setCompletionType(DEFAULT_COMPLETION_TYPE);
    setCompletionNotes("");
  };

  const openNotCompletedDialog = (task: Task, assignment: UserAssignmentSummary) => {
    if (!canTransition(assignment, "cancelled")) return;
    setDecisionContext({ task, assignment });
    setDecisionReason("");
  };

  const submitCompletion = () => {
    if (!completionContext) return;
    const { assignment, task } = completionContext;
    if (!completionType) {
      toast({
        title: "Tamamlama növü tələb olunur",
        description: "Zəhmət olmasa tamamlama növünü seçin.",
        variant: "destructive",
      });
      return;
    }

    setPendingAssignmentId(assignment.id);
    assignmentMutation.mutate({
      assignmentId: assignment.id,
      payload: {
        status: "completed",
        progress: 100,
        completion_notes: completionNotes.trim() || undefined,
        completion_data: {
          completion_type: completionType,
        },
      },
      successMessage: {
        title: "Tapşırıq tamamlandı",
        description: `${task.title} tapşırığı tamamlandı kimi qeyd edildi.`,
      },
    });
  };

  const submitNotCompleted = () => {
    if (!decisionContext) return;
    const { assignment, task } = decisionContext;
    const trimmedReason = decisionReason.trim();

    if (trimmedReason.length < 5) {
      toast({
        title: "Səbəb tələb olunur",
        description: "Zəhmət olmasa ən azı 5 simvol uzunluğunda səbəb daxil edin.",
        variant: "destructive",
      });
      return;
    }

    setPendingAssignmentId(assignment.id);
    assignmentMutation.mutate({
      assignmentId: assignment.id,
      payload: {
        status: "cancelled",
        completion_notes: trimmedReason,
      },
      successMessage: {
        title: "Tapşırıq ləğv edildi",
        description: `${task.title} tapşırığı ilə bağlı səbəb qeyd edildi.`,
      },
    });
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
        <p className="text-muted-foreground">Regional və sektor tapşırıqlarını ayrıca tablarda izləyin</p>
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
              <TableHead className="text-right w-[280px]">Əməliyyat</TableHead>
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
              filteredTasks.map((task) => {
                const assignment = task.user_assignment;
                const statusForUser = assignment?.status ?? task.status;
                const progressValue = assignment?.progress ?? task.progress ?? 0;

                return (
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
                      <div className="flex flex-col gap-1">
                        <Badge variant={getStatusBadgeVariant(statusForUser)}>
                          {statusLabels[statusForUser] || statusForUser}
                        </Badge>
                        {assignment && task.status !== statusForUser && (
                          <span className="text-xs text-muted-foreground">
                            Ümumi status: {statusLabels[task.status] || task.status}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(assignment?.due_date ?? task.deadline)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.max(progressValue, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {assignment ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap justify-end gap-2">
                            {/* Delegation button - only for pending/accepted status */}
                            {(assignment.status === 'pending' || assignment.status === 'accepted') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDelegationDialog(task, assignment)}
                                disabled={assignmentMutation.isPending}
                              >
                                <Forward className="mr-2 h-4 w-4" />
                                Yönləndir
                              </Button>
                            )}
                            {canTransition(assignment, "in_progress") && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleMarkInProgress(task, assignment)}
                                disabled={assignmentMutation.isPending}
                              >
                                {assignmentMutation.isPending && pendingAssignmentId === assignment.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                İcraya götürüldü
                              </Button>
                            )}
                            {canTransition(assignment, "completed") && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openCompletionDialog(task, assignment)}
                                disabled={assignmentMutation.isPending}
                              >
                                Tamamlandı
                              </Button>
                            )}
                            {canTransition(assignment, "cancelled") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openNotCompletedDialog(task, assignment)}
                                disabled={assignmentMutation.isPending}
                              >
                                Ləğv et
                              </Button>
                            )}
                          </div>
                          {assignment.institution && (
                            <span className="text-xs text-muted-foreground">
                              Müəssisə: {assignment.institution.name}
                            </span>
                          )}
                          {assignment.completion_notes && (
                            <span className="text-xs text-muted-foreground text-right">
                              Son qeyd: {assignment.completion_notes}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Məsul təyinat tapılmadı</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(decisionContext)} onOpenChange={(open) => (!open ? closeDecisionDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tapşırığı ləğv et</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {decisionContext?.task.title ?? "Tapşırıq"} üçün səbəb daxil edin.
              </p>
            </div>
            <div>
              <Label htmlFor="decision-reason">Səbəb</Label>
              <Textarea
                id="decision-reason"
                rows={4}
                value={decisionReason}
                onChange={(event) => setDecisionReason(event.target.value)}
                placeholder="Niyə icra edilmədiyini izah edin..."
              />
              <p className="mt-1 text-xs text-muted-foreground">Səbəb ən azı 5 simvol olmalıdır.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDecisionDialog} disabled={assignmentMutation.isPending}>
              Ləğv et
            </Button>
            <Button onClick={submitNotCompleted} disabled={isDecisionInvalid || assignmentMutation.isPending}>
              {assignmentMutation.isPending &&
              decisionContext?.assignment.id &&
              pendingAssignmentId === decisionContext.assignment.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Səbəbi göndər
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(completionContext)} onOpenChange={(open) => (!open ? closeCompletionDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tapşırığı tamamla</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {completionContext?.task.title ?? "Tapşırıq"} üçün tamamlama məlumatı daxil edin.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tamamlama növü</Label>
              <Select value={completionType} onValueChange={setCompletionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tamamlama növü" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="completion-notes">Qeydlər (isteğe bağlı)</Label>
              <Textarea
                id="completion-notes"
                rows={4}
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
                placeholder="Qısa qeydlər əlavə edin..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCompletionDialog} disabled={assignmentMutation.isPending}>
              Ləğv et
            </Button>
            <Button
              onClick={submitCompletion}
              disabled={!completionType || assignmentMutation.isPending}
            >
              {assignmentMutation.isPending &&
              completionContext?.assignment.id &&
              pendingAssignmentId === completionContext.assignment.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Tamamlandı kimi qeyd et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Delegation Modal */}
      {delegationContext && (
        <TaskDelegationModal
          open={Boolean(delegationContext)}
          onClose={closeDelegationDialog}
          task={delegationContext.task}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["assigned-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            closeDelegationDialog();
          }}
        />
      )}
    </div>
  );
};

export default AssignedTasks;
