"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ComboboxProps'u daha genel hale getirelim ve onSelect'i value yerine value|null alacak şekilde ayarlayalım
export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null; // null değeri de kabul etsin (seçim yok durumu)
  onSelect: (value: string | null) => void; // null değeri de dönebilsin
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  disabled?: boolean;
  triggerIcon?: React.ReactNode; // Opsiyonel ikon
  className?: string; // Tetikleyici buton için ekstra class
}

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  notFoundMessage = "No options found.",
  disabled = false,
  triggerIcon,
  className
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)} // className eklendi
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
           {triggerIcon ? triggerIcon : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Arama label üzerinden yapılır
                  onSelect={(currentLabel: string) => {
                    // Label'dan value'yu bul
                    const selectedValue = options.find(opt => opt.label.toLowerCase() === currentLabel.toLowerCase())?.value ?? null;
                    onSelect(selectedValue) // Seçilen value'yu (veya null) döndür
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 