import React from 'react';
import {
  Filter,
  X,
  Calendar,
  User,
  Building2,
  Layers,
  Tag,
  FileType,
  Search,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { LinkFilters } from './LinkFilterPanel';

interface DocumentFilterPanelProps {
  filters: LinkFilters;
  onFiltersChange: (filters: LinkFilters) => void;
  availableInstitutions?: Array<{ id: number; name: string }>;
  availableCreators?: Array<{ id: number; label: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function DocumentFilterPanel({
  filters,
  onFiltersChange,
  availableInstitutions = [],
  availableCreators = [],
  isOpen,
  onToggle,
}: DocumentFilterPanelProps) {
  const [institutionSearch, setInstitutionSearch] = React.useState('');

  const updateFilter = (key: keyof LinkFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  const clearAll = () => {
    onFiltersChange({});
    setInstitutionSearch('');
  };

  const filteredInstitutions = React.useMemo(() => {
    if (!institutionSearch.trim()) return availableInstitutions;
    const query = institutionSearch.toLowerCase();
    return availableInstitutions.filter((inst) =>
      inst.name.toLowerCase().includes(query)
    );
  }, [availableInstitutions, institutionSearch]);

  const activeCount = React.useMemo(() => {
    return Object.values(filters).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '' && value !== false;
    }).length;
  }, [filters]);

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="w-full justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Sənəd filtrləri</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">Göstər</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 border rounded-lg p-4 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sənəd filtrləri</h3>
          {activeCount > 0 && (
            <Badge variant="secondary">{activeCount} aktiv</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-1" />
              Təmizlə
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            Gizlət
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <Search className="h-3 w-3" />
            Status
          </Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(val) => updateFilter('status', val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="expired">Müddəti bitmiş</SelectItem>
              <SelectItem value="disabled">Deaktiv</SelectItem>
              <SelectItem value="archived">Arxiv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Giriş səviyyəsi
          </Label>
          <Select
            value={filters.access_level || 'all'}
            onValueChange={(val) => updateFilter('access_level', val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="public">Hamıya açıq</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="sectoral">Sektor daxili</SelectItem>
              <SelectItem value="institution">Müəssisə daxili</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Kateqoriya
          </Label>
          <Select
            value={filters.category || 'all'}
            onValueChange={(val) => updateFilter('category', val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="administrative">İdarəetmə</SelectItem>
              <SelectItem value="financial">Maliyyə</SelectItem>
              <SelectItem value="educational">Təhsil</SelectItem>
              <SelectItem value="hr">İnsan resursları</SelectItem>
              <SelectItem value="technical">Texniki</SelectItem>
              <SelectItem value="legal">Hüquqi</SelectItem>
              <SelectItem value="reports">Hesabatlar</SelectItem>
              <SelectItem value="forms">Formalar</SelectItem>
              <SelectItem value="other">Digər</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <FileType className="h-3 w-3" />
            Fayl növü
          </Label>
          <Input
            placeholder="məs. pdf, docx"
            value={filters.mime_type || ''}
            onChange={(e) => updateFilter('mime_type', e.target.value)}
            className="h-9"
          />
        </div>

        {availableCreators.length > 0 && (
          <div>
            <Label className="text-xs mb-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Yaradıcı
            </Label>
            <Select
              value={filters.creator_id ? String(filters.creator_id) : 'all'}
              onValueChange={(val) =>
                updateFilter('creator_id', val === 'all' ? undefined : Number(val))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {availableCreators.map((creator) => (
                  <SelectItem key={creator.id} value={String(creator.id)}>
                    {creator.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {availableInstitutions.length > 0 && (
          <div>
            <Label className="text-xs mb-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Müəssisə
            </Label>
            <Input
              placeholder="Müəssisə adı ilə axtar..."
              value={institutionSearch}
              onChange={(e) => setInstitutionSearch(e.target.value)}
              className="h-8 mb-2"
            />
            <Select
              value={filters.institution_id ? String(filters.institution_id) : 'all'}
              onValueChange={(val) =>
                updateFilter('institution_id', val === 'all' ? undefined : Number(val))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {filteredInstitutions.length === 0 && (
                  <SelectItem value="__empty" disabled>
                    Heç nə tapılmadı
                  </SelectItem>
                )}
                {filteredInstitutions.map((inst) => (
                  <SelectItem key={inst.id} value={String(inst.id)}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Başlanğıc tarix
          </Label>
          <Input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => updateFilter('date_from', e.target.value)}
            className="h-9"
          />
        </div>

        <div>
          <Label className="text-xs mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Bitmə tarix
          </Label>
          <Input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => updateFilter('date_to', e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs text-muted-foreground">Sürətli filtrlər</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="my-documents"
              checked={filters.my_links || false}
              onCheckedChange={(checked) => updateFilter('my_links', checked === true)}
            />
            <Label htmlFor="my-documents" className="text-sm cursor-pointer">
              Yalnız mənim sənədlərim
            </Label>
          </div>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-muted-foreground mb-2 block">Aktiv filtrlər:</Label>
          <div className="flex flex-wrap gap-2 text-xs">
            {filters.status && (
              <Badge variant="secondary">
                Status: {filters.status}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('status', undefined)} />
              </Badge>
            )}
            {filters.access_level && (
              <Badge variant="secondary">
                Giriş: {filters.access_level}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('access_level', undefined)} />
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary">
                Kateqoriya: {filters.category}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('category', undefined)} />
              </Badge>
            )}
            {filters.mime_type && (
              <Badge variant="secondary">
                Fayl: {filters.mime_type}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('mime_type', undefined)} />
              </Badge>
            )}
            {filters.creator_id && (
              <Badge variant="secondary">
                Yaradıcı #{filters.creator_id}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('creator_id', undefined)} />
              </Badge>
            )}
            {filters.institution_id && (
              <Badge variant="secondary">
                Müəssisə #{filters.institution_id}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('institution_id', undefined)} />
              </Badge>
            )}
            {filters.date_from && (
              <Badge variant="secondary">
                Başlanğıc: {filters.date_from}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('date_from', undefined)} />
              </Badge>
            )}
            {filters.date_to && (
              <Badge variant="secondary">
                Bitmə: {filters.date_to}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('date_to', undefined)} />
              </Badge>
            )}
            {filters.my_links && (
              <Badge variant="secondary">
                Mənim sənədlərim
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('my_links', undefined)} />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentFilterPanel;
