/**
 * TableTemplates - Simplified template management for report tables
 * Region Admin version - Clean and functional
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bookmark,
  Plus,
  Search,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportTable, ReportTableColumn } from '@/types/reportTable';
import { reportTableService } from '@/services/reportTables';

export interface TableTemplate {
  id: number;
  name: string;
  description?: string;
  columns: ReportTableColumn[];
  max_rows: number;
  created_at: string;
  category?: string;
}

interface TableTemplatesProps {
  onSelectTemplate?: (template: TableTemplate) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  education: { label: 'Təhsil', color: 'bg-blue-100 text-blue-700' },
  finance: { label: 'Maliyyə', color: 'bg-green-100 text-green-700' },
  inventory: { label: 'İnventar', color: 'bg-orange-100 text-orange-700' },
  hr: { label: 'İnsan Resursları', color: 'bg-purple-100 text-purple-700' },
  infrastructure: { label: 'İnfrastruktur', color: 'bg-gray-100 text-gray-700' },
  other: { label: 'Digər', color: 'bg-gray-100 text-gray-700' },
};

export function TableTemplates({ onSelectTemplate, open, onOpenChange }: TableTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Load templates from API
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['table-templates'],
    queryFn: () => reportTableService.getTemplates(),
    enabled: open,
  });

  const filteredTemplates = templates.filter(t => {
    const search = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(search) ||
           t.description?.toLowerCase().includes(search);
  });

  const handleSelect = (template: TableTemplate) => {
    reportTableService.createFromTemplate(template.id, `${template.name} (Yeni)`)
      .then(() => {
        toast.success('Yeni cədvəl şablondan yaradıldı');
        onSelectTemplate?.(template);
        onOpenChange(false);
      })
      .catch((error: Error) => toast.error(error.message || 'Cədvəl yaradılmadı'));
  };

  const getCategoryStyle = (category?: string) => {
    return CATEGORIES[category || 'other']?.color || CATEGORIES.other.color;
  };

  const getCategoryLabel = (category?: string) => {
    return CATEGORIES[category || 'other']?.label || 'Digər';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bookmark className="h-5 w-5 text-emerald-600" />
            Cədvəl şablonları
          </DialogTitle>
          <DialogDescription>
            Hazır şablonlardan istifadə edərək yeni cədvəllər yaradın
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative py-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Şablon axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">
                {searchTerm ? 'Axtarışa uyğun şablon tapılmadı' : 'Hələ şablon yoxdur'}
              </p>
              <p className="text-sm mt-1">
                {searchTerm
                  ? 'Başqa axtarış sözü yoxlayın'
                  : 'Şablonlar admin tərəfindən əlavə edildikdə burada görünəcək'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {template.name}
                        </h3>
                        <Badge className={`text-xs ${getCategoryStyle(template.category)}`}>
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </div>

                      {template.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{template.columns?.length || 0} sütun</span>
                        <span>•</span>
                        <span>Max {template.max_rows || 50} sətir</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(template);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      İstifadə et
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t text-xs text-gray-500">
          <p>
            {filteredTemplates.length > 0 && (
              <>{filteredTemplates.length} şablon mövcuddur</>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TableTemplates;
