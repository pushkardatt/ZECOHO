import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  testId?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select...",
  testId = "multi-select",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter((v) => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find((o) => o.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="min-w-[160px]">
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-9 px-3 font-normal"
            data-testid={`${testId}-trigger`}
          >
            <span className="truncate text-left flex-1">
              {getDisplayText()}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {selectedValues.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-xs"
                  data-testid={`${testId}-count`}
                >
                  {selectedValues.length}
                </Badge>
              )}
              {selectedValues.length > 0 ? (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={clearSelection}
                  data-testid={`${testId}-clear`}
                />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-1">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 rounded-md hover-elevate cursor-pointer"
                  onClick={() => toggleValue(option.value)}
                  data-testid={`${testId}-option-${option.value}`}
                >
                  <Checkbox
                    id={`${testId}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={() => toggleValue(option.value)}
                    data-testid={`${testId}-checkbox-${option.value}`}
                  />
                  <label
                    htmlFor={`${testId}-${option.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          {selectedValues.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onSelectionChange([]);
                  setOpen(false);
                }}
                data-testid={`${testId}-clear-all`}
              >
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
