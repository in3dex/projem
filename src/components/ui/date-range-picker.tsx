"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { tr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { type Locale } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  align?: "center" | "start" | "end";
  locale?: Locale;
  placeholder?: string;
  selected?: DateRange | undefined;
  onSelect?: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  align = "center",
  locale = tr,
  placeholder = "Tarih aralığı seçin",
  selected,
  onSelect,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    dateRange || selected
  );

  const handleSelect = React.useCallback(
    (selectedDateRange: DateRange | undefined) => {
      setDate(selectedDateRange);
      if (onSelect) {
        onSelect(selectedDateRange);
      }
      if (onDateRangeChange) {
        onDateRangeChange(selectedDateRange);
      }
    },
    [onSelect, onDateRangeChange]
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale })} -{" "}
                  {format(date.to, "LLL dd, y", { locale })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 