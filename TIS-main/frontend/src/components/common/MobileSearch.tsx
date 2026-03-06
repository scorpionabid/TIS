import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '@/contexts/LayoutContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
  className?: string;
}

export const MobileSearch: React.FC<MobileSearchProps> = ({
  value,
  onChange,
  placeholder = "Axtar...",
  onFilterClick,
  showFilter = false,
  className
}) => {
  const { isMobile } = useLayout();
  const [isFocused, setIsFocused] = useState(false);

  if (isMobile) {
    return (
      <div className={cn("search-mobile", className)}>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="pl-10 pr-10"
            />
            {value && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange("")}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showFilter && (
            <Button
              variant="outline"
              size="icon"
              onClick={onFilterClick}
              className="flex-shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {showFilter && (
        <Button
          variant="outline"
          onClick={onFilterClick}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      )}
    </div>
  );
};