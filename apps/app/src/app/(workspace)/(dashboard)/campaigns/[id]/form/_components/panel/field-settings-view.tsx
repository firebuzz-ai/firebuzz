"use client";

import { useFormAutoSave } from "@/hooks/ui/use-form-auto-save";
import { useFormContext } from "../form-provider";
import { type Id, api, useCachedQuery, useMutation } from "@firebuzz/convex";
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
import { ArrowLeft } from "@firebuzz/ui/icons/lucide";
import { useForm, zodResolver } from "@firebuzz/ui/lib/utils";
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
  unique: z.boolean(),
  visible: z.boolean(),
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
  const { setSaveStatus, registerGlobalSave, unregisterGlobalSave } = useFormContext();
  const [selectedOption, setSelectedOption] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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
      visible: field.visible ?? true,
      default: field.default,
      options: field.options,
      placeholder: field.placeholder,
      description: field.description,
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

  // Auto-save hook
  const { status, resetWithoutAutoSave, saveNow } = useFormAutoSave({
    form: fieldSettingsForm,
    onSave: async (data) => {
      if (!selectedField || !form) return;

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
    },
    delay: 5000, // 5 seconds for field updates
    enabled: !!selectedField && !!form,
  });

  // Update global save status
  useEffect(() => {
    setSaveStatus(status);
  }, [status, setSaveStatus]);

  // Register/unregister global save function
  useEffect(() => {
    if (selectedField) {
      registerGlobalSave(saveNow);
      return () => unregisterGlobalSave();
    }
  }, [selectedField, saveNow, registerGlobalSave, unregisterGlobalSave]);

  // Update form when selected field changes
  useEffect(() => {
    if (selectedField) {
      setTitle(selectedField.title);
      setDescription(selectedField.description || "");
      resetWithoutAutoSave({
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
  }, [selectedField, resetWithoutAutoSave]);

  const handleTitleSave = async () => {
    if (!selectedField) return;
    
    const updatedFields = formFields.map((field) =>
      field.id === selectedField.id
        ? { ...field, title: title.trim() || "Untitled Field" }
        : field
    );
    
    await saveFormFields(updatedFields);
    fieldSettingsForm.setValue("title", title.trim() || "Untitled Field");
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (!selectedField) return;
    
    const updatedFields = formFields.map((field) =>
      field.id === selectedField.id
        ? { ...field, description: description.trim() }
        : field
    );
    
    await saveFormFields(updatedFields);
    fieldSettingsForm.setValue("description", description.trim());
    setIsEditingDescription(false);
  };

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
        <div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
          <Button
            size="iconSm"
            variant="outline"
            onClick={() => onScreenChange("form-settings")}
            className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-col">
              <div className="text-lg font-semibold leading-tight">
                Field Settings
              </div>
              <div className="text-sm leading-tight text-muted-foreground">
                Select a field to configure
              </div>
            </div>
          </div>
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
                  <SelectTrigger className="w-full h-8">
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
      <div className="flex flex-shrink-0 gap-3 items-center p-4 border-b bg-muted">
        <Button
          size="iconSm"
          variant="outline"
          onClick={() => onScreenChange("form-settings")}
          className="!px-2 !py-2 !h-auto rounded-lg border bg-brand/10 border-brand text-brand hover:bg-brand/5 hover:text-brand"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-col">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  } else if (e.key === "Escape") {
                    setTitle(selectedField.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="p-0 !h-auto text-lg font-semibold leading-tight bg-transparent border-none !ring-0 shadow-none focus-visible:ring-0 border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <div
                className="text-lg font-semibold leading-tight transition-colors cursor-pointer hover:text-brand"
                onClick={() => setIsEditingTitle(true)}
              >
                {title || "Untitled Field"}
              </div>
            )}
            {isEditingDescription ? (
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDescriptionSave();
                  } else if (e.key === "Escape") {
                    setDescription(selectedField.description || "");
                    setIsEditingDescription(false);
                  }
                }}
                placeholder="Add a description..."
                autoFocus
                className="p-0 !h-auto text-sm leading-tight bg-transparent border-none shadow-none text-muted-foreground focus-visible:ring-0 placeholder:text-muted-foreground border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <div
                className="text-sm leading-tight transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingDescription(true)}
              >
                {description || `Configure ${selectedField.inputType} field settings`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-4 min-h-0">
        <Form {...fieldSettingsForm}>
          <form className="space-y-4">
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

            <div className="pt-4 border-t">
              <Button
                onClick={handleDeleteField}
                size="sm"
                variant="destructive"
                type="button"
                className="w-full"
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
