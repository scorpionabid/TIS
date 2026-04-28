import React from 'react';
import { cn } from '@/lib/utils';
import { 
  ExternalLink, 
  Video, 
  FileText, 
  LayoutList, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  History, 
  BarChart2,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { LinkShare } from '../types/linkDatabase.types';

interface LinkDatabaseCompactItemProps {
  link: LinkShare;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit?: (link: LinkShare) => void;
  onDelete?: (link: LinkShare) => void;
  onRestore?: (link: LinkShare) => void;
  onTrack?: (link: LinkShare) => void;
}

const TYPE_ICONS = {
  external: ExternalLink,
  video: Video,
  form: LayoutList,
  document: FileText,
};

export function LinkDatabaseCompactItem({
  link,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
  onTrack,
}: LinkDatabaseCompactItemProps) {
  const Icon = TYPE_ICONS[link.type as keyof typeof TYPE_ICONS] || ExternalLink;
  
  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking action buttons or dropdown, don't open link
    if ((e.target as HTMLElement).closest('button')) return;
    
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "group relative flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 cursor-pointer",
        isSelected 
          ? "bg-primary/5 border-primary shadow-sm" 
          : "bg-white border-gray-100 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Icon/Type */}
      <div className={cn(
        "flex items-center justify-center h-10 w-10 rounded-lg shrink-0 transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "bg-gray-50 text-gray-400 group-hover:bg-primary/5 group-hover:text-primary"
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-[13px] font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
            {link.title}
          </h3>
          {link.is_featured && (
            <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <BarChart2 className="h-3 w-3" />
            {link.click_count || 0}
          </span>
          {link.expires_at && (
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              {new Date(link.expires_at).toLocaleDateString('az-AZ')}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit?.(link)} className="text-xs font-medium cursor-pointer">
              <Edit2 className="h-3.5 w-3.5 mr-2" /> Redaktə et
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTrack?.(link)} className="text-xs font-medium cursor-pointer">
              <BarChart2 className="h-3.5 w-3.5 mr-2" /> Statistikalar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete?.(link)} 
              className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Overlay */}
      <div 
        onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id); }}
        className={cn(
          "absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center transition-all cursor-pointer",
          isSelected ? "bg-primary scale-110" : "bg-gray-200 opacity-0 group-hover:opacity-100"
        )}
      >
        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </div>
    </div>
  );
}
