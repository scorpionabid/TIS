import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Clock, CheckCircle, AlertTriangle, Calendar, X } from "lucide-react";
import { categoryLabels, priorityLabels, statusLabels } from "@/components/tasks/config/taskFormFields";
import type { TaskTab, TaskTabValue } from "@/hooks/tasks/useTaskPermissions";
import type { TaskFilterState } from "@/hooks/tasks/useTaskFilters";

type TaskStats = {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
};

type TasksHeaderProps = {
  currentTabLabel: string;
  availableTabs: TaskTab[];
  activeTab: TaskTabValue;
  onTabChange: (value: TaskTabValue) => void;
  stats: TaskStats;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  deadlineFilter: string;
  onDeadlineFilterChange: (value: string) => void;
  tasksCount: number;
  isFiltering: boolean;
  onClearFilters: () => void;
  onApplyPreset: (preset: Partial<TaskFilterState>) => void;
  disabled?: boolean;
};

export function TasksHeader({
  currentTabLabel,
  availableTabs,
  activeTab,
  onTabChange,
  stats,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  deadlineFilter,
  onDeadlineFilterChange,
  tasksCount,
  isFiltering,
  onClearFilters,
  onApplyPreset,
  disabled,
}: TasksHeaderProps) {
  const [selectedPreset, setSelectedPreset] = useState("");

  const filterPresets = useMemo(
    () => [
      {
        id: "overdue-urgent",
        label: "Gecikmiş & təcili",
        value: { deadlineFilter: "overdue", priorityFilter: "urgent" },
      },
      {
        id: "in-progress",
        label: "Aktiv tapşırıqlar",
        value: { statusFilter: "in_progress", deadlineFilter: "upcoming" },
      },
      {
        id: "completed",
        label: "Tamamlanan",
        value: { statusFilter: "completed" },
      },
    ],
    []
  );

  const deadlineLabelMap: Record<string, string> = useMemo(
    () => ({
      overdue: "Gecikmiş",
      upcoming: "Yaxınlaşan",
    }),
    []
  );

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];

    if (searchTerm) {
      filters.push({
        key: "search",
        label: `Axtarış: ${searchTerm}`,
        onRemove: () => onSearchChange(""),
      });
    }

    if (statusFilter !== "all") {
      filters.push({
        key: "status",
        label: `Status: ${statusLabels[statusFilter] ?? statusFilter}`,
        onRemove: () => onStatusFilterChange("all"),
      });
    }

    if (priorityFilter !== "all") {
      filters.push({
        key: "priority",
        label: `Prioritet: ${priorityLabels[priorityFilter] ?? priorityFilter}`,
        onRemove: () => onPriorityFilterChange("all"),
      });
    }

    if (categoryFilter !== "all") {
      filters.push({
        key: "category",
        label: `Kateqoriya: ${categoryLabels[categoryFilter] ?? categoryFilter}`,
        onRemove: () => onCategoryFilterChange("all"),
      });
    }

    if (deadlineFilter !== "all") {
      filters.push({
        key: "deadline",
        label: `Tarix: ${deadlineLabelMap[deadlineFilter] ?? deadlineFilter}`,
        onRemove: () => onDeadlineFilterChange("all"),
      });
    }

    return filters;
  }, [
    categoryFilter,
    deadlineFilter,
    deadlineLabelMap,
    onCategoryFilterChange,
    onDeadlineFilterChange,
    onPriorityFilterChange,
    onSearchChange,
    onStatusFilterChange,
    priorityFilter,
    searchTerm,
    statusFilter,
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tapşırıq İdarəetməsi</h1>
          <p className="text-muted-foreground">
            {currentTabLabel
              ? `${currentTabLabel} üçün tapşırıqların görülməsi və idarəsi`
              : "Sistem genelində bütün tapşırıqların görülməsi və idarəsi"}
          </p>
        </div>
      </div>

      {availableTabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TaskTabValue)}>
          <TabsList className="w-full sm:w-auto">
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv</p>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
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
                <p className="text-sm text-muted-foreground">Ümumi</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tapşırıq axtar..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-8"
              disabled={disabled}
            />
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange} disabled={disabled}>
            <SelectTrigger className="w-full sm:w-[150px]">
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

          <Select value={priorityFilter} onValueChange={onPriorityFilterChange} disabled={disabled}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün prioritetlər</SelectItem>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={onCategoryFilterChange} disabled={disabled}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deadlineFilter} onValueChange={onDeadlineFilterChange} disabled={disabled}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Son tarix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün tarixlər</SelectItem>
              <SelectItem value="overdue">Gecikmiş</SelectItem>
              <SelectItem value="upcoming">Yaxınlaşan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{tasksCount} tapşırıq</span>
          <Select
            value={selectedPreset}
            onValueChange={(value) => {
              setSelectedPreset(value);
              const preset = filterPresets.find((item) => item.id === value);
              if (preset) {
                onApplyPreset(preset.value);
                setSelectedPreset("");
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Hazır filterlər" />
            </SelectTrigger>
            <SelectContent>
              {filterPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isFiltering && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="flex items-center gap-1">
              {filter.label}
              <button
                type="button"
                onClick={filter.onRemove}
                className="rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${filter.label} filterini sil`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Hamısını sıfırla
          </Button>
        </div>
      )}
    </div>
  );
}
