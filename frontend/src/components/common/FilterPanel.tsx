import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterPanelProps {
  /** Aktiv filter sayı — düymədə göstərilir */
  activeFilterCount?: number;
  /** Filter-lərin başlığı (default: 'Filterlər') */
  label?: string;
  /** Panel həmişə açıq olsun (responsive — yalnız mobilə tətbiq olunur) */
  defaultOpen?: boolean;
  /** Filter-ləri ehtiva edən uşaq komponent-lər */
  children: React.ReactNode;
  className?: string;
}

/**
 * FilterPanel — responsive collapsible filter wrapper.
 *
 * - Desktop (md+): həmişə görünür
 * - Mobile (< md): "Filterlər (N)" düyməsi, click ilə açılır/bağlanır
 *
 * İstifadə:
 *   <FilterPanel activeFilterCount={activeCount}>
 *     <StudentFilters ... />
 *   </FilterPanel>
 */
export function FilterPanel({
  activeFilterCount = 0,
  label = 'Filterlər',
  defaultOpen = false,
  children,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      {/* Mobile toggle — hidden on md+ */}
      <div className="md:hidden mb-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full justify-between"
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {label}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {activeFilterCount}
              </Badge>
            )}
          </span>
          {isOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </Button>
      </div>

      {/* Content: always visible on desktop, toggle on mobile */}
      <div className={`md:block ${isOpen ? 'block' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
}
