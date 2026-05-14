import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, CheckSquare, XSquare } from "lucide-react";
import { FilterParams } from "@/services/teacherVerification";

interface TeacherVerificationFilterProps {
  filters: FilterParams;
  setFilters: (filters: FilterParams) => void;
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  schools: Array<{ id: number; name: string }>;
}

export function TeacherVerificationFilter({
  filters,
  setFilters,
  selectedCount,
  onBulkApprove,
  onBulkReject,
  schools,
}: TeacherVerificationFilterProps) {
  const handleFilterChange = (key: keyof FilterParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      institution_id: 'all',
      search: '',
      page: 1,
      per_page: 20,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Filterlər</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="search">Axtarış</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              placeholder="Ad, email və ya istifadəçi adı..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label>Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün Statuslar</SelectItem>
              <SelectItem value="pending">Gözləmədə</SelectItem>
              <SelectItem value="approved">Təsdiqləndi</SelectItem>
              <SelectItem value="rejected">Rədd Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Müəssisə</Label>
          <Select
            value={filters.institution_id || 'all'}
            onValueChange={(value) => handleFilterChange('institution_id', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün Müəssisələr</SelectItem>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id.toString()}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Əməliyyatlar</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Təmizlə
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkApprove}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Təsdiq ({selectedCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkReject}
            >
              <XSquare className="w-4 h-4 mr-1" />
              Rədd ({selectedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
