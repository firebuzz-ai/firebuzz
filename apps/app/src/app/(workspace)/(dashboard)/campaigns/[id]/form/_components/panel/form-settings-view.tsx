"use client";

import type { FormNodeData } from "@/components/canvas/forms/nodes/form-node";
import { PanelHeader } from "@/components/ui/panel-header";
import type { Id } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormField as FormFieldComponent,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Plus, Settings } from "@firebuzz/ui/icons/lucide";
import { useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useNodes, useReactFlow } from "@xyflow/react";
import { useMemo } from "react";
import { z } from "zod";
import type { PanelScreen } from "../form-types";
import { SchemaList } from "./schema-list";

// Form settings schema - only for properties that exist in the database
const formSettingsSchema = z.object({
  submitButtonText: z.string().optional(),
  successMessage: z.string().optional(),
  successRedirectUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

interface FormSettingsViewProps {
  campaignId: Id<"campaigns">;
  formId: Id<"forms">;
  onScreenChange: (screen: PanelScreen) => void;
  onFieldSelect?: (fieldId: string) => void;
}

export const FormSettingsView = ({
  campaignId,
  formId,
  onScreenChange,
  onFieldSelect,
}: FormSettingsViewProps) => {
  // Canvas-only approach - modify node data directly
  const nodes = useNodes();

  const formNode = useMemo(
    () => nodes?.find((n) => n.type === "form"),
    [nodes]
  );

  // Update React Flow state - canvas will detect and sync to server
  const { updateNodeData } = useReactFlow();

  const updateFormData = (updatedNodeData: FormNodeData) => {
    if (!formNode) return;

    // Use updateNodeData like campaigns do - this triggers onNodesChange
    updateNodeData(formNode.id, updatedNodeData);
  };

  // Get current form settings from node data
  const currentFormSettings = useMemo(() => {
    if (formNode) {
      const nodeData = formNode.data as unknown as FormNodeData;
      return {
        submitButtonText: nodeData.submitButtonText || "",
        successMessage: nodeData.successMessage || "",
        successRedirectUrl: nodeData.successRedirectUrl || "",
      };
    }
    return {
      submitButtonText: "",
      successMessage: "",
      successRedirectUrl: "",
    };
  }, [formNode]);

  // Form for form settings
  const formSettingsForm = useForm<z.infer<typeof formSettingsSchema>>({
    resolver: zodResolver(formSettingsSchema),
    values: currentFormSettings,
  });

  // Canvas-only save function with optimistic updates
  const saveSettings = () => {
    if (!formNode || !formId) return;

    const data = formSettingsForm.getValues();
    const nodeData = formNode.data as unknown as FormNodeData;

    // Check if data has actually changed to prevent unnecessary updates
    const newSubmitButtonText = data.submitButtonText || "Submit";
    const newSuccessMessage = data.successMessage || "Thank you!";
    const newSuccessRedirectUrl = data.successRedirectUrl || "";

    const hasChanged = 
      nodeData.submitButtonText !== newSubmitButtonText ||
      nodeData.successMessage !== newSuccessMessage ||
      nodeData.successRedirectUrl !== newSuccessRedirectUrl;

    if (!hasChanged) return;

    // Update React Flow state directly - canvas will sync to server
    updateFormData({
      ...nodeData,
      submitButtonText: newSubmitButtonText,
      successMessage: newSuccessMessage,
      successRedirectUrl: newSuccessRedirectUrl,
    });
  };

  const handleFieldSelect = (fieldId: string) => {
    onFieldSelect?.(fieldId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PanelHeader
        icon={Settings}
        title="Form Settings"
        description="Configure your form fields and settings"
      />

      <div className="flex overflow-y-auto flex-col flex-1 max-h-full">
        {/* Form Fields Section */}
        <div className="p-4 space-y-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Schema</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="iconXs"
                  variant="outline"
                  onClick={() => onScreenChange("input-types")}
                >
                  <Plus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add New Field</TooltipContent>
            </Tooltip>
          </div>

          <SchemaList
            campaignId={campaignId}
            formId={formId}
            onScreenChange={onScreenChange}
            onFieldSelect={handleFieldSelect}
          />
        </div>
        {/* Form Settings */}
        <Form {...formSettingsForm}>
          <form className="p-4 space-y-4">
            <FormFieldComponent
              control={formSettingsForm.control}
              name="submitButtonText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submit Button Text</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="Submit"
                      {...field}
                      onBlur={saveSettings}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={formSettingsForm.control}
              name="successMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Thank you for your submission!"
                      {...field}
                      onBlur={saveSettings}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={formSettingsForm.control}
              name="successRedirectUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Redirect URL{" "}
                    <span className="text-xs text-muted-foreground">
                      (Optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="https://example.com/thank-you"
                      {...field}
                      onBlur={saveSettings}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </div>
  );
};
