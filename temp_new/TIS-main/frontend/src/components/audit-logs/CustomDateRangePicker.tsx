import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { addDays, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { az } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CustomDateRangePickerProps {
  value: { from?: Date; to?: Date } | undefined
  onChange: (range: { from?: Date; to?: Date } | undefined) => void
  className?: string
}

export function CustomDateRangePicker({
  value,
  onChange,
  className,
}: CustomDateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    value ? { from: value.from, to: value.to } : undefined
  )

  // Sync internal state with external value if needed
  React.useEffect(() => {
    if (value) {
      setDate({ from: value.from, to: value.to })
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleSelect = (selectedRange: DateRange | undefined) => {
    setDate(selectedRange)
    onChange(selectedRange ? { from: selectedRange.from, to: selectedRange.to } : undefined)
  }

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
    onChange(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-10 border-slate-200",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            <span className="truncate flex-1">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd MMM yyyy", { locale: az })} -{" "}
                    {format(date.to, "dd MMM yyyy", { locale: az })}
                  </>
                ) : (
                  format(date.from, "dd MMM yyyy", { locale: az })
                )
              ) : (
                <span>Tarix aralığı seçin</span>
              )}
            </span>
            {date && (
              <X 
                className="ml-2 h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer" 
                onClick={clearDate}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={1} // Keep it compact for single column layout, but can be 2 for wider
            locale={az}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
