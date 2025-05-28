"use client";

import { LAST_THEMES } from "@/lib/theme/constants";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@firebuzz/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@firebuzz/ui/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Check, ChevronDown, Shuffle } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useState } from "react";

interface TemplateSectionProps {
  onTemplateSelect: (templateId: string) => void;
  selectedTemplate?: string;
  isLoading?: boolean;
}

export const TemplateSection = ({
  onTemplateSelect,
  selectedTemplate,
  isLoading = false,
}: TemplateSectionProps) => {
  const [open, setOpen] = useState(false);

  const selectedTheme = LAST_THEMES.find(
    (theme) => theme.id === selectedTemplate
  );

  const selectRandomTheme = () => {
    let randomIndex = Math.floor(Math.random() * LAST_THEMES.length);
    while (LAST_THEMES[randomIndex].id === selectedTemplate) {
      randomIndex = Math.floor(Math.random() * LAST_THEMES.length);
    }
    onTemplateSelect(LAST_THEMES[randomIndex].id);
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-4 border-b">
      <div>
        <h2 className="text-lg font-medium">Theme Template</h2>
        <p className="text-sm text-muted-foreground">
          Select a theme template to get started
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={open}
              className="justify-between w-full font-normal text-left"
              disabled={isLoading}
            >
              <div className="flex items-center flex-1 min-w-0 gap-3">
                {selectedTheme ? (
                  <>
                    {/* Color swatches */}
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedTheme.colors.slice(0, 4).map((color, index) => (
                        <div
                          key={`${selectedTheme.id}-${color}-${index}`}
                          className="border rounded-sm size-3"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {selectedTheme.name}
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Select a template...
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search templates..." className="h-9" />
              <CommandList>
                <CommandEmpty>No templates found.</CommandEmpty>
                <CommandGroup>
                  {LAST_THEMES.map((theme) => (
                    <CommandItem
                      key={theme.id}
                      value={theme.id}
                      onSelect={() => {
                        onTemplateSelect(theme.id);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center w-full gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">
                              {theme.name}
                            </div>
                            {/* Color swatches */}
                            <div className="flex items-center gap-1 shrink-0">
                              {theme.colors.slice(0, 4).map((color, index) => (
                                <Tooltip
                                  key={`${theme.id}-${color}-${index}`}
                                  disableHoverableContent
                                >
                                  <TooltipTrigger asChild>
                                    <div
                                      className="border rounded-sm size-3"
                                      style={{ backgroundColor: color }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs"
                                  >
                                    {color}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {theme.description}
                          </div>
                        </div>

                        <Check
                          className={cn(
                            "ml-auto h-4 w-4 shrink-0",
                            selectedTemplate === theme.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="iconSm" onClick={selectRandomTheme}>
              <Shuffle className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={10} align="end">
            Shuffle Theme
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
