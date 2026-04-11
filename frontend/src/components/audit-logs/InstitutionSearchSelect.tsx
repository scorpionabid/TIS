import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, School, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiClient } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

interface InstitutionOption {
  id: number;
  name: string;
  institution_code: string;
  type: string;
}

interface InstitutionSearchSelectProps {
  value?: number;
  onChange: (id: number | undefined) => void;
  placeholder?: string;
}

export const InstitutionSearchSelect: React.FC<InstitutionSearchSelectProps> = ({ 
  value, 
  onChange, 
  placeholder = "Müəssisə seçin..." 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: institutions, isLoading } = useQuery({
    queryKey: ['institutions-search', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const response = await apiClient.get<{ success: boolean; data: InstitutionOption[] }>(`/institutions/search/${debouncedSearch}`);
      return (response as any).data?.data || (response as any).data || [];
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 60000,
  });

  const [selectedInst, setSelectedInst] = useState<InstitutionOption | null>(null);

  useEffect(() => {
    if (!value) setSelectedInst(null);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 border-slate-200"
        >
          <div className="flex items-center gap-2 truncate">
            <School className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              {selectedInst ? selectedInst.name : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Müəssisə adı və ya kodu..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span>Axtarılır...</span>
                </div>
              ) : search.length < 2 ? (
                "Axtarış üçün ən azı 2 simvol daxil edin"
              ) : (
                "Müəssisə tapılmadı"
              )}
            </CommandEmpty>
            <CommandGroup>
              {institutions?.map((inst) => (
                <CommandItem
                  key={inst.id}
                  value={inst.id.toString()}
                  onSelect={(currentValue) => {
                    const instId = parseInt(currentValue);
                    if (value === instId) {
                      onChange(undefined);
                      setSelectedInst(null);
                    } else {
                      onChange(instId);
                      setSelectedInst(inst);
                    }
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-blue-600",
                        value === inst.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{inst.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {inst.institution_code} • {inst.type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
