import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SectorFiltersProps {
  selectedType: string;
  setSelectedType: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onCreateSector: () => void;
}

export const SectorFilters = ({
  selectedType,
  setSelectedType,
  selectedStatus,
  setSelectedStatus,
  searchQuery,
  setSearchQuery,
  onCreateSector
}: SectorFiltersProps) => {
  const { currentUser } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tip" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bütün tiplər</SelectItem>
          <SelectItem value="primary">İbtidai</SelectItem>
          <SelectItem value="secondary">Orta</SelectItem>
          <SelectItem value="preschool">Məktəbəqədər</SelectItem>
          <SelectItem value="vocational">Peşə</SelectItem>
          <SelectItem value="special">Xüsusi</SelectItem>
          <SelectItem value="mixed">Qarışıq</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Hamısı</SelectItem>
          <SelectItem value="active">Aktiv</SelectItem>
          <SelectItem value="inactive">Qeyri-aktiv</SelectItem>
        </SelectContent>
      </Select>
      
      <Input
        placeholder="Sektorlarda axtar..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-64"
      />
      
      {['superadmin', 'regionadmin'].includes(currentUser?.role || '') && (
        <Button className="flex items-center gap-2" onClick={onCreateSector}>
          <Plus className="h-4 w-4" />
          Yeni Sektor
        </Button>
      )}
    </div>
  );
};