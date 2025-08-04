"use client";

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
import { z } from "zod";
import { useFormSettings, useFormState } from "../../_store/hooks";
import type { FormSettings } from "../../_store/types";
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
  onScreenChange: (screen: PanelScreen) => void;
  onFieldSelect?: (fieldId: string) => void;
}

export const FormSettingsView = ({
  campaignId,
  onScreenChange,
  onFieldSelect,
}: FormSettingsViewProps) => {
  const { formData } = useFormState(campaignId);
  const { formSettings, updateSettings } = useFormSettings();

  // Form for form settings
  const formSettingsForm = useForm<z.infer<typeof formSettingsSchema>>({
    resolver: zodResolver(formSettingsSchema),
    values: formSettings, // Use values instead of defaultValues for controlled updates
  });

  // Manual save function for form settings
  const saveSettings = () => {
    const data = formSettingsForm.getValues();
    updateSettings(data as FormSettings);
  };

  const handleFieldSelect = (fieldId: string) => {
    onFieldSelect?.(fieldId);
  };

  if (!formData) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
                    <Input className="h-8" placeholder="Submit" {...field} onBlur={saveSettings} />
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
