import { Button } from "@firebuzz/ui/components/ui/button";
import { FormLabel } from "@firebuzz/ui/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { ArrowRight, GripVertical, Plus } from "@firebuzz/ui/icons/lucide";
import { Reorder } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PanelScreen } from "../form-types";

// Internal option type using value as ID
interface OptionWithId {
  id: string; // This will be the same as value
  label: string;
  value: string;
}

// Options Manager Component
interface OptionsManagerProps {
  options: { label: string; value: string }[];
  onChange: (options: { label: string; value: string }[]) => void;
  onScreenChange: (screen: PanelScreen) => void;
  onOptionSelect: (option: { label: string; value: string }) => void;
}

export const OptionsManager = ({
  options,
  onChange,
  onScreenChange,
  onOptionSelect,
}: OptionsManagerProps) => {
  const isDraggingRef = useRef(false);
  const [internalOptions, setInternalOptions] = useState<OptionWithId[]>([]);

  // Convert external options to internal format using value as ID
  useEffect(() => {
    const newInternalOptions = options.map((option) => ({
      id: option.value, // Use value as ID
      label: option.label,
      value: option.value,
    }));

    setInternalOptions(newInternalOptions);
  }, [options]);

  // Update external options when internal options change
  const updateExternalOptions = (newInternalOptions: OptionWithId[]) => {
    const externalOptions = newInternalOptions.map(({ label, value }) => ({
      label,
      value,
    }));
    onChange(externalOptions);
  };

  const addOption = () => {
    // Generate a unique value for the new option
    let newValue = `option${internalOptions.length + 1}`;
    let counter = internalOptions.length + 1;

    // Ensure the value is unique
    while (internalOptions.some((option) => option.value === newValue)) {
      counter++;
      newValue = `option${counter}`;
    }

    const newOption: OptionWithId = {
      id: newValue, // Use value as ID
      label: `Option ${counter}`,
      value: newValue,
    };

    const newOptions = [...internalOptions, newOption];
    setInternalOptions(newOptions);
    updateExternalOptions(newOptions);

    // Navigate to edit screen for the new option
    onOptionSelect({ label: newOption.label, value: newOption.value });
    onScreenChange("option-edit");
  };

  const handleReorder = (newOrder: OptionWithId[]) => {
    setInternalOptions(newOrder);
    updateExternalOptions(newOrder);
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = () => {
    // Add a small delay to prevent other interactions during drag
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleOptionClick = (option: OptionWithId) => {
    // Prevent click during drag operation
    if (isDraggingRef.current) {
      return;
    }

    onOptionSelect({ label: option.label, value: option.value });
    onScreenChange("option-edit");
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <FormLabel>Options</FormLabel>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="iconXs"
                variant="outline"
                onClick={addOption}
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add new option</TooltipContent>
          </Tooltip>
        </div>

        {internalOptions.length === 0 ? (
          <div className="py-8 text-sm text-center rounded-lg border-2 border-dashed text-muted-foreground">
            No options yet. Click "Add Option" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            <Reorder.Group
              axis="y"
              values={internalOptions}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {internalOptions.map((option) => (
                <Reorder.Item
                  key={option.id}
                  value={option}
                  className="rounded-lg border transition-colors cursor-pointer bg-background hover:bg-muted/50 group"
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  whileDrag={{
                    scale: 1.02,
                    zIndex: 50,
                    backgroundColor: "hsl(var(--muted))",
                    borderColor: "hsl(var(--muted-foreground) / 0.2)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                  dragTransition={{
                    bounceStiffness: 600,
                    bounceDamping: 20,
                  }}
                  onClick={() => handleOptionClick(option)}
                >
                  <div className="flex gap-2 items-center p-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="cursor-grab active:cursor-grabbing"
                          onClick={(e) => e.stopPropagation()} // Prevent option click when dragging
                        >
                          <GripVertical className="w-4 h-4 transition-colors text-muted-foreground group-hover:text-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Drag to reorder</TooltipContent>
                    </Tooltip>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-foreground">
                        {option.label}
                      </div>
                    </div>

                    <div className="flex gap-1 items-center">
                      <ArrowRight className="w-0 h-0 opacity-0 transition-all duration-200 ease-out text-muted-foreground group-hover:w-4 group-hover:h-4 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
