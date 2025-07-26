"use client";

import { type Id, api, useCachedQuery, useMutation } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { ArrowLeft } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { FormField, PanelScreen } from "../form-types";
import { OptionEditView } from "./option-edit-view";
import { OptionsManager } from "./options-management";

// Field settings schema
const fieldSettingsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean(),
  unique: z.boolean().optional(),
  visible: z.boolean().optional(),
  default: z
    .union([z.string(), z.number(), z.boolean(), z.literal("no-default")])
    .optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

interface FieldSettingsViewProps {
  campaignId: Id<"campaigns">;
  selectedFieldId: string | null;
  onScreenChange: (screen: PanelScreen) => void;
  onFieldDeleted?: () => void;
  currentScreen: PanelScreen;
}

export const FieldSettingsView = ({
  campaignId,
  selectedFieldId,
  onScreenChange,
  onFieldDeleted,
  currentScreen,
}: FieldSettingsViewProps) => {
  const [selectedOption, setSelectedOption] = useState<{
    label: string;
    value: string;
  } | null>(null);

  const updateFormMutation = useMutation(
    api.collections.forms.mutations.update
  );

  // Get form data directly from Convex
  const form = useCachedQuery(api.collections.forms.queries.getByCampaignId, {
    campaignId,
  });

  const isCampaignPublished = form?.campaign?.publishedAt !== undefined;

  // Convert DB schema to client format
  const formFields: FormField[] = useMemo(() => {
    if (!form?.schema) return [];

    return form.schema.map((field) => ({
      id: field.id,
      title: field.title,
      type: field.type,
      inputType: field.inputType,
      required: field.required,
      unique: field.unique,
      visible: field.visible,
      default: field.default,
      options: field.options,
      placeholder: field.placeholder || "",
      description: field.description || "",
    }));
  }, [form?.schema]);

  const selectedField =
    formFields.find((field) => field.id === selectedFieldId) || null;

  const fieldSettingsForm = useForm<z.infer<typeof fieldSettingsSchema>>({
    resolver: zodResolver(fieldSettingsSchema),
    defaultValues: {
      title: selectedField?.title || "",
      placeholder: selectedField?.placeholder || "",
      description: selectedField?.description || "",
      required: selectedField?.required || false,
      unique: selectedField?.unique || false,
      visible: selectedField?.visible ?? true,
      default: selectedField?.default || "no-default",
      options: selectedField?.options || [],
    },
  });

  // Update form when selected field changes
  useEffect(() => {
    if (selectedField) {
      fieldSettingsForm.reset({
        title: selectedField.title,
        placeholder: selectedField.placeholder || "",
        description: selectedField.description || "",
        required: selectedField.required,
        unique: selectedField.unique,
        visible: selectedField.visible ?? true,
        default: selectedField.default || "no-default",
        options: selectedField.options || [],
      });
    }
  }, [selectedField, fieldSettingsForm.reset]);

  const saveFormFields = async (newFields: FormField[]) => {
    if (!form || !form._id) return;

    try {
      const dbSchema = newFields.map((field) => ({
        id: field.id,
        title: field.title,
        placeholder: field.placeholder || undefined,
        description: field.description || undefined,
        type: field.type,
        inputType: field.inputType,
        required: field.required,
        unique: field.unique,
        visible: field.visible,
        default: field.default,
        options: field.options,
      }));

      await updateFormMutation({
        id: form._id,
        schema: dbSchema,
      });
    } catch {
      toast.error("Failed to save form", {
        description: "Please try again",
      });
    }
  };

  const onFieldSettingsSubmit = async (
    data: z.infer<typeof fieldSettingsSchema>
  ) => {
    if (!selectedField) return;

    // Helper function to convert "no-default" back to undefined
    const convertDefault = (
      value: string | number | boolean | "no-default" | undefined
    ) => {
      return value === "no-default" ? undefined : value;
    };

    const updatedFields = formFields.map((field) =>
      field.id === selectedField.id
        ? {
            ...field,
            title: data.title,
            placeholder: data.placeholder || "",
            description: data.description || "",
            required: data.required,
            unique: data.unique || false,
            visible: data.visible ?? true,
            // Convert "no-default" back to undefined when saving
            default: convertDefault(data.default),
            options: data.options?.length ? data.options : undefined,
          }
        : field
    );

    await saveFormFields(updatedFields);
    onScreenChange("form-settings");
    toast.success("Field updated successfully");
  };

  const handleDeleteField = async () => {
    if (!selectedField) return;

    if (isCampaignPublished) {
      toast.error("Cannot delete field from published campaign");
      return;
    }

    const updatedFields = formFields.filter(
      (field) => field.id !== selectedField.id
    );
    await saveFormFields(updatedFields);
    onFieldDeleted?.();
    onScreenChange("form-settings");
    toast.success("Field deleted successfully");
  };

  const handleOptionSave = async (
    updatedOption: { label: string; value: string },
    originalValue: string
  ) => {
    if (!selectedField) return;

    const currentOptions = selectedField.options || [];
    const updatedOptions = currentOptions.map((option) =>
      option.value === originalValue ? updatedOption : option
    );

    const updatedFields = formFields.map((field) =>
      field.id === selectedField.id
        ? { ...field, options: updatedOptions }
        : field
    );

    await saveFormFields(updatedFields);

    // Update form state
    fieldSettingsForm.setValue("options", updatedOptions);
  };

  const handleOptionDelete = async (value: string) => {
    if (!selectedField) return;

    const currentOptions = selectedField.options || [];
    const updatedOptions = currentOptions.filter(
      (option) => option.value !== value
    );

    const updatedFields = formFields.map((field) =>
      field.id === selectedField.id
        ? { ...field, options: updatedOptions }
        : field
    );

    await saveFormFields(updatedFields);

    // Update form state
    fieldSettingsForm.setValue("options", updatedOptions);
  };

  // Handle option selection
  const handleOptionSelect = (option: { label: string; value: string }) => {
    setSelectedOption(option);
  };

  // Handle screen changes
  const handleScreenChange = (screen: PanelScreen) => {
    if (screen !== "option-edit") {
      setSelectedOption(null);
    }
    onScreenChange(screen);
  };

  // Render option edit screen
  if (currentScreen === "option-edit") {
    return (
      <OptionEditView
        option={selectedOption}
        allOptions={selectedField?.options || []}
        onScreenChange={handleScreenChange}
        onSave={handleOptionSave}
        onDelete={handleOptionDelete}
      />
    );
  }

  if (!selectedField) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex gap-2 items-center mb-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onScreenChange("form-settings")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">Field Settings</h2>
        </div>
        <div className="flex flex-1 justify-center items-center">
          <p className="text-sm text-muted-foreground">No field selected</p>
        </div>
      </div>
    );
  }

  // Helper function to render default value input based on field type
  const renderDefaultValueInput = () => {
    const { inputType, options } = selectedField;

    if (inputType === "select" || inputType === "radio") {
      return (
        <FormFieldComponent
          control={fieldSettingsForm.control}
          name="default"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Value</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={(field.value as string) || "no-default"}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue placeholder="No default selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-default">No default</SelectItem>
                    {options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (inputType === "checkbox") {
      return (
        <FormFieldComponent
          control={fieldSettingsForm.control}
          name="default"
          render={({ field }) => (
            <FormItem className="flex justify-between items-center p-3 rounded-lg border bg-muted">
              <div className="leading-none space-y-0.5">
                <FormLabel>Default Value</FormLabel>
                <div className="text-xs text-muted-foreground">
                  Default checkbox state
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={
                    field.value === "no-default"
                      ? false
                      : (field.value as boolean) || false
                  }
                  onCheckedChange={(checked) => {
                    field.onChange(checked ? true : "no-default");
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      );
    }

    if (inputType === "number") {
      return (
        <FormFieldComponent
          control={fieldSettingsForm.control}
          name="default"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Value</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  className="h-8"
                  placeholder="Default number"
                  value={
                    field.value === "no-default"
                      ? ""
                      : (field.value as number) || ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? Number(value) : "no-default");
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    // Text-based inputs
    return (
      <FormFieldComponent
        control={fieldSettingsForm.control}
        name="default"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default Value</FormLabel>
            <FormControl>
              <Input
                className="h-8"
                placeholder="Default text"
                value={
                  field.value === "no-default"
                    ? ""
                    : (field.value as string) || ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value || "no-default");
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex gap-2 justify-between items-center px-4 py-3 border-b bg-muted">
        <div className="flex gap-2 items-center">
          <Button
            size="iconXs"
            variant="outline"
            className="!p-1.5"
            onClick={() => onScreenChange("form-settings")}
          >
            <ArrowLeft className="size-3" />
          </Button>
          <h2 className="font-semibold">{selectedField.title}</h2>
        </div>
        <Badge variant="outline" className="text-xs capitalize">
          {selectedField.inputType}
        </Badge>
      </div>

      <div className="overflow-y-auto flex-1 p-4 min-h-0">
        <Form {...fieldSettingsForm}>
          <form
            onSubmit={fieldSettingsForm.handleSubmit(onFieldSettingsSubmit)}
            className="space-y-4"
          >
            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Title</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="Enter field title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="placeholder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholder Text</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="Enter placeholder text"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Field description (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="required"
              render={({ field }) => (
                <FormItem className="flex justify-between items-center p-3 rounded-lg border bg-muted">
                  <div className="leading-none space-y-0.5">
                    <FormLabel>Required Field</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Users must fill this field
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="unique"
              render={({ field }) => (
                <FormItem className="flex justify-between items-center p-3 rounded-lg border bg-muted">
                  <div className="space-y-0.5 leading-none">
                    <FormLabel>Unique Field</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Prevent duplicate values
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormFieldComponent
              control={fieldSettingsForm.control}
              name="visible"
              render={({ field }) => (
                <FormItem className="flex justify-between items-center p-3 rounded-lg border bg-muted">
                  <div className="space-y-0.5 leading-none">
                    <FormLabel>Visible Field</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Show field to users (uncheck for hidden inputs)
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Default Value Section */}
            {renderDefaultValueInput()}

            {(selectedField.inputType === "select" ||
              selectedField.inputType === "radio") && (
              <FormFieldComponent
                control={fieldSettingsForm.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <OptionsManager
                      options={field.value || []}
                      onChange={field.onChange}
                      onScreenChange={handleScreenChange}
                      onOptionSelect={handleOptionSelect}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 items-center pt-4">
              <Button
                size="sm"
                variant="outline"
                type="submit"
                disabled={fieldSettingsForm.formState.isSubmitting}
                className="w-full"
              >
                Save Changes
              </Button>
              <Button
                onClick={handleDeleteField}
                size="sm"
                variant="ghost"
                type="button"
                disabled={fieldSettingsForm.formState.isSubmitting}
                className="w-full text-destructive"
              >
                Delete Field
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
