"use client";

import { useFormContext } from "../form-provider";
import { type Id, api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ArrowRight, GripVertical } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { Reorder } from "motion/react";
import { useMemo, useRef } from "react";
import type { FormField, PanelScreen } from "../form-types";

interface SchemaListProps {
  campaignId: Id<"campaigns">;
  onScreenChange: (screen: PanelScreen) => void;
  onFieldSelect: (fieldId: string) => void;
}

export const SchemaList = ({
  campaignId,
  onScreenChange,
  onFieldSelect,
}: SchemaListProps) => {
  const { setSaveStatus } = useFormContext();
  const updateFormMutation = useMutation(
    api.collections.forms.mutations.update
  );
  const isDraggingRef = useRef(false);

  // Get form data directly from Convex
  const form = useCachedQuery(api.collections.forms.queries.getByCampaignId, {
    campaignId,
  });

  // Convert DB schema to client format
  const formFields: FormField[] = useMemo(() => {
    if (!form?.schema) return [];

    return form.schema.map((field) => ({
      id: field.id,
      title: field.title,
      type: field.type,
      inputType: field.inputType,
      required: field.required,
      visible: field.visible,
      unique: field.unique,
      default: field.default,
      options: field.options,
      placeholder: field.placeholder,
      description: field.description,
    }));
  }, [form?.schema]);

  const saveFormFields = async (newFields: FormField[]) => {
    if (!form || !form._id) return;

    const dbSchema = newFields.map((field) => ({
      id: field.id,
      title: field.title,
      placeholder: field.placeholder,
      description: field.description,
      visible: field.visible,
      type: field.type,
      inputType: field.inputType,
      required: field.required,
      unique: field.unique,
      default: field.default,
      options: field.options,
    }));

    await updateFormMutation({
      id: form._id,
      schema: dbSchema,
    });
  };

  const handleReorder = async (newOrder: FormField[]) => {
    setSaveStatus("saving");
    
    try {
      await saveFormFields(newOrder);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      toast.error("Failed to reorder fields", {
        description: "Please try again",
      });
    }
  };

  const handleFieldClick = (fieldId: string) => {
    // Prevent click during drag operation
    if (isDraggingRef.current) {
      return;
    }
    onFieldSelect(fieldId);
    onScreenChange("field-settings");
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = () => {
    // Add a small delay to prevent click event from firing immediately after drag
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  if (!form) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (formFields.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-32 rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">No fields added yet</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onScreenChange("input-types")}
          className="mt-2"
        >
          Add your first field
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Reorder.Group
        axis="y"
        values={formFields}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {formFields.map((field) => (
          <Reorder.Item
            key={field.id}
            value={field}
            className="flex justify-between items-center px-2 py-1.5 rounded-lg border cursor-pointer group hover:bg-muted/50 hover:border-muted-foreground/10"
            onClick={() => handleFieldClick(field.id)}
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
          >
            <div className="flex flex-1 gap-3 items-center">
              <GripVertical className="size-3.5 transition-colors text-muted-foreground cursor-grab active:cursor-grabbing group-hover:text-foreground" />
              <div className="flex gap-2 justify-between items-center w-full">
                <div
                  className="text-sm font-medium transition-colors text-foreground group-hover:text-foreground truncate max-w-[120px]"
                  title={field.title}
                >
                  {field.title}
                </div>
                <div className="flex flex-shrink-0 gap-2 items-center">
                  <Badge
                    variant="outline"
                    className="text-xs capitalize transition-all duration-200 ease-out bg-muted group-hover:translate-x-1 group-hover:bg-background"
                  >
                    {field.inputType}
                  </Badge>
                  <ArrowRight className="w-0 h-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:w-3.5 group-hover:h-3.5 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-foreground" />
                </div>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};
