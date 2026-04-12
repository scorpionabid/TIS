import React, { useState, useCallback } from "react";
import { format, addDays } from 'date-fns';
import { Plus, Save, X, Loader2, Calendar as CalendarIcon, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { projectService, ProjectActivity } from "@/services/projects";
import { useToast } from "@/hooks/use-toast";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useAssignableUsers } from "@/hooks/tasks/useAssignableUsers";
import { useDebounce } from "@/hooks/useDebounce";

interface ProjectActivityCreateRowProps {
  projectId: number;
  status: ProjectActivity["status"];
  availableColumns: any[];
  isVisible: (id: string) => boolean;
  onCreated: () => void;
  availableUsers?: any[];
  isJustSelector?: boolean;
  selectorValue?: number | null;
  multiSelectorValue?: number[];
  onSelectorChange?: (val: number | null) => void;
  onMultiSelectorChange?: (vals: number[]) => void;
  canEdit: boolean;
  columnWidths?: Record<string, number>;
}

export function ProjectActivityCreateRow({
  projectId,
  status,
  availableColumns,
  isVisible,
  onCreated,
  availableUsers = [],
  isJustSelector = false,
  selectorValue,
  multiSelectorValue,
  onSelectorChange,
  onMultiSelectorChange,
  canEdit,
  columnWidths = {},
}: ProjectActivityCreateRowProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    employee_ids: [] as number[],
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    priority: 'medium' as ProjectActivity['priority'],
    budget: 0,
    notes: '',
    expected_outcome: '',
    kpi_metrics: '',
    risks: '',
    location_platform: '',
    monitoring_mechanism: '',
    planned_hours: 0,
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData({
      name: "",
      description: "",
      employee_ids: [],
      notes: "",
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      budget: 0,
      priority: "medium",
      expected_outcome: '',
      kpi_metrics: '',
      risks: '',
      location_platform: '',
      monitoring_mechanism: '',
      planned_hours: 0,
    });
    setIsExpanded(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Xəta", description: "Fəaliyyət adı mütləqdir", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await projectService.addActivity(projectId, {
        ...formData,
        status,
      });
      toast({ title: "Uğurlu", description: "Yeni fəaliyyət əlavə edildi." });
      handleReset();
      onCreated();
    } catch (error) {
      toast({ title: "Xəta", description: "Fəaliyyət yaradılarkən xəta baş verdi.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isJustSelector) {
    return (
      <ActivityEmployeeSelector
        selectedIds={multiSelectorValue || (selectorValue ? [selectorValue] : [])}
        onMultiSelectorChange={onMultiSelectorChange}
        onSelectorChange={onSelectorChange}
      />
    );
  }

  if (!canEdit) return null;

  if (isExpanded) {
    const nameWidth = columnWidths['name'] || 350;
    return (
      <TableRow className="bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors h-9">
        <TableCell className="p-0 sticky left-0 z-20 bg-card border-r" style={{ width: nameWidth, minWidth: nameWidth, maxWidth: nameWidth }}>
          <div className="flex items-center gap-2 px-3">
            <Input 
              placeholder="Yeni fəaliyyət adı..." 
              value={formData.name} 
              onChange={(e) => handleFieldChange("name", e.target.value)} 
              className="h-8 text-[11px] w-full border-none focus-visible:ring-0 px-0 font-bold bg-transparent" 
              autoFocus 
            />
          </div>
        </TableCell>

        {isVisible("employees") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['employees'] || 180 }}>
            <ActivityEmployeeSelector
              selectedIds={formData.employee_ids}
              onMultiSelectorChange={(ids) => setFormData({ ...formData, employee_ids: ids })}
            />
          </TableCell>
        )}

        {isVisible("status") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['status'] || 140 }}>
             <div className="w-full h-8 flex items-center justify-center text-[10px] font-black uppercase text-muted-foreground/50">
                {status}
             </div>
          </TableCell>
        )}

        {isVisible("priority") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['priority'] || 120 }}>
            <div className="flex justify-center px-1">
              <select value={formData.priority} onChange={(e) => handleFieldChange("priority", e.target.value)} className="w-full h-8 text-[10px] bg-transparent focus:ring-0 border-none uppercase font-black">
                <option value="low">Aşağı</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksək</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
          </TableCell>
        )}

        {isVisible("start_date") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['start_date'] || 120 }}>
            <Input type="date" value={formData.start_date} onChange={(e) => handleFieldChange("start_date", e.target.value)} className="h-8 text-[10px] border-none text-center bg-transparent" />
          </TableCell>
        )}

        {isVisible("end_date") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['end_date'] || 120 }}>
            <Input type="date" value={formData.end_date} onChange={(e) => handleFieldChange("end_date", e.target.value)} className="h-8 text-[10px] border-none text-center bg-transparent" />
          </TableCell>
        )}

        {isVisible("duration") && (
          <TableCell className="p-0 border-r text-center text-[10px] text-muted-foreground" style={{ width: columnWidths['duration'] || 80 }}>
            -
          </TableCell>
        )}

        {isVisible("budget") && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['budget'] || 110 }}>
            <Input type="number" placeholder="0" value={formData.budget} onChange={(e) => handleFieldChange("budget", Number(e.target.value))} className="h-8 text-[10px] border-none text-center bg-transparent" />
          </TableCell>
        )}

        {isVisible('expected_outcome') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['expected_outcome'] || 180 }}>
            <Input placeholder="..." value={formData.expected_outcome} onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('kpi_metrics') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['kpi_metrics'] || 150 }}>
            <Input placeholder="..." value={formData.kpi_metrics} onChange={(e) => setFormData({ ...formData, kpi_metrics: e.target.value })} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('risks') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['risks'] || 150 }}>
            <Input placeholder="..." value={formData.risks} onChange={(e) => setFormData({ ...formData, risks: e.target.value })} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('dependency') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['dependency'] || 100 }}>
            <Input placeholder="..." value={(formData as any).parent_id || ''} onChange={(e) => handleFieldChange("parent_id", e.target.value)} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('location_platform') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['location_platform'] || 160 }}>
            <Input placeholder="..." value={formData.location_platform} onChange={(e) => setFormData({ ...formData, location_platform: e.target.value })} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('monitoring_mechanism') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['monitoring_mechanism'] || 200 }}>
            <Input placeholder="..." value={formData.monitoring_mechanism} onChange={(e) => setFormData({ ...formData, monitoring_mechanism: e.target.value })} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('description') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['description'] || 300 }}>
            <Input placeholder="..." value={formData.description} onChange={(e) => handleFieldChange("description", e.target.value)} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        {isVisible('notes') && (
          <TableCell className="p-0 border-r" style={{ width: columnWidths['notes'] || 300 }}>
            <Input placeholder="..." value={formData.notes} onChange={(e) => handleFieldChange("notes", e.target.value)} className="h-8 text-[10px] border-none bg-transparent" />
          </TableCell>
        )}

        <TableCell className="p-0 sticky right-0 z-20 bg-card border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] w-[80px]">
          <div className="flex gap-1 justify-center">
            <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={isSubmitting || !formData.name} className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsExpanded(false)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="group cursor-pointer bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 transition-colors" onClick={() => setIsExpanded(true)}>
      <TableCell colSpan={100} className="p-2 h-10">
        <div className="flex items-center gap-2 pl-2 text-primary/70 font-medium text-xs">
          <Plus className="w-4 h-4" />
          <span>Yeni Fəaliyyət Əlavə Et...</span>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Server-side employee selector ──────────────────────────────────────────
function ActivityEmployeeSelector({
  selectedIds,
  onMultiSelectorChange,
  onSelectorChange,
}: {
  selectedIds: number[];
  onMultiSelectorChange?: (vals: number[]) => void;
  onSelectorChange?: (val: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 350);
  // Cache selected user names so they stay visible after closing
  const [nameCache, setNameCache] = React.useState<Record<number, string>>({});

  const { users, isFetching } = useAssignableUsers({
    search: debouncedSearch,
    perPage: 50,
    enabled: open,
  });

  React.useEffect(() => {
    if (users.length) {
      setNameCache(prev => {
        const next = { ...prev };
        users.forEach(u => { next[u.id] = u.name; });
        return next;
      });
    }
  }, [users]);

  const toggle = (userId: number) => {
    if (onMultiSelectorChange) {
      const next = selectedIds.includes(userId)
        ? selectedIds.filter(id => id !== userId)
        : [...selectedIds, userId];
      onMultiSelectorChange(next);
    } else {
      onSelectorChange?.(selectedIds.includes(userId) ? null : userId);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-7 text-[10px] font-normal border-primary/20 bg-background",
            selectedIds.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex gap-1 overflow-hidden truncate">
            {selectedIds.length > 0
              ? selectedIds.map(id => (
                  <Badge key={id} variant="secondary" className="h-5 px-1 text-[9px] font-normal shrink-0">
                    {(nameCache[id] || 'Seçilib').split(' ')[0]}
                  </Badge>
                ))
              : 'Seçin'}
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad və ya UTIS kodu..."
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto space-y-0.5">
          {isFetching && (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Yüklənir...
            </div>
          )}
          {!isFetching && users.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">Tapılmadı.</p>
          )}
          {!isFetching && users.map(user => {
            const isSelected = selectedIds.includes(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[10px] hover:bg-muted transition-colors",
                  isSelected && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border border-primary",
                  isSelected ? "bg-primary text-primary-foreground" : "opacity-30"
                )}>
                  {isSelected && <Check className="h-2.5 w-2.5" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{user.name}</span>
                  {user.username && (
                    <span className="text-muted-foreground opacity-70">{user.username}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
