import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2, School, MapPin, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { institutionService } from '@/services/institutions';
import type { Institution } from '@/services/institutions';

interface InstitutionSelectorProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  level?: 'region' | 'sector' | 'school' | number;
  disabled?: boolean;
  className?: string;
}

export function InstitutionSelector({
  value,
  onChange,
  placeholder = "Müəssisə seçin...",
  level,
  disabled = false,
  className,
}: InstitutionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Map level string to numeric level if needed
  const targetLevel = useMemo(() => {
    if (typeof level === 'number') return level;
    switch (level) {
      case 'region': return 2;
      case 'sector': return 3;
      case 'school': return 4;
      default: return undefined;
    }
  }, [level]);

  useEffect(() => {
    const fetchInstitutions = async () => {
      setLoading(true);
      try {
        let items: Institution[] = [];
        if (targetLevel) {
          items = await institutionService.getAllByLevel(targetLevel);
        } else {
          // If no level specified, we might want to fetch all or some default
          // For now, let's just fetch everything up to a limit
          const response = await institutionService.getAll({ per_page: 1000 });
          // Handle different response formats from normalizeInstitutionResponse
          if (Array.isArray(response)) {
            items = response;
          } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
            items = response.data;
          } else if (response && typeof response === 'object' && 'items' in response && Array.isArray((response as any).items)) {
            items = (response as any).items;
          }
        }
        setInstitutions(items || []);
      } catch (error) {
        console.error('Failed to fetch institutions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, [targetLevel]);

  const selectedInstitution = useMemo(() => 
    institutions.find((inst) => inst.id === value)
  , [institutions, value]);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm) return institutions;
    const lowerSearch = searchTerm.toLowerCase();
    return institutions.filter((inst) => 
      inst.name.toLowerCase().includes(lowerSearch) || 
      (inst.code && inst.code.toLowerCase().includes(lowerSearch)) ||
      (inst.institution_code && inst.institution_code.toLowerCase().includes(lowerSearch))
    );
  }, [institutions, searchTerm]);

  const getIcon = (instLevel?: number) => {
    switch (instLevel) {
      case 2: return <MapPin className="h-4 w-4 text-blue-500" />;
      case 3: return <Building2 className="h-4 w-4 text-emerald-500" />;
      case 4: return <School className="h-4 w-4 text-orange-500" />;
      default: return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-10", className)}
          disabled={disabled || loading}
        >
          <div className="flex items-center gap-2 truncate">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : selectedInstitution ? (
              <>
                {getIcon(selectedInstitution.level)}
                <span className="truncate">{selectedInstitution.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 shadow-xl border-border/50" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Axtar (ad və ya kod)..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="h-11"
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-muted-foreground">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Yüklənir...</span>
                </div>
              ) : (
                "Müəssisə tapılmadı."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredInstitutions.slice(0, 50).map((inst) => (
                <CommandItem
                  key={inst.id}
                  value={inst.id.toString()}
                  onSelect={() => {
                    onChange(inst.id === value ? null : inst.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-2 cursor-pointer"
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-sm border border-primary/20",
                    value === inst.id ? "bg-primary text-primary-foreground" : "opacity-50"
                  )}>
                    {value === inst.id && <Check className="h-3.5 w-3.5" />}
                  </div>
                  {getIcon(inst.level)}
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{inst.name}</span>
                    <div className="flex items-center gap-2">
                       {inst.code && (
                        <span className="text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                          {inst.code}
                        </span>
                      )}
                      {inst.level && (
                        <span className="text-[10px] text-muted-foreground">
                          Səviyyə {inst.level}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
              {filteredInstitutions.length > 50 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/20">
                  Daha {filteredInstitutions.length - 50} müəssisə var, axtarışı dəqiqləşdirin.
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
