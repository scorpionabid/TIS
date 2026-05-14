import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MapPin, 
  ShieldAlert, 
  Target, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ClipboardList, 
  Clock, 
  DollarSign,
  Link as LinkIcon,
  Eye
} from "lucide-react";

import type { LucideIcon } from 'lucide-react';

export type ProjectColumn =
  | 'name'
  | 'employees'
  | 'status'
  | 'priority'
  | 'start_date'
  | 'end_date'
  | 'duration'
  | 'budget'
  | 'expected_outcome'
  | 'kpi_metrics'
  | 'risks'
  | 'dependency'
  | 'location_platform'
  | 'monitoring_mechanism'
  | 'description'
  | 'notes';

export interface ColumnSetting {
  id: ProjectColumn;
  label: string;
  icon: LucideIcon;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: 'name', label: 'Fəaliyyət Adı', icon: FileText, visible: true },
  { id: 'employees', label: 'Məsul Şəxs', icon: User, visible: true },
  { id: 'status', label: 'Status', icon: CheckCircle2, visible: true },
  { id: 'priority', label: 'Prioritet', icon: AlertCircle, visible: true },
  { id: 'start_date', label: 'Başlama Tarixi', icon: Calendar, visible: true },
  { id: 'end_date', label: 'Bitmə Tarixi', icon: Calendar, visible: true },
  { id: 'duration', label: 'Müddət (s)', icon: Clock, visible: false },
  { id: 'budget', label: 'Büdcə (₼)', icon: DollarSign, visible: false },
  { id: 'expected_outcome', label: 'Gözlənilən nəticə', icon: Target, visible: false },
  { id: 'kpi_metrics', label: 'KPI', icon: BarChart3, visible: false },
  { id: 'risks', label: 'Risklər', icon: ShieldAlert, visible: false },
  { id: 'dependency', label: 'Asılılıq', icon: LinkIcon, visible: false },
  { id: 'location_platform', label: 'Yer / Platforma', icon: MapPin, visible: false },
  { id: 'monitoring_mechanism', label: 'Mexanizm', icon: Eye, visible: false },
  { id: 'description', label: 'Təsvir', icon: FileText, visible: false },
  { id: 'notes', label: 'Qeydlər', icon: ClipboardList, visible: false },
];

export function useColumnSettings(projectId: number) {
  const storageKey = `project_${projectId}_column_settings`;
  
  const [columns, setColumns] = useState<ColumnSetting[]>(() => {
    const saved = localStorage.getItem(storageKey);
    let initial = DEFAULT_COLUMNS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge strategy: Use DEFAULT_COLUMNS as base, apply 'visible' status from localStorage if ID matches
        initial = DEFAULT_COLUMNS.map(def => {
          const savedCol = parsed.find((s: any) => s.id === def.id || (def.id === 'start_date' && s.id === 'dates') || (def.id === 'end_date' && s.id === 'dates'));
          return savedCol ? { ...def, visible: savedCol.visible } : def;
        });
      } catch (e) {
        console.error("Error parsing column settings:", e);
      }
    }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  }, [columns, storageKey]);

  const toggleColumn = (columnId: ProjectColumn) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const isVisible = (columnId: ProjectColumn) => {
    return columns.find(col => col.id === columnId)?.visible ?? false;
  };

  return {
    columns,
    toggleColumn,
    isVisible,
    resetToDefault: () => setColumns(DEFAULT_COLUMNS)
  };
}
