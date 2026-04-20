import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { statusLabels, priorityLabels } from "@/components/tasks/config/taskFormFields";

interface AssignedTasksFiltersProps {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  totalItems: number;
  isFiltering: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onClearFilters: () => void;
}

export function AssignedTasksFilters({
  searchTerm,
  statusFilter,
  priorityFilter,
  totalItems,
  isFiltering,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onClearFilters,
}: AssignedTasksFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="tasks-search"
            placeholder="Tapşırıq axtar..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 w-[250px]"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger data-testid="tasks-status-filter" className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Prioritet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün prioritetlər</SelectItem>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{totalItems} tapşırıq</span>
        {isFiltering && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <Filter className="h-4 w-4 mr-1" />
            Filterləri təmizlə
          </Button>
        )}
      </div>
    </div>
  );
}
