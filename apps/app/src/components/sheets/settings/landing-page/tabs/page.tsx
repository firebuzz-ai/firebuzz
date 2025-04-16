"use client";

import { api, useMutation, useQuery } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { FileCode, Layers } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const pageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
});

export type PageFormValues = z.infer<typeof pageSchema>;

interface PageTabProps {
  landingPageId: Id<"landingPages">;
  setSaveHandler: React.Dispatch<
    React.SetStateAction<(() => Promise<void>) | null>
  >;
  setUnsavedChanges: (unsavedChanges: boolean) => void;
}

export const PageTab = ({
  landingPageId,
  setSaveHandler,
  setUnsavedChanges,
}: PageTabProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Get landing page data
  const landingPage = useQuery(api.collections.landingPages.queries.getById, {
    id: landingPageId,
  });

  // Get campaign data
  const campaign = landingPage?.campaignId
    ? useQuery(api.collections.campaigns.queries.getById, {
        id: landingPage.campaignId,
      })
    : null;

  // Get template data
  const template = landingPage?.templateId
    ? useQuery(api.collections.landingPages.templates.queries.getById, {
        id: landingPage.templateId,
      })
    : null;

  // Mutations
  const updateLandingPage = useMutation(
    api.collections.landingPages.mutations.update
  );

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      title: "",
      description: "",
    },
    mode: "onChange",
  });

  // Reset form when data is loaded from server
  useEffect(() => {
    if (landingPage) {
      form.reset({
        title: landingPage.title,
        description: landingPage.description || "",
      });
    }
  }, [landingPage, form]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!landingPageId || isLoading || form.formState.isDirty === false) {
      return;
    }

    try {
      setIsLoading(true);

      // Validate the form
      const valid = await form.trigger();
      if (!valid) {
        throw new Error("Form validation failed");
      }

      const values = form.getValues();

      // Update landing page
      await updateLandingPage({
        id: landingPageId,
        title: values.title,
        description: values.description,
      });

      toast.success("Page settings updated");
    } catch (error) {
      console.error("Failed to update page settings:", error);
      toast.error("Failed to update page settings");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [form, landingPageId, updateLandingPage, isLoading]);

  useEffect(() => {
    // Pass the function reference directly. React stores the function itself.
    setSaveHandler(() => handleSave);
  }, [handleSave, setSaveHandler]);

  useEffect(() => {
    setUnsavedChanges(form.formState.isDirty);
  }, [form.formState.isDirty, setUnsavedChanges]);

  if (!landingPage) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
        <span className="ml-2">Loading landing page data...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-medium">Page Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure the basic settings for your landing page
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Page Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter landing page title"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a description for your landing page (optional)"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Page Information</h3>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div>
                <Badge
                  variant={landingPage.isPublished ? "default" : "outline"}
                >
                  {landingPage.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Template</span>
              </Label>
              <div className="flex items-center gap-2 p-2 border rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  <FileCode className="size-4 text-muted-foreground" />
                </div>
                {template ? (
                  <div>
                    <div className="font-medium">{template.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="w-40 h-8" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Campaign</span>
              </Label>
              <div className="flex items-center gap-2 p-2 border rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  <Layers className="size-4 text-muted-foreground" />
                </div>
                {campaign ? (
                  <div>
                    <div className="font-medium">{campaign.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.type === "lead-generation"
                        ? "Lead Generation"
                        : "Click-Through"}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="w-40 h-8" />
                )}
              </div>
            </div>

            {landingPage.publishedAt && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Published
                </Label>
                <div className="text-sm">
                  {new Date(landingPage.publishedAt).toLocaleDateString()} at{" "}
                  {new Date(landingPage.publishedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};
