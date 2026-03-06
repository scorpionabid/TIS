import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Check,
  ChevronsUpDown,
  Target,
  Calendar,
  Users,
  Search,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublishedSurvey } from '@/services/surveyApproval';
import { Survey } from '@/services/surveys';

/**
 * UnifiedSurveySelector handles survey selection across different approval modules.
 * It provides a searchable dropdown (Combobox) to easily find surveys when lists are long.
 */

type GenericSurvey = (PublishedSurvey | Survey) & {
  status?: string;
  response_count?: number;
  max_responses?: number;
};

interface UnifiedSurveySelectorProps {
  surveys: GenericSurvey[] | undefined;
  selectedSurvey: GenericSurvey | null;
  onSurveySelect: (survey: GenericSurvey) => void;
  isLoading?: boolean;
  className?: string;
}

const UnifiedSurveySelector: React.FC<UnifiedSurveySelectorProps> = ({
  surveys = [],
  selectedSurvey,
  onSurveySelect,
  isLoading = false,
  className
}) => {
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "outline" | "destructive" }> = {
      'published': { label: 'Aktiv', variant: 'default' },
      'paused': { label: 'Dayandırılıb', variant: 'outline' },
      'draft': { label: 'Qaralama', variant: 'secondary' },
      'archived': { label: 'Arxiv', variant: 'outline' }
    };

    const config = statusMap[status] || { label: status, variant: 'secondary' };
    
    return (
      <Badge variant={config.variant} className="text-[10px] h-4 px-1 leading-none">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="overflow-hidden border-primary/20 bg-card/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Target className="h-4 w-4" />
                Sorğu Seçimi
              </label>
              
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-background hover:bg-muted/50 border-primary/20 text-left font-normal"
                    disabled={isLoading}
                  >
                    <span className="truncate">
                      {selectedSurvey 
                        ? selectedSurvey.title 
                        : (isLoading ? "Yüklənir..." : "Sorğu axtarın və ya seçin...")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command className="w-full">
                    <CommandInput placeholder="Sorğu adını yazın..." />
                    <CommandList>
                      <CommandEmpty>Sorğu tapılmadı.</CommandEmpty>
                      <CommandGroup>
                        {surveys.map((survey) => (
                          <CommandItem
                            key={survey.id}
                            value={survey.title}
                            onSelect={() => {
                              onSurveySelect(survey);
                              setOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSurvey?.id === survey.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate font-medium">{survey.title}</span>
                              <span className="text-xs text-muted-foreground truncate italic">
                                ID: {survey.id} • {formatDate(survey.start_date)}
                              </span>
                            </div>
                            {survey.status && (
                                <div className="ml-auto flex items-center gap-1">
                                    {getStatusBadge(survey.status)}
                                </div>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedSurvey && (
              <div className="flex-none flex flex-row md:flex-col justify-between items-end gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>{formatDate(selectedSurvey.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                      {((selectedSurvey as PublishedSurvey).target_institutions?.length) || 
                       (selectedSurvey as Survey).response_count || 0} müəssisə
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-primary">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{(selectedSurvey as PublishedSurvey).current_questions_count || selectedSurvey.questions?.length || 0} sual</span>
                  </div>
                  {selectedSurvey.status && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>{selectedSurvey.status === 'published' ? 'Aktiv' : 'Dayandırılıb'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedSurvey?.description && (
            <div className="mt-3 p-2 bg-muted/40 rounded border italic text-xs text-muted-foreground flex items-start gap-2">
              <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-50" />
              <p className="line-clamp-2 leading-relaxed">{selectedSurvey.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedSurveySelector;
