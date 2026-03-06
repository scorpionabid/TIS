import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CheckSquare, RefreshCw, GraduationCap, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';

interface ModernTopBarProps {
  classCount: number;
  selectedDate: string;
  onDateChange: (value: string) => void;
  onMarkAllPresent: (session: 'morning' | 'evening') => void;
  onRefresh: () => void;
}

const ModernTopBar: React.FC<ModernTopBarProps> = ({
  classCount,
  selectedDate,
  onDateChange,
  onMarkAllPresent,
  onRefresh,
}) => {
  const [open, setOpen] = useState(false);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onDateChange(`${year}-${month}-${day}`);
      setOpen(false);
    }
  };

  const getSelectedDate = () => {
    if (!selectedDate) return undefined;
    const [year, month, day] = selectedDate.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 bg-gradient-to-r from-[#5c6bc0] to-[#7c83ec] text-white font-semibold text-xs rounded-xl shadow-[0_3px_10px_rgba(92,107,192,0.25)] hover:shadow-[0_5px_16px_rgba(92,107,192,0.35)] hover:-translate-y-0.5 transition-all"
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Hamısını dərsdə işarələ
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl">
            <DropdownMenuItem
              onClick={() => onMarkAllPresent('morning')}
              className="text-xs font-medium cursor-pointer"
            >
              İlk dərs üçün işarələ
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMarkAllPresent('evening')}
              className="text-xs font-medium cursor-pointer"
            >
              Son dərs üçün işarələ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#e8f5e9] to-[#c8e6c9] text-[#2e7d32] text-[13px] font-bold cursor-pointer hover:-translate-y-0.5 transition-transform">
          <GraduationCap className="h-4 w-4" />
          {classCount} aktiv sinif
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 px-3.5 py-1.5 h-auto rounded-xl bg-gradient-to-r from-[#e8f0fe] to-[#ede7f6] text-[#3949ab] text-[13px] font-bold hover:-translate-y-0.5 transition-transform hover:bg-gradient-to-r hover:from-[#e8f0fe] hover:to-[#ede7f6]"
            >
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span>{formatDisplayDate(selectedDate)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={getSelectedDate()}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ModernTopBar;
