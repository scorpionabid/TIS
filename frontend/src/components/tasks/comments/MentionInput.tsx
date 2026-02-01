/**
 * MentionInput Component
 *
 * Textarea with @mention autocomplete support
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";

interface MentionableUser {
  id: number;
  name: string;
  username?: string;
  email?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  taskId?: number;
  rows?: number;
}

// Fetch mentionable users
const fetchMentionableUsers = async (taskId?: number): Promise<MentionableUser[]> => {
  const params = taskId ? { task_id: taskId } : {};
  const response = await apiClient.get<{ data: MentionableUser[] }>("/users/mentionable", params);
  return response.data || [];
};

export function MentionInput({
  value,
  onChange,
  placeholder = "Şərhinizi yazın... (@ilə istifadəçi taq edin)",
  disabled = false,
  className,
  taskId,
  rows = 3,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });

  // Fetch mentionable users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["mentionable-users", taskId],
    queryFn: () => fetchMentionableUsers(taskId),
    enabled: isOpen,
  });

  // Filter users based on query
  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return users;

    const query = mentionQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, mentionQuery]);

  // Handle text change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      onChange(newValue);

      // Check for @ mention trigger
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Check if there's a space or beginning before @
        const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
        if (lastAtIndex === 0 || charBeforeAt === " " || charBeforeAt === "\n") {
          const query = textBeforeCursor.substring(lastAtIndex + 1);

          // Only trigger if no space after @
          if (!query.includes(" ")) {
            setMentionStartIndex(lastAtIndex);
            setMentionQuery(query);
            setIsOpen(true);

            // Calculate cursor position for popover
            if (textareaRef.current) {
              const textarea = textareaRef.current;
              const rect = textarea.getBoundingClientRect();
              // Simple positioning - in real app, use a library for accurate position
              setCursorPosition({
                top: rect.bottom,
                left: rect.left + 20,
              });
            }
            return;
          }
        }
      }

      setIsOpen(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    },
    [onChange]
  );

  // Handle user selection
  const handleSelectUser = useCallback(
    (user: MentionableUser) => {
      if (mentionStartIndex === -1) return;

      // Replace @query with @[Full Name]
      const before = value.substring(0, mentionStartIndex);
      const after = value.substring(mentionStartIndex + mentionQuery.length + 1);
      const newValue = `${before}@[${user.name}] ${after}`;

      onChange(newValue);
      setIsOpen(false);
      setMentionQuery("");
      setMentionStartIndex(-1);

      // Focus back on textarea
      textareaRef.current?.focus();
    },
    [value, mentionStartIndex, mentionQuery, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        setMentionQuery("");
        setMentionStartIndex(-1);
        e.preventDefault();
      }
    },
    [isOpen]
  );

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn("resize-none", className)}
      />

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor className="absolute" style={{ top: 0, left: 0 }} />
        <PopoverContent
          className="p-0 w-[280px]"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>İstifadəçi tapılmadı</CommandEmpty>
                  <CommandGroup heading="İstifadəçilər">
                    {filteredUsers.slice(0, 10).map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.name}
                        onSelect={() => handleSelectUser(user)}
                        className="cursor-pointer"
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.name}</span>
                          {user.email && (
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper to parse and highlight mentions in text
export function parseMentions(text: string): React.ReactNode {
  const mentionPattern = /@\[([^\]]+)\]|@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add mention with highlight
    const mentionText = match[1] || match[2];
    parts.push(
      <span
        key={match.index}
        className="text-primary font-medium bg-primary/10 px-1 rounded"
      >
        @{mentionText}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
