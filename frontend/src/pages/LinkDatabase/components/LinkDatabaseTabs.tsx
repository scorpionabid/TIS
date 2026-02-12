import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, MapPin } from 'lucide-react';
import type { Department, SectorOption } from '../types/linkDatabase.types';
import type { UserRole } from '@/constants/roles';

interface LinkDatabaseTabsProps {
  departments: Department[];
  sectors: SectorOption[];
  activeTab: string;
  selectedSector: number | null;
  onTabChange: (tab: string) => void;
  onSectorChange: (sectorId: number) => void;
  userRole: UserRole;
}

export function LinkDatabaseTabs({
  departments,
  sectors,
  activeTab,
  selectedSector,
  onTabChange,
  onSectorChange,
  userRole,
}: LinkDatabaseTabsProps) {
  const isOnSectorsTab = activeTab === 'sectors';
  
  // 🆕 Role-aware tab visibility logic
  const shouldShowSectorTabs = sectors.length > 0 && 
    (userRole === 'superadmin' || 
     userRole === 'regionadmin' || 
     userRole === 'regionoperator' ||
     (userRole === 'sektoradmin' && sectors.length === 1));

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          {departments.map((dept) => (
            <TabsTrigger
              key={dept.id}
              value={dept.id.toString()}
              className="flex items-center gap-1.5 text-sm"
            >
              <Building2 className="h-3.5 w-3.5" />
              {dept.name}
            </TabsTrigger>
          ))}
          
          {/* 🆕 Conditional sector tabs based on user role */}
          {shouldShowSectorTabs && (
            <TabsTrigger value="sectors" className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              Sektorlar
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Sector selector - only show when appropriate */}
      {isOnSectorsTab && sectors.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sektor:</span>
          <Select
            value={selectedSector?.toString() || ''}
            onValueChange={(v) => onSectorChange(Number(v))}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sektor seçin" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.id.toString()}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
