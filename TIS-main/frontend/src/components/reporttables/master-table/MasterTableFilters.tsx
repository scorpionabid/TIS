/**
 * MasterTableFilters - Search, filters, and action buttons
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Building2,
  BarChart3,
  Eye,
  FileDown,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import type { ViewMode } from './types';

interface MasterTableFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sectorFilter: string;
  onSectorChange: (value: string) => void;
  sectors: string[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCount: number;
  totalCount: number;
  onExport: (selectedOnly: boolean) => void;
  onBulkAction?: (action: 'approve' | 'reject' | 'return') => void;
  onSelectBySector?: (sector: string) => void;
  onSelectByStatus?: (status: string) => void;
  onSelectAllFiltered?: () => void;
  onSelectSearchResults?: () => void;
}

export const MasterTableFilters: React.FC<MasterTableFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sectorFilter,
  onSectorChange,
  sectors,
  viewMode,
  onViewModeChange,
  selectedCount,
  totalCount,
  onExport,
  onBulkAction,
  onSelectBySector,
  onSelectByStatus,
  onSelectAllFiltered,
  onSelectSearchResults,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-lg border">
      {/* Left side - Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Məktəb axtar..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-64"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            <SelectItem value="submitted">Təqdim edilmiş</SelectItem>
            <SelectItem value="partial">Qismən</SelectItem>
            <SelectItem value="draft">Qaralama</SelectItem>
          </SelectContent>
        </Select>

        {/* Sector Filter */}
        {sectors.length > 0 && (
          <Select value={sectorFilter} onValueChange={onSectorChange}>
            <SelectTrigger className="w-40">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sektor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün sektorlar</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 border rounded-md p-1">
          <Button
            variant={viewMode === 'merged' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('merged')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Ümumi
          </Button>
          <Button
            variant={viewMode === 'expanded' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('expanded')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ətraflı
          </Button>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex gap-2">
        {/* Export Buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport(false)}>
              <FileDown className="h-4 w-4 mr-2 text-gray-500" />
              Bütün sətirləri export et ({totalCount})
            </DropdownMenuItem>
            {selectedCount > 0 && (
              <DropdownMenuItem onClick={() => onExport(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                Seçilmişləri export et ({selectedCount})
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {/* Filter + Select Options */}
            {sectorFilter !== 'all' && onSelectBySector && (
              <DropdownMenuItem onClick={() => onSelectBySector(sectorFilter)}>
                <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                "{sectorFilter}" sektorunu seç
              </DropdownMenuItem>
            )}
            {statusFilter !== 'all' && onSelectByStatus && (
              <DropdownMenuItem onClick={() => onSelectByStatus(statusFilter)}>
                <Filter className="h-4 w-4 mr-2 text-amber-500" />
                "{statusFilter}" statusunu seç
              </DropdownMenuItem>
            )}
            {onSelectAllFiltered && (
              <DropdownMenuItem onClick={onSelectAllFiltered}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-purple-500" />
                Filterlənmişlərin hamısını seç
              </DropdownMenuItem>
            )}
            {searchTerm && onSelectSearchResults && (
              <DropdownMenuItem onClick={onSelectSearchResults}>
                <Search className="h-4 w-4 mr-2 text-blue-500" />
                Axtarış nəticələrini seç
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bulk Actions */}
        {selectedCount > 0 && onBulkAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <MoreHorizontal className="h-4 w-4 mr-1" />
                Toplu əməliyyat ({selectedCount})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Seçilmiş məktəblər</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onBulkAction('approve')}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                Hamısını təsdiqlə
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction('return')}>
                <Clock className="h-4 w-4 mr-2 text-amber-500" />
                Hamısını qaytar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkAction('reject')}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Hamısını rədd et
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default MasterTableFilters;
