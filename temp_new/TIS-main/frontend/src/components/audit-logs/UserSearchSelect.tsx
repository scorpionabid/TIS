import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, User, Loader2 } from "lucide-react";
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

interface UserOption {
  id: number;
  name: string;
  username: string;
}

interface UserSearchSelectProps {
  value?: number;
  onChange: (userId: number | undefined) => void;
  placeholder?: string;
}

export const UserSearchSelect: React.FC<UserSearchSelectProps> = ({ 
  value, 
  onChange, 
  placeholder = "İstifadəçi seçin..." 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users based on search
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users-search', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const response = await apiClient.get<UserOption[]>(`/users/search/${debouncedSearch}`);
      // Based on typical API structure
      const data = (response as any).data || response;
      return Array.isArray(data) ? data : [];
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 60000,
  });

  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  // Effect to handle external value changes or initial value
  useEffect(() => {
    if (!value) {
      setSelectedUser(null);
    }
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
            <User className="h-4 w-4 text-slate-400" />
            <span className="truncate">
              {selectedUser ? `${selectedUser.name} (@${selectedUser.username})` : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Ad və ya istifadəçi adı..." 
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
                "İstifadəçi tapılmadı"
              )}
            </CommandEmpty>
            <CommandGroup>
              {usersData?.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id.toString()}
                  onSelect={(currentValue) => {
                    const uId = parseInt(currentValue);
                    if (value === uId) {
                      onChange(undefined);
                      setSelectedUser(null);
                    } else {
                      onChange(uId);
                      setSelectedUser(user);
                    }
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-blue-600",
                        value === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">@{user.username}</span>
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
