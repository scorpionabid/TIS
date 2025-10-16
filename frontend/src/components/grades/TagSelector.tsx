import React, { useEffect, useState } from 'react';
import { X, Tags as TagsIcon } from 'lucide-react';
import { gradeTagService } from '@/services/gradeTagService';
import type { GradeTag, GradeTagGroup } from '@/types/gradeTag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTagIds,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [tagGroups, setTagGroups] = useState<GradeTagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<GradeTag[]>([]);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    // Update selected tags when selectedTagIds changes
    if (tagGroups && tagGroups.length > 0) {
      const allTags = tagGroups.flatMap(group => group.tags);
      const selected = allTags.filter(tag => selectedTagIds.includes(tag.id));
      setSelectedTags(selected);
    }
  }, [selectedTagIds, tagGroups]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const groups = await gradeTagService.getTagsGrouped(true);
      setTagGroups(groups);
    } catch (error) {
      console.error('Tag yükləmə xətası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tag: GradeTag) => {
    const isSelected = selectedTagIds.includes(tag.id);
    let newTagIds: number[];

    if (isSelected) {
      newTagIds = selectedTagIds.filter(id => id !== tag.id);
    } else {
      newTagIds = [...selectedTagIds, tag.id];
    }

    onChange(newTagIds);
  };

  const handleRemoveTag = (tagId: number) => {
    const newTagIds = selectedTagIds.filter(id => id !== tagId);
    onChange(newTagIds);
  };

  const getTagColorClass = (color?: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      pink: 'bg-pink-100 text-pink-800 border-pink-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      teal: 'bg-teal-100 text-teal-800 border-teal-200',
      cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return colorMap[color || 'gray'] || colorMap.gray;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            <span className="flex items-center gap-2">
              <TagsIcon className="h-4 w-4" />
              {selectedTags.length > 0
                ? `${selectedTags.length} tag seçildi`
                : 'Tag seçin (məcburi deyil)'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Tag axtar..." />
            <CommandEmpty>Heç bir tag tapılmadı.</CommandEmpty>
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Yüklənir...
                </div>
              ) : tagGroups && tagGroups.length > 0 ? (
                tagGroups.map((group) => (
                  <CommandGroup key={group.category} heading={group.category_name}>
                    {group.tags && group.tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleToggleTag(tag)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Badge
                            variant="outline"
                            className={`${getTagColorClass(tag.color)} text-xs`}
                          >
                            {tag.name}
                          </Badge>
                          {tag.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {tag.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Tag-lar yüklənmədi
                </div>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              className={`${getTagColorClass(tag.color)} gap-1`}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
