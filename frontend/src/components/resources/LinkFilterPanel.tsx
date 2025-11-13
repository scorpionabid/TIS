import React from 'react';
import {
  Filter,
  X,
  Calendar,
  User,
  Building2,
  Tag,
  Layers,
  FileType
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface LinkFilters {
  link_type?: string;
  share_scope?: string;
  status?: string;
  creator_id?: number;
  institution_id?: number;
  is_featured?: boolean;
  my_links?: boolean;
  date_from?: string;
  date_to?: string;
  access_level?: string;
  category?: string;
  mime_type?: string;
}

interface LinkFilterPanelProps {
  filters: LinkFilters;
  onFiltersChange: (filters: LinkFilters) => void;
  availableInstitutions?: Array<{ id: number; name: string }>;
  availableCreators?: Array<{ id: number; first_name: string; last_name: string }>;
  isOpen: boolean;
  onToggle: () => void;
  mode?: 'all' | 'links' | 'documents';
}

export function LinkFilterPanel({
  filters,
  onFiltersChange,
  availableInstitutions = [],
  availableCreators = [],
  isOpen,
  onToggle,
  mode = 'all',
}: LinkFilterPanelProps) {
  const [institutionSearch, setInstitutionSearch] = React.useState('');

  const updateFilter = (key: keyof LinkFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setInstitutionSearch('');
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(v => v !== undefined && v !== '').length;
  };

  const activeCount = getActiveFilterCount();
  const filteredInstitutionOptions = React.useMemo(() => {
    const query = institutionSearch.trim().toLowerCase();
    if (!query) {
      return availableInstitutions;
    }
    return availableInstitutions.filter((inst) =>
      inst?.name?.toLowerCase().includes(query)
    );
  }, [availableInstitutions, institutionSearch]);

  const selectedInstitutionName = React.useMemo(() => {
    if (!filters.institution_id) return null;
    const match = availableInstitutions.find((inst) => inst.id === filters.institution_id);
    return match?.name || null;
  }, [filters.institution_id, availableInstitutions]);

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={onToggle}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtr seçimləri</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">Göstər</span>
        </Button>
      </div>
    );
  }

  const showLinkFilters = mode === 'all' || mode === 'links';
  const showDocumentFilters = mode === 'all' || mode === 'documents';

  return (
    <div className="mb-4 border rounded-lg p-4 bg-gray-50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filtrlər</h3>
          {activeCount > 0 && (
            <Badge variant="secondary">{activeCount} aktiv</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Təmizlə
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
          >
            Gizlət
          </Button>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {showLinkFilters && (
          <>
            {/* Link Type */}
            <div>
              <Label htmlFor="filter-link-type" className="text-xs mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Link Növü
              </Label>
              <Select
                value={filters.link_type || 'all'}
                onValueChange={(val) => updateFilter('link_type', val)}
              >
                <SelectTrigger id="filter-link-type" className="h-9">
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="external">Xarici Link</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="document">Sənəd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Share Scope */}
            <div>
              <Label htmlFor="filter-share-scope" className="text-xs mb-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Paylaşma Səviyyəsi
              </Label>
              <Select
                value={filters.share_scope || 'all'}
                onValueChange={(val) => updateFilter('share_scope', val)}
              >
                <SelectTrigger id="filter-share-scope" className="h-9">
                  <SelectValue placeholder="Hamısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Hamısı</SelectItem>
                  <SelectItem value="public">Açıq</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="sectoral">Sektor</SelectItem>
                  <SelectItem value="institutional">Müəssisə</SelectItem>
                  <SelectItem value="specific_users">Xüsusi istifadəçilər</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Status */}
        <div>
          <Label htmlFor="filter-status" className="text-xs mb-1">Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(val) => updateFilter('status', val)}
          >
            <SelectTrigger id="filter-status" className="h-9">
              <SelectValue placeholder="Hamısı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hamısı</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="expired">Müddəti bitmiş</SelectItem>
              <SelectItem value="disabled">Deaktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Creator */}
        {availableCreators.length > 0 && (
          <div>
            <Label htmlFor="filter-creator" className="text-xs mb-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Yaradıcı
            </Label>
            <Select
              value={filters.creator_id ? String(filters.creator_id) : 'all'}
              onValueChange={(val) => updateFilter('creator_id', val === 'all' ? undefined : Number(val))}
            >
              <SelectTrigger id="filter-creator" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {availableCreators.map((creator) => (
                  <SelectItem key={creator.id} value={String(creator.id)}>
                    {creator.first_name} {creator.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Institution */}
        {availableInstitutions.length > 0 && (
          <div>
            <Label htmlFor="filter-institution" className="text-xs mb-1 flex items-center gap-1">
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
              onValueChange={(val) => updateFilter('institution_id', val === 'all' ? undefined : Number(val))}
            >
              <SelectTrigger id="filter-institution" className="h-9">
                <SelectValue placeholder="Hamısı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hamısı</SelectItem>
                {filteredInstitutionOptions.length === 0 && (
                  <SelectItem value="__empty" disabled>
                    Heç nə tapılmadı
                  </SelectItem>
                )}
                {filteredInstitutionOptions.map((inst) => (
                  <SelectItem key={inst.id} value={String(inst.id)}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Seçilən müəssisə həm resursu yaradan, həm də hədəflənən siyahıda axtarılacaq.
            </p>
          </div>
        )}

        {/* Date From */}
        <div>
          <Label htmlFor="filter-date-from" className="text-xs mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Başlanğıc tarix
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => updateFilter('date_from', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Date To */}
        <div>
          <Label htmlFor="filter-date-to" className="text-xs mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Bitmə tarix
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => updateFilter('date_to', e.target.value)}
            className="h-9"
          />
        </div>

        {showDocumentFilters && (
          <>
            {/* Access Level */}
            <div>
              <Label htmlFor="filter-access-level" className="text-xs mb-1 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Giriş səviyyəsi
              </Label>
              <Select
                value={filters.access_level || 'all'}
                onValueChange={(val) => updateFilter('access_level', val)}
              >
                <SelectTrigger id="filter-access-level" className="h-9">
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

            {/* Category */}
            <div>
              <Label htmlFor="filter-category" className="text-xs mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Kateqoriya
              </Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(val) => updateFilter('category', val)}
              >
                <SelectTrigger id="filter-category" className="h-9">
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

            {/* Mime type */}
            <div>
              <Label htmlFor="filter-mime-type" className="text-xs mb-1 flex items-center gap-1">
                <FileType className="h-3 w-3" />
                Fayl növü
              </Label>
              <Input
                id="filter-mime-type"
                type="text"
                placeholder="məs. pdf, docx"
                value={filters.mime_type || ''}
                onChange={(e) => updateFilter('mime_type', e.target.value)}
                className="h-9"
              />
            </div>
          </>
        )}
      </div>

      {/* Quick Filters */}
      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs text-gray-600">Sürətli filtrlər</Label>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="my-links"
              checked={filters.my_links || false}
              onCheckedChange={(checked) => updateFilter('my_links', checked === true)}
            />
            <Label htmlFor="my-links" className="text-sm cursor-pointer">
              Yalnız mənim resurslarım
            </Label>
          </div>

          {showLinkFilters && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={filters.is_featured || false}
                onCheckedChange={(checked) => updateFilter('is_featured', checked === true)}
              />
              <Label htmlFor="featured" className="text-sm cursor-pointer">
                Önə çıxan linklər
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeCount > 0 && (
        <div className="pt-2 border-t">
          <Label className="text-xs text-gray-600 mb-2 block">Aktiv filtrlər:</Label>
          <div className="flex flex-wrap gap-1">
            {filters.link_type && (
              <Badge variant="secondary" className="text-xs">
                Növ: {filters.link_type}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('link_type', undefined)}
                />
              </Badge>
            )}
            {filters.share_scope && (
              <Badge variant="secondary" className="text-xs">
                Səviyyə: {filters.share_scope}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('share_scope', undefined)}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="text-xs">
                Status: {filters.status}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('status', undefined)}
                />
              </Badge>
            )}
            {filters.access_level && (
              <Badge variant="secondary" className="text-xs">
                Giriş: {filters.access_level}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('access_level', undefined)}
                />
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="text-xs">
                Kateqoriya: {filters.category}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('category', undefined)}
                />
              </Badge>
            )}
            {filters.mime_type && (
              <Badge variant="secondary" className="text-xs">
                Fayl: {filters.mime_type}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('mime_type', undefined)}
                />
              </Badge>
            )}
            {filters.creator_id && (
              <Badge variant="secondary" className="text-xs">
                Yaradıcı #{filters.creator_id}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('creator_id', undefined)}
                />
              </Badge>
            )}
            {filters.institution_id && (
              <Badge variant="secondary" className="text-xs">
                {selectedInstitutionName || `Müəssisə #${filters.institution_id}`}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('institution_id', undefined)}
                />
              </Badge>
            )}
            {filters.my_links && (
              <Badge variant="secondary" className="text-xs">
                Mənim resurslarım
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('my_links', undefined)}
                />
              </Badge>
            )}
            {filters.is_featured && (
              <Badge variant="secondary" className="text-xs">
                Önə çıxanlar
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => updateFilter('is_featured', undefined)}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
